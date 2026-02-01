import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DisciplineScheduleManager from '@/components/mentor/DisciplineScheduleManager';
import { prisma } from '@/lib/prisma';

export default async function HorariosPage() {
  const session = await getServerSession(authOptions);
  
  // Validar autenticación
  if (!session) {
    redirect('/login');
  }
  
  // Validar que sea MENTOR, LIDER, COORDINADOR, ADMINISTRADOR o SCHOOL_ADMIN con esMentor
  const allowedRoles = ['MENTOR', 'LIDER', 'COORDINADOR', 'ADMINISTRADOR'];
  let hasAccess = allowedRoles.includes(session.user.rol);
  
  // Si es SCHOOL_ADMIN, verificar si también es mentor
  if (!hasAccess && session.user.rol === 'SCHOOL_ADMIN') {
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { esMentor: true }
    });
    hasAccess = user?.esMentor === true;
  }
  
  if (!hasAccess) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-3 lg:mb-4">
            🔥 Llamadas de Disciplina
          </h1>
          <p className="text-slate-300 text-sm lg:text-lg">
            Configura tu disponibilidad para el <strong className="text-orange-400">Club de las 5 AM</strong>.
            Solo puedes seleccionar horarios entre <span className="text-orange-400 font-bold">05:00 - 08:00</span>.
          </p>
          <div className="mt-3 p-3 lg:p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg text-xs lg:text-sm text-orange-200">
            💡 <strong>Nota:</strong> Estos horarios se bloquearán automáticamente en tu calendario de disponibilidad general para evitar conflictos con mentorías.
          </div>
        </div>

        {/* Componente de disciplina */}
        <DisciplineScheduleManager />
        
      </div>
    </div>
  );
}
