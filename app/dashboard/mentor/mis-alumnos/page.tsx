import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MentorStudentsTable from '@/components/mentor/MentorStudentsTable';
import { Users, Target, Shield } from 'lucide-react';

/**
 * 🎯 Página: Panel de Gestión de Alumnos del Mentor
 * Ruta: /dashboard/mentor/mis-alumnos
 * 
 * Vista principal del mentor para monitorear:
 * - Estado de accountability (vidas/strikes)
 * - Llamadas semanales completadas
 * - Evidencias pendientes
 * - Acciones rápidas (ver perfil, registrar falta)
 */
export default async function MisAlumnosPage() {
  const session = await getServerSession(authOptions);

  // Proteger ruta: solo mentores y coordinadores
  if (!session?.user || !['MENTOR', 'COORDINADOR'].includes(session.user.rol)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Mis Alumnos Asignados
              </h1>
              <p className="text-gray-600 mt-1">
                Panel de Control · Mentor: <span className="font-semibold text-purple-600">{session.user.email}</span>
              </p>
            </div>
          </div>

          {/* Banner de Sistema de Accountability */}
          <div className="mt-6 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-900 mb-1">
                  🔥 Sistema de Accountability Activo
                </h3>
                <p className="text-sm text-orange-800">
                  <strong>Regla de las 3 Oportunidades:</strong> Cada alumno tiene 3 oportunidades. 
                  Si pierde las 3 por faltas de asistencia, será <strong>eliminado del programa</strong>. 
                  Meta semanal: <strong>2 llamadas obligatorias</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Métricas Clave */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Meta Semanal</p>
                  <p className="text-2xl font-bold text-blue-600">2 llamadas</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">❤️</span>
                <div>
                  <p className="text-sm text-gray-600">Sistema de Vidas</p>
                  <p className="text-2xl font-bold text-green-600">3 máximo</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💀</span>
                <div>
                  <p className="text-sm text-gray-600">Strikes para Eliminar</p>
                  <p className="text-2xl font-bold text-red-600">3 faltas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Alumnos */}
        <MentorStudentsTable />

        {/* Instrucciones */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📖 Instrucciones de Uso</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <p>
                <strong>Ver Perfil:</strong> Click en "Ver Perfil" para revisar evidencias y cartas del alumno.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <p>
                <strong>Registrar Falta:</strong> Si un alumno no se presentó a la llamada, usa "Registrar Falta" para restar 1 vida.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <p>
                <strong>Estado En Riesgo:</strong> Si un alumno tiene 0 llamadas después del miércoles, aparecerá en amarillo.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <p>
                <strong>Eliminación Automática:</strong> Al llegar a 3 strikes, el alumno se desactiva automáticamente (isActive = false).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
