import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import type { User as DomainUser } from '@/types';

export default function Dashboard() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const adminUser: DomainUser = {
    id: user.id,
    name: profile?.full_name || user.email || 'Administrador',
    email: profile?.email || user.email || '',
    role: 'admin',
    shifts: [],
    createdAt: new Date(),
  };

  return <AdminDashboard user={adminUser} />;
}
