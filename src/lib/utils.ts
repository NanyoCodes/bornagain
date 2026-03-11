import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeToDate(value: any): Date | null {
  if (!value) {
    return null;
  }
  // Firestore Timestamp object
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  // Javascript Date object
  if (value instanceof Date) {
    return value;
  }
  // Firestore Timestamp-like object from serialization
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
   // ISO string date
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  // Milliseconds number
  if (typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
        return d;
    }
  }
  return null;
}
