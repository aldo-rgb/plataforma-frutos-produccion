'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  TrendingUp,
  Target,
  Ticket,
  Award,
  BarChart3,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  X,
  CreditCard,
  Clock,
  DollarSign,
  ShoppingCart,
  Building2,
  UserCheck,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completionRate: number;
    approvedLetters: number;
  };
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
  }[];
  topStudents: {
    id: number;
    nombre: string;
    email: string;
    puntosCultivo: number;
    racha: number;
    tier: string;
  }[];
  visionDistribution: {
    vision: string;
    count: number;
  }[];
  students: {
    id: number;
    nombre: string;
    email: string;
    tier: string;
    vision: string | null;
    puntosCultivo: number;
    racha: number;
    isActive: boolean;
    createdAt: string;
  }[];
  licenses: {
    code: string;
    batchName: string | null;
    tierAssigned: string;
    usedCount: number;
    maxUses: number;
    expiresAt: string | null;
    isActive: boolean;
  }[];
}

export default function SchoolAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      checkPaymentStatus();
    }
  }, [status, session]);

  const checkPaymentStatus = () => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const quantity = searchParams.get('quantity');
    const tier = searchParams.get('tier');

    if (success === 'true') {
      setNotification({
        type: 'success',
        message: `✅ ¡Pago exitoso! Se han agregado ${quantity} licencias ${tier} a tu organización.`,
      });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_order: 'Error: Orden no encontrada',
        order_not_found: 'Error: La orden de pago no existe',
        payment_failed: 'Error: El pago fue rechazado',
        processing_failed: 'Error: No se pudo procesar el pago',
      };
      setNotification({
        type: 'error',
        message: errorMessages[error] || 'Error desconocido',
      });
    }

    // Limpiar query params después de 5 segundos
    if (success || error) {
      setTimeout(() => {
        router.replace('/dashboard/school-admin');
        setNotification(null);
      }, 5000);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
        setOrganization(result.organization);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLicense = async () => {
    if (!selectedStudent) return;

    try {
      const res = await fetch('/api/school-admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVOKE_LICENSE',
          studentId: selectedStudent
        })
      });

      const result = await res.json();
      
      if (result.success) {
        setRevokeModalOpen(false);
        setSelectedStudent(null);
        fetchDashboardData();
        alert('Licencia revocada correctamente');
      } else {
        alert(result.error || 'Error al revocar licencia');
      }
    } catch (error) {
      console.error('Error revoking license:', error);
      alert('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!data || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={64} />
          <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
          <p className="text-slate-400">
            Por favor contacte al administrador del sistema
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: `linear-gradient(to bottom right, ${organization.brandColor}15, #0f172a)`
      }}
    >
      {/* Notificación de Pago */}
      {notification && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              notification.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle size={24} />
              ) : (
                <XCircle size={24} />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-20 h-20 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg"
                style={{ backgroundColor: organization.brandColor }}
              >
                {organization.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {organization.name}
              </h1>
              <p className="text-slate-400">Portal del Director</p>
              <p className="text-sm text-slate-500 mt-1">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/school-admin/licenses/request')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white rounded-xl transition-all font-semibold shadow-lg"
            >
              <Plus size={20} />
              <span>Solicitar Licencias</span>
            </button>

            <button
              onClick={() => {
                // TODO: Implementar generación de PDF
                alert('Función de descarga de reporte en desarrollo');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Download size={20} />
              <span>Descargar Reporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users
              className="text-blue-400"
              size={32}
              style={{ color: organization.brandColor }}
            />
            <span className="text-4xl font-bold text-white">
              {data.overview.totalStudents}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Alumnos Totales</p>
          <p className="text-green-400 text-xs mt-1">
            {data.overview.activeStudents} activos
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="text-purple-400" size={32} />
            <span className="text-4xl font-bold text-white">
              {data.overview.completionRate}%
            </span>
          </div>
          <p className="text-slate-400 text-sm">Tasa de Cumplimiento</p>
          <p className="text-slate-500 text-xs mt-1">Cartas y evidencias</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="text-green-400" size={32} />
            <span className="text-4xl font-bold text-white">
              {data.overview.approvedLetters}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Cartas Aprobadas</p>
          <p className="text-slate-500 text-xs mt-1">Total del mes</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Ticket className="text-yellow-400" size={32} />
            <span className="text-4xl font-bold text-white">
              {data.licenses.reduce((acc, lic) => acc + (lic.maxUses - lic.usedCount), 0)}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Licencias Disponibles</p>
          <p className="text-slate-500 text-xs mt-1">
            {data.licenses.length} lotes activos
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={24} />
            Distribución por Tier
          </h3>
          <div className="space-y-4">
            {data.tierDistribution.map((tier) => (
              <div key={tier.tier}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{tier.tier}</span>
                  <span className="text-slate-400">
                    {tier.count} ({tier.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${tier.percentage}%`,
                      backgroundColor:
                        tier.tier === 'PREMIUM'
                          ? '#eab308'
                          : tier.tier === 'STANDARD'
                          ? '#3b82f6'
                          : '#64748b'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award size={24} />
            Top 5 Alumnos
          </h3>
          <div className="space-y-3">
            {data.topStudents.map((student, idx) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{
                      backgroundColor:
                        idx === 0
                          ? '#eab308'
                          : idx === 1
                          ? '#94a3b8'
                          : idx === 2
                          ? '#cd7f32'
                          : organization.brandColor
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{student.nombre}</p>
                    <p className="text-slate-400 text-xs">{student.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-bold">{student.puntosCultivo} PC</p>
                  <p className="text-slate-500 text-xs">🔥 {student.racha} días</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vision Distribution */}
      {data.visionDistribution.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Distribución por Grupo/Visión</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.visionDistribution.map((v) => (
                <div key={v.vision} className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{v.count}</p>
                  <p className="text-slate-400 text-sm mt-1">{v.vision}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-2xl font-bold text-white">Alumnos Registrados</h3>
            <p className="text-slate-400 mt-1">Gestiona las licencias de tus estudiantes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Alumno
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Tier
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Visión/Grupo
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    PC
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Racha
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data.students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-semibold">{student.nombre}</p>
                        <p className="text-slate-400 text-sm">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          student.tier === 'PREMIUM'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : student.tier === 'STANDARD'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {student.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-slate-300">
                        {student.vision || 'Sin asignar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-purple-400 font-bold">
                        {student.puntosCultivo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-orange-400 font-semibold">
                        🔥 {student.racha}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle size={16} />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
                          <XCircle size={16} />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {student.tier !== 'FREE' && (
                        <button
                          onClick={() => {
                            setSelectedStudent(student.id);
                            setRevokeModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-semibold"
                        >
                          Revocar Licencia
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Revoke Modal */}
      {revokeModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-600/20 rounded-xl">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  ¿Revocar Licencia?
                </h3>
                <p className="text-slate-400 text-sm">
                  El alumno perderá acceso a funciones premium y su tier cambiará a FREE.
                  La licencia se liberará para otro uso.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setRevokeModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeLicense}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Revocar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
