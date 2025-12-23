import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DisciplineScheduleManager from '@/components/mentor/DisciplineScheduleManager';

export default async function HorariosPage() {
  const session = await getServerSession(authOptions);
  
  // Validar autenticación
  if (!session) {
    redirect('/login');
  }
  
  // Validar que sea MENTOR o COORDINADOR
  if (!['MENTOR', 'COORDINADOR', 'ADMINISTRADOR'].includes(session.user.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-4">
            🔥 Llamadas de Disciplina
          </h1>
          <p className="text-slate-300 text-lg">
            Configura tu disponibilidad para el <strong className="text-orange-400">Club de las 5 AM</strong>.
            Solo puedes seleccionar horarios entre <span className="text-orange-400 font-bold">05:00 - 08:00</span>.
          </p>
          <div className="mt-3 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg text-sm text-orange-200">
            💡 <strong>Nota:</strong> Estos horarios se bloquearán automáticamente en tu calendario de disponibilidad general para evitar conflictos con mentorías pagadas.
          </div>
        </div>

        {/* Componente de disciplina */}
        <DisciplineScheduleManager />
        
      </div>
    </div>
  );
}
