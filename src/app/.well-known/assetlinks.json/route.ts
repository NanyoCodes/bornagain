import { NextResponse } from 'next/server';

export async function GET() {
  // Returns an empty array as a default for Android Asset Links.
  // This prevents 404 errors during technical device verification.
  return NextResponse.json([]);
}
