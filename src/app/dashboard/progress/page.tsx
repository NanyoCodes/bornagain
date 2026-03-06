
import { redirect } from 'next/navigation';

export default function ProgressRedirectPage() {
  redirect('/dashboard');
  // This return is technically unreachable but required by the function signature.
  return null;
}
