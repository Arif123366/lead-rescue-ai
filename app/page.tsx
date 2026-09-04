import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth';

export default async function HomePage() {
  const session = await getCurrentUser();
  if (!session) {
    redirect('/login');
  } else {
    redirect('/dashboard');
  }
}
