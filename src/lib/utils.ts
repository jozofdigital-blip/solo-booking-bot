import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Time conversion helpers
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Check if a time slot overlaps with an existing appointment
export function hasAppointmentOverlap(
  slotDate: string,
  slotTime: string,
  serviceDuration: number,
  appointments: Array<{
    appointment_date: string;
    appointment_time: string;
    duration_minutes?: number;
    status?: string;
  }>,
  excludeAppointmentId?: string
): boolean {
  const slotStart = timeToMinutes(slotTime);
  const slotEnd = slotStart + serviceDuration;

  return appointments.some((apt: any) => {
    if (apt.id === excludeAppointmentId) return false;
    // Ignore cancelled appointments
    if (apt.status === 'cancelled') return false;
    if (apt.appointment_date !== slotDate) return false;

    const aptTime = apt.appointment_time.substring(0, 5);
    const aptStart = timeToMinutes(aptTime);
    const aptDuration = apt.duration_minutes || 60;
    const aptEnd = aptStart + aptDuration;

    // Check if intervals overlap: slotStart < aptEnd AND aptStart < slotEnd
    return slotStart < aptEnd && aptStart < slotEnd;
  });
}

// Check if there's enough continuous time for a service
export function hasEnoughContinuousTime(
  slotDate: string,
  slotTime: string,
  serviceDuration: number,
  appointments: Array<{
    appointment_date: string;
    appointment_time: string;
    duration_minutes?: number;
    status?: string;
  }>,
  workingEndTime?: string
): boolean {
  const slotStart = timeToMinutes(slotTime);
  const slotEnd = slotStart + serviceDuration;

  // Check if slot extends beyond working hours
  if (workingEndTime) {
    const workingEnd = timeToMinutes(workingEndTime);
    if (slotEnd > workingEnd) return false;
  }

  // Check if any appointment overlaps with this time slot
  return !hasAppointmentOverlap(slotDate, slotTime, serviceDuration, appointments);
}
