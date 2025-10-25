-- Update the overlap validation trigger to skip cancelled appointments
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
  -- Skip validation if the appointment is being cancelled
  if NEW.status = 'cancelled' then
    return NEW;
  end if;

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
  -- Exclude the current appointment if this is an UPDATE (not INSERT)
  if exists (
    select 1
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.profile_id = NEW.profile_id
      and a.appointment_date = NEW.appointment_date
      and a.status <> 'cancelled'
      and a.id <> NEW.id  -- Exclude current appointment on UPDATE
      and NEW.appointment_time < (a.appointment_time + make_interval(mins => s.duration_minutes))
      and a.appointment_time < new_end
  ) then
    raise exception 'OVERLAP_TIME_SLOT';
  end if;

  return NEW;
end;
$$;