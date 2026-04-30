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

export function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  return d;
}
