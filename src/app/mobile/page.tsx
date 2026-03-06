import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import MobileMessenger from '@/components/mobile/MobileMessenger';

export default async function MobilePage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/mobile/login');
  }

  return <MobileMessenger />;
}
