import { Metadata } from 'next';
import AdminStrikesPanel from '@/components/dashboard/admin/AdminStrikesPanel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Gestión de Strikes | Panel Admin',
  description: 'Panel de administración de strikes y vidas extra'
};

export default async function StrikeManagementPage() {
  const session = await getServerSession(authOptions);

  // Verificar autenticación y permisos
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Solo permitir acceso a admins, directores y coordinadores
  const allowedRoles = ['ADMINISTRADOR', 'SCHOOL_ADMIN', 'COORDINADOR'];
  if (!allowedRoles.includes(session.user.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white">
            🛡️ Gestión de <span className="text-purple-500">Strikes y Vidas Extra</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Panel administrativo para gestionar faltas y otorgar vidas extra a participantes
          </p>
        </div>

        {/* Panel de Strikes */}
        <AdminStrikesPanel />
      </div>
    </div>
  );
}
