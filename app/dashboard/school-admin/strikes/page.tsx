import { Metadata } from 'next';
import AdminStrikesPanel from '@/components/dashboard/admin/AdminStrikesPanel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gestión de Strikes | Director',
  description: 'Panel de gestión de strikes y vidas extra'
};

export default async function StrikeManagementPage() {
  const session = await getServerSession(authOptions);

  // Verificar autenticación y permisos
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Solo permitir acceso a directores
  if (session.user.rol !== 'SCHOOL_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navegación */}
        <Link 
          href="/dashboard/school-admin"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Volver al Dashboard</span>
        </Link>

        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white">
            🛡️ Gestión de <span className="text-purple-500">Strikes y Vidas Extra</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Panel de director para gestionar faltas y otorgar vidas extra a estudiantes
          </p>
        </div>

        {/* Panel de Strikes */}
        <AdminStrikesPanel />
      </div>
    </div>
  );
}
