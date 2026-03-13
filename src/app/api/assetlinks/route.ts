
import { NextResponse } from 'next/server';

export async function GET() {
  // Return an empty array as a default for asset links.
  // This indicates no app associations and resolves the 404 error.
  return NextResponse.json([]);
}
