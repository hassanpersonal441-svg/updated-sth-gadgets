import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
