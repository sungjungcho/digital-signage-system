import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  // 인증 확인
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/admin/login');
  }

  return <AdminDashboard />;
}
