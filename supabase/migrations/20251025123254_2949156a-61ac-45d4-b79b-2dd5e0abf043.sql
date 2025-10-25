-- Ensure no overlapping appointments for a profile on a given day
create or replace function public.validate_appointment_no_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_duration int;
  new_end time;
begin
  -- Get duration of the new appointment's service
  select s.duration_minutes into new_duration
  from public.services s
  where s.id = NEW.service_id;

  if new_duration is null then
    raise exception 'Service duration is not defined';
  end if;

  -- Calculate end time of the new appointment
  new_end := NEW.appointment_time + make_interval(mins => new_duration);

  -- Check overlap with existing non-cancelled appointments of the same profile and date
  if exists (
    select 1
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.profile_id = NEW.profile_id
      and a.appointment_date = NEW.appointment_date
      and a.status <> 'cancelled'
      and NEW.appointment_time < (a.appointment_time + make_interval(mins => s.duration_minutes))
      and a.appointment_time < new_end
  ) then
    raise exception 'OVERLAP_TIME_SLOT';
  end if;

  return NEW;
end;
$$;

-- Recreate trigger to apply both on INSERT and UPDATE
drop trigger if exists validate_appointment_no_overlap_trigger on public.appointments;
create trigger validate_appointment_no_overlap_trigger
before insert or update on public.appointments
for each row execute function public.validate_appointment_no_overlap();

-- Also prevent exact duplicates at the same start time (except cancelled)
create unique index if not exists uniq_appointments_start
on public.appointments(profile_id, appointment_date, appointment_time)
where status <> 'cancelled';