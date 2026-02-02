'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, TrendingUp, Target, Ticket, Award, BarChart3, Download,
  AlertTriangle, CheckCircle, XCircle, Plus, X, CreditCard, Clock,
  DollarSign, ShoppingCart, Building2, UserCheck, Activity, Zap,
  Shield, BookOpen, GraduationCap, Star, Phone, Heart
} from 'lucide-react';
import Link from 'next/link';
import TreasuryQuickWidget from '@/components/dashboard/TreasuryQuickWidget';
import DirectorTrainingWidgets from '@/components/dashboard/DirectorTrainingWidgets';
import DirectorPendingAuditBanner from '@/components/dashboard/DirectorPendingAuditBanner';

interface DashboardData {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completionRate: number;
    approvedLetters: number;
    totalCommunityMembers?: number; // NUEVO
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
  students: {
    id: number;
    nombre: string;
    email: string;
    tier: string;
    puntosCultivo: number;
    racha: number;
    isActive: boolean;
  }[];
  pendingOrders: {
    id: string;
    quantity: number;
    tier: string;
    amount: number;
    createdAt: string;
    status: string;
  }[];
  availableCredits: number;
  callsAvailable?: number; // 💰 Llamadas disponibles (SchoolCredit)
  totalPurchased?: number; // 📞 Total de llamadas compradas
  totalAllocated?: number; // 🔒 Llamadas bloqueadas
  pendingPayment: boolean;
  pendingLeaderApprovals?: number; // NUEVO - Líderes pendientes de aprobación
  mentorCosts?: {
    costoTotalMentores: number;
    totalLlamadasDisciplina: number;
    totalMentoresActivos: number;
    visionesActivas: number;
  };
}

export default function SchoolAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [consejoQuantum, setConsejoQuantum] = useState<any>(null);
  const [loadingConsejo, setLoadingConsejo] = useState(true);
  const [visiones, setVisiones] = useState<any[]>([]);
  const [loadingVisiones, setLoadingVisiones] = useState(true);
  const [notificacionesLideres, setNotificacionesLideres] = useState(0);
  const [medicalAlertsCount, setMedicalAlertsCount] = useState(0);
  const [misionesModalOpen, setMisionesModalOpen] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      checkPaymentStatus();
      fetchConsejoQuantum();
      fetchVisiones();
      fetchMedicalAlerts();
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
        message: `✅ ¡Pago exitoso! Se han activado ${quantity} licencias ${tier}.`,
      });
      // Limpiar query params después de 5 segundos
      setTimeout(() => {
        router.replace('/dashboard/school-admin');
        setNotification(null);
      }, 5000);
    } else if (error) {
      setNotification({
        type: 'error',
        message: `❌ Error en el pago: ${error}`,
      });
      setTimeout(() => {
        router.replace('/dashboard/school-admin');
        setNotification(null);
      }, 5000);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Cargar dashboard y notificaciones en paralelo
      const [resDashboard, resNotificaciones] = await Promise.all([
        fetch('/api/school-admin/dashboard'),
        fetch('/api/school-admin/notificaciones/lideres')
      ]);

      const result = await resDashboard.json();
      const notificaciones = await resNotificaciones.json();

      console.log('Dashboard API response:', result);
      console.log('📊 Notificaciones de líderes:', notificaciones);

      // Establecer el contador de notificaciones
      const pendingLeaderApprovals = notificaciones.notificaciones ? (notificaciones.total || 0) : 0;
      setNotificacionesLideres(pendingLeaderApprovals);

      if (resDashboard.ok) {
        // Transformar los datos del API al formato esperado por el componente
        const transformedData: DashboardData = {
          overview: {
            totalStudents: result.stats.totalStudents,
            activeStudents: result.users.filter((u: any) => u.isActive && u.rol === 'PARTICIPANTE').length,
            completionRate: 0, // TODO: calcular desde cartas
            approvedLetters: 0, // TODO: calcular desde cartas
            totalCommunityMembers: result.stats.totalCommunityMembers || 0, // NUEVO
          },
          tierDistribution: Object.entries(result.tierDistribution).map(([tier, count]) => ({
            tier,
            count: count as number,
            percentage: ((count as number) / result.stats.totalUsers) * 100,
          })),
          topStudents: result.topStudents.map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            email: '',
            puntosCultivo: s.experienciaXP,
            racha: 0,
            tier: s.tier,
          })),
          students: result.users
            .filter((u: any) => u.rol === 'PARTICIPANTE' || u.rol === 'GAMECHANGER')
            .map((u: any) => ({
              id: u.id,
              nombre: u.nombre,
              email: u.email,
              tier: u.tier || 'BASIC',
              puntosCultivo: u.experienciaXP || 0,
              racha: 0,
              isActive: u.isActive,
            })),
          pendingOrders: result.pendingOrders,
          availableCredits: result.stats.availableCredits,
          callsAvailable: result.stats.callsAvailable || 0,
          totalPurchased: result.stats.totalPurchased || 0,
          totalAllocated: result.stats.totalAllocated || 0,
          pendingPayment: result.pendingPayment,
          pendingLeaderApprovals: pendingLeaderApprovals,
          mentorCosts: result.mentorCosts,
        };
        
        setData(transformedData);
        setOrganization(result.organization);
      } else {
        console.error('API error:', result);
        setNotification({
          type: 'error',
          message: result.error || 'Error al cargar datos del dashboard'
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setNotification({
        type: 'error',
        message: 'Error de conexión al cargar el dashboard'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConsejoQuantum = async () => {
    try {
      const res = await fetch('/api/quantum/consejo-vision');
      const result = await res.json();
      if (res.ok && result.success) {
        setConsejoQuantum(result.consejo);
      }
    } catch (error) {
      console.error('Error fetching consejo quantum:', error);
    } finally {
      setLoadingConsejo(false);
    }
  };

  const fetchVisiones = async () => {
    try {
      const res = await fetch('/api/director/visiones');
      const result = await res.json();
      if (res.ok && result.success) {
        setVisiones(result.visiones || []);
      }
    } catch (error) {
      console.error('Error fetching visiones:', error);
    } finally {
      setLoadingVisiones(false);
    }
  };

  const fetchMedicalAlerts = async () => {
    try {
      const res = await fetch('/api/coordinator/medical-alerts?onlyAlerts=true');
      const result = await res.json();
      if (res.ok && result.success) {
        setMedicalAlertsCount(result.unreviewedAlertsCount || 0);
      }
    } catch (error) {
      console.error('Error fetching medical alerts:', error);
    }
  };

  const generateOrganizationQR = async () => {
    setGeneratingQR(true);
    try {
      // URL de registro con código de organización
      const registrationURL = `${window.location.origin}/auth/signup?org=${organization?.codigoOrganizacion || organization?.id}`;
      
      // Importar QRCode dinámicamente
      const QRCodeModule = await import('qrcode');
      const QRCode = QRCodeModule.default || QRCodeModule;
      
      // Generar el QR como data URL
      const qrDataUrl = await QRCode.toDataURL(registrationURL, {
        width: 512,
        margin: 2,
        color: {
          dark: organization?.brandColor || '#1e293b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      setQrDataURL(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR:', error);
      setNotification({
        type: 'error',
        message: 'Error al generar el código QR'
      });
    } finally {
      setGeneratingQR(false);
    }
  };

  const downloadOrganizationQR = () => {
    if (!qrDataURL) return;
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `${organization?.name || 'organizacion'}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setNotification({
      type: 'success',
      message: 'QR descargado exitosamente'
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      const res = await fetch('/api/school-admin/licenses/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const result = await res.json();

      if (res.ok) {
        setNotification({
          type: 'success',
          message: '✅ Orden cancelada exitosamente',
        });
        // Recargar datos del dashboard
        fetchDashboardData();
      } else {
        setNotification({
          type: 'error',
          message: `❌ ${result.error || 'Error al cancelar la orden'}`,
        });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setNotification({
        type: 'error',
        message: '❌ Error al cancelar la orden',
      });
    } finally {
      setCancellingOrderId(null);
      setShowCancelModal(null);
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
          <p className="text-slate-400">Por favor contacte al administrador del sistema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 md:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 w-full">
        {/* Notificación de Pago */}
        {notification && (
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
        )}

        {/* Banner de Auditoría Pendiente */}
        <DirectorPendingAuditBanner />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-6 border-b border-white/10 pb-3 md:pb-6 w-full">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            {organization?.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-12 h-12 md:w-20 md:h-20 rounded-lg md:rounded-xl object-cover shadow-lg ring-2 ring-purple-500/30"
              />
            ) : (
              <div
                className="w-12 h-12 md:w-20 md:h-20 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-xl md:text-3xl shadow-lg bg-purple-600"
                style={{ backgroundColor: organization?.brandColor || '#8B5CF6' }}
              >
                {organization?.name?.charAt(0) || 'C'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-4xl font-black text-white tracking-tight flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3">
                <span className="line-clamp-1 break-words">{organization?.name || 'Centro Educativo'}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 text-sm md:text-2xl flex-shrink-0">
                  Centro
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">DIRECTOR • Panel de Control</p>
              <p className="text-[10px] md:text-sm text-slate-500 hidden md:block">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* 🚨 ALERTA CRÍTICA - LICENCIAS EN NEGATIVO */}
        {organization?.licensesAvailable < 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-red-900/80 via-red-800/60 to-orange-900/50 border-4 border-red-500 rounded-2xl p-6 shadow-2xl w-full animate-pulse">
            {/* Efecto de brillo pulsante */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 rounded-full blur-3xl -mt-32 -mr-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl -mb-24 -ml-24"></div>
            
            <div className="relative z-10">
              {/* Header con icono animado */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></div>
                    <div className="relative p-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50">
                      <AlertTriangle className="text-white" size={32} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                      ⚠️ LICENCIAS INSUFICIENTES
                    </h2>
                    <p className="text-red-200 text-sm md:text-base mt-1">
                      Tu organización tiene <span className="font-black text-red-400 text-lg">{Math.abs(organization.licensesAvailable)}</span> licencias en deuda
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-4 py-2 bg-red-500/30 text-red-100 rounded-full text-sm font-black border-2 border-red-400 animate-bounce">
                    🔴 CRÍTICO
                  </span>
                  <div className="flex items-center gap-2 text-yellow-300 text-sm font-bold">
                    <Clock size={16} />
                    48 HORAS PARA REGULARIZAR
                  </div>
                </div>
              </div>

              {/* Información detallada */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/60 backdrop-blur rounded-xl p-4 border border-red-500/30">
                  <div className="text-sm text-slate-400 mb-1">Licencias Totales</div>
                  <div className="text-2xl font-black text-white">{organization.totalLicenses}</div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur rounded-xl p-4 border border-red-500/30">
                  <div className="text-sm text-slate-400 mb-1">En Uso</div>
                  <div className="text-2xl font-black text-orange-400">{organization.activeLicenses}</div>
                </div>
                <div className="bg-red-900/60 backdrop-blur rounded-xl p-4 border-2 border-red-500">
                  <div className="text-sm text-red-300 mb-1">Balance</div>
                  <div className="text-3xl font-black text-red-400">{organization.licensesAvailable}</div>
                </div>
              </div>

              {/* Mensaje de advertencia */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Clock className="text-yellow-400" size={20} />
                  </div>
                  <div>
                    <h4 className="text-yellow-300 font-bold">Tienes 48 horas para completar el pago</h4>
                    <p className="text-yellow-200/80 text-sm mt-1">
                      Se han registrado participantes sin licencia disponible. Para evitar la desactivación de cuentas, 
                      adquiere las licencias faltantes antes del plazo límite.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de acción */}
              <Link href="/dashboard/school-admin/licenses/request" className="block">
                <button className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-black rounded-xl transition-all shadow-2xl shadow-red-500/30 flex items-center justify-center gap-3 text-lg">
                  <ShoppingCart size={24} />
                  COMPRAR LICENCIAS AHORA
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-sm">
                    {Math.abs(organization.licensesAvailable)} necesarias
                  </span>
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Banner de Alerta - Órdenes Pendientes */}
        {data.pendingOrders && data.pendingOrders.length > 0 && (() => {
          const hasProcessing = data.pendingOrders.some((o: any) => o.status === 'PROCESSING');
          const bgColor = hasProcessing ? 'from-blue-500/20 via-cyan-500/20 to-blue-500/20 border-blue-500/50' : 'from-red-500/20 via-orange-500/20 to-red-500/20 border-red-500/50';
          const iconBg = hasProcessing ? 'bg-blue-500' : 'bg-red-500';
          const iconPing = hasProcessing ? 'bg-blue-400' : 'bg-red-400';
          const textColor = hasProcessing ? 'text-blue-200' : 'text-red-200';
          const btnColor = hasProcessing ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/50' : 'bg-red-500 hover:bg-red-600 shadow-red-500/50';
          
          return (
            <div className={`bg-gradient-to-r ${bgColor} border-2 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-2xl animate-pulse backdrop-blur-sm w-full`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                  <div className="relative flex-shrink-0">
                    <div className={`absolute inset-0 ${iconPing} rounded-full animate-ping opacity-75`}></div>
                    <div className={`relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 ${iconBg} rounded-full`}>
                      <AlertTriangle className="text-white" size={20} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-lg font-bold text-white flex items-center gap-2">
                      <span className="animate-pulse">{hasProcessing ? '📋' : '⚠️'}</span>
                      <span className="line-clamp-2">
                      {(() => {
                        const processingOrders = data.pendingOrders.filter((o: any) => o.status === 'PROCESSING');
                        const pendingOrders = data.pendingOrders.filter((o: any) => o.status === 'PENDING');
                        
                        if (processingOrders.length > 0 && pendingOrders.length > 0) {
                          return `Tienes ${processingOrders.length} orden(es) pendiente(s) de aprobación y ${pendingOrders.length} sin pagar`;
                        } else if (processingOrders.length > 0) {
                          return `Tienes ${processingOrders.length} orden(es) pendiente(s) de aprobación`;
                        } else {
                          return `Tienes ${pendingOrders.length} orden(es) pendiente(s) de pago`;
                        }
                      })()}
                      </span>
                    </h3>
                    <p className={`text-xs md:text-sm ${textColor} mt-1 line-clamp-2`}>
                      {hasProcessing
                        ? 'El comprobante de pago está en revisión. Se activarán las licencias pronto.'
                        : 'Completa el proceso de pago para activar tus licencias'
                      }
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/school-admin/licenses/payment" className="w-full md:w-auto">
                  <button className={`px-4 md:px-6 py-2 md:py-3 ${btnColor} text-white font-bold rounded-lg md:rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm md:text-base w-full md:w-auto`}>
                    <ShoppingCart size={16} className="md:w-5 md:h-5" />
                    <span>Ver Órdenes</span>
                  </button>
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Banner de Alerta - Perfiles de Líderes Pendientes de Aprobación */}
        {data.pendingLeaderApprovals && data.pendingLeaderApprovals > 0 && (
          <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 border-2 border-purple-500/50 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-2xl animate-pulse backdrop-blur-sm w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
              <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-75"></div>
                  <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full">
                    <Shield className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-lg font-bold text-white flex items-center gap-2">
                    <span className="animate-pulse">🔍</span>
                    <span className="line-clamp-2">
                    {data.pendingLeaderApprovals} Perfil{data.pendingLeaderApprovals !== 1 ? 'es' : ''} de Líder{data.pendingLeaderApprovals !== 1 ? 'es' : ''} Pendiente{data.pendingLeaderApprovals !== 1 ? 's' : ''} de Aprobación
                    </span>
                  </h3>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 line-clamp-2">
                    Los líderes han enviado sus perfiles para revisión. Aprueba o rechaza cada perfil.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/school-admin/lideres" className="w-full md:w-auto">
                <button className="px-4 md:px-6 py-2 md:py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg md:rounded-xl transition-all shadow-lg shadow-purple-500/50 flex items-center justify-center gap-2 text-sm md:text-base w-full md:w-auto">
                  <CheckCircle size={16} className="md:w-5 md:h-5" />
                  <span>Revisar Perfiles</span>
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Widget de Pago Pendiente - COMPACTO - Solo para órdenes PENDING */}
        {data.pendingPayment && data.pendingOrders && data.pendingOrders.filter((o: any) => o.status === 'PENDING').length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-slate-900 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl w-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -mt-24 -mr-24"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <CreditCard className="text-purple-300" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Zap className="text-yellow-400" size={20} />
                      Licencias Pendientes de Pago
                    </h2>
                    <p className="text-purple-200 text-sm mt-0.5">
                      Completa el pago para activar tus licencias
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-bold border border-yellow-500/30">
                  ⚠️ ACCIÓN REQUERIDA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {data.pendingOrders.filter((o: any) => o.status === 'PENDING').map((order: any) => (
                  <div
                    key={order.id}
                    className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-xl p-3 relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Orden #{order.id.slice(0, 8)}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs font-bold">
                          PENDIENTE
                        </span>
                        <button
                          onClick={() => setShowCancelModal(order.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                          title="Cancelar orden"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-xs">Licencias:</span>
                        <span className="text-white font-bold text-sm">{order.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-xs">Tipo:</span>
                        <span className="text-purple-300 font-semibold text-sm">{order.tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-xs">Precio unitario:</span>
                        <span className="text-green-300 font-semibold text-sm">
                          ${(order.amount / order.quantity).toLocaleString()} MXN
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-700 pt-1.5">
                        <span className="text-slate-400 text-xs">Total:</span>
                        <span className="text-xl font-bold text-white">
                          ${order.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Modal de confirmación de cancelación */}
                    {showCancelModal === order.id && (
                      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur rounded-xl flex flex-col items-center justify-center p-4 z-10">
                        <XCircle className="text-red-400 mb-2" size={32} />
                        <p className="text-white text-sm text-center mb-3 font-medium">
                          ¿Cancelar esta orden?
                        </p>
                        <p className="text-slate-400 text-xs text-center mb-4">
                          {order.quantity} licencias - ${order.amount.toLocaleString()} MXN
                        </p>
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => setShowCancelModal(null)}
                            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-all"
                          >
                            No, mantener
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingOrderId === order.id}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-t border-white"></div>
                                Cancelando...
                              </>
                            ) : (
                              <>
                                <XCircle size={14} />
                                Sí, cancelar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Link
                href="/dashboard/school-admin/licenses/payment"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
              >
                <ShoppingCart size={18} />
                <span>Proceder al Pago</span>
              </Link>

              <p className="text-xs text-purple-200/60 mt-3 flex items-center gap-2">
                <Shield size={12} />
                Las licencias se activarán automáticamente después de confirmar el pago
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full">
          <KpiCard
            icon={<Users className="text-cyan-400" />}
            label="Usuarios Totales"
            value={data.overview.totalStudents.toString()}
            trend="✅ Activos"
            color="cyan"
          />
          <KpiCard
            icon={<Building2 className="text-blue-400" />}
            label="Comunidad"
            value={(data.overview.totalCommunityMembers || 0).toString()}
            trend="Todos los usuarios que pertenecen la comunidad"
            color="blue"
          />
          <KpiCard
            icon={<Ticket className="text-yellow-400" />}
            label="Licencias Disponibles"
            value={data.availableCredits.toString()}
            trend={(() => {
              if (data.pendingOrders.length > 0) {
                const totalLicensesPending = data.pendingOrders.reduce((sum: number, order: any) => sum + order.quantity, 0);
                return `${totalLicensesPending} licencias por activar`;
              }
              return '✅ Activos';
            })()}
            color={data.pendingOrders.length > 0 ? 'blue' : 'yellow'}
          />
          <KpiCard
            icon={<Phone className="text-cyan-400" />}
            label="Llamadas Disponibles"
            value={(data.callsAvailable || 0).toString()}
            trend={`${data.totalAllocated || 0} bloqueadas / ${data.totalPurchased || 0} totales`}
            color="cyan"
          />
        </div>

        {/* WIDGETS DE DECLARADOS E INSCRITOS */}
        <DirectorTrainingWidgets />

        {/* Widget Prospectos de Staff */}
        <Link href="/dashboard/prospectos-staff" className="block mt-6">
          <div className="bg-gradient-to-br from-cyan-900/30 via-emerald-900/20 to-slate-900/80 border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🌟</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                    PROSPECTOS DE STAFF
                  </p>
                  <p className="text-lg font-bold text-white">
                    Ver participantes interesados en ser Staff
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Personas que activaron &quot;Quiero ser Staff&quot; en su perfil
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-3 transition-all">
                <span>Ver lista</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* WIDGET DE VISIONES ACTIVAS */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 mt-8 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
              <Target className="text-purple-400" /> Visiones Activas
            </h2>
            <span className="text-xs font-bold text-slate-500 uppercase">
              {visiones.length} {visiones.length === 1 ? 'Visión' : 'Visiones'}
            </span>
          </div>

          {loadingVisiones ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : visiones.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Target className="mx-auto mb-2 opacity-30" size={48} />
              <p className="text-sm">No hay visiones activas en este momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiones.map((vision: any) => {
                const participantesCount = vision._count?.VisionParticipante || 0;
                const mentoresCount = vision._count?.VisionMentor || 0;
                const gameChangersCount = vision._count?.VisionGameChanger || 0;
                const licensesUsage = vision.maxParticipantes 
                  ? Math.round((participantesCount / vision.maxParticipantes) * 100) 
                  : 0;

                return (
                  <div 
                    key={vision.id} 
                    className="bg-slate-950 border border-white/5 rounded-xl p-5 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{vision.nombre}</h3>
                        {vision.descripcion && (
                          <p className="text-xs text-slate-500 line-clamp-2">{vision.descripcion}</p>
                        )}
                      </div>
                      {vision.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase border border-green-500/20">
                          <Zap size={10} /> Activa
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Participantes</span>
                        <span className="font-bold text-white">
                          {participantesCount}
                          {vision.maxParticipantes && (
                            <span className="text-slate-500 font-normal"> / {vision.maxParticipantes}</span>
                          )}
                        </span>
                      </div>

                      {vision.maxParticipantes && (
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              licensesUsage >= 90 ? 'bg-red-500' : 
                              licensesUsage >= 70 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(licensesUsage, 100)}%` }}
                          ></div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Mentores</p>
                          <p className="text-lg font-bold text-cyan-400">{mentoresCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Game Changers</p>
                          <p className="text-lg font-bold text-green-400">{gameChangersCount}</p>
                        </div>
                      </div>
                    </div>

                    {vision.Usuario && (
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase mb-1">Coordinador</p>
                        <p className="text-xs font-medium text-white">{vision.Usuario.nombre}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 w-full">
          {/* Columna: Acciones Rápidas */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-black text-white uppercase flex items-center gap-2">
              <Zap className="text-yellow-400" size={18} /> 
              <span className="hidden sm:inline">Acciones Rápidas</span>
              <span className="sm:hidden">Acciones</span>
            </h2>

            {/* Widget de Tesorería Express */}
            <div className="mb-6">
              <TreasuryQuickWidget isAdmin={true} />
            </div>

            {/* Widget de Checkouts Abandonados */}
            <Link href="/dashboard/school-admin/abandoned-checkouts" className="block">
              <div className="bg-gradient-to-br from-orange-900/50 via-red-900/30 to-slate-900 border-2 border-orange-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all cursor-pointer group hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -z-10"></div>
                
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className="p-2 md:p-3 bg-orange-500/20 group-hover:bg-orange-500/30 rounded-lg md:rounded-xl transition-colors flex-shrink-0">
                    <ShoppingCart size={20} className="text-orange-300 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-xs md:text-sm uppercase line-clamp-2">
                      🛒 Checkouts Abandonados
                    </h3>
                    <p className="text-[10px] md:text-xs text-orange-300 line-clamp-1">
                      Recupera ventas perdidas con anticipos
                    </p>
                  </div>
                </div>
                <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2">
                  Visualiza quién abandonó el checkout y envía emails para recuperar la venta
                </p>
              </div>
            </Link>

            {/* Widget de QR de Organización */}
            <div 
              onClick={() => {
                if (!qrDataURL) {
                  generateOrganizationQR();
                }
                setShowQRModal(true);
              }}
              className="bg-gradient-to-br from-blue-900/50 via-indigo-900/30 to-slate-900 border-2 border-blue-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all cursor-pointer group hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
              
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-lg md:rounded-xl transition-colors flex-shrink-0">
                  <span className="text-2xl">📱</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-xs md:text-sm uppercase line-clamp-2">
                    QR de Registro
                  </h3>
                  <p className="text-[10px] md:text-xs text-blue-300 line-clamp-1">
                    Código QR personalizado de tu organización
                  </p>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2">
                Comparte este QR para que nuevos usuarios se registren directamente en tu organización
              </p>
            </div>

            {/* Widget de Misiones & Tareas Extraordinarias */}
            <div 
              onClick={() => setMisionesModalOpen(true)}
              className="bg-gradient-to-br from-amber-900/50 via-orange-900/30 to-slate-900 border-2 border-amber-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all cursor-pointer group hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-10"></div>
              
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-amber-500/20 group-hover:bg-amber-500/30 rounded-lg md:rounded-xl transition-colors flex-shrink-0">
                  <Zap size={20} className="text-amber-300 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-xs md:text-sm uppercase line-clamp-2">
                    Misiones & Tareas Extraordinarias
                  </h3>
                  <p className="text-[10px] md:text-xs text-amber-300 line-clamp-1">
                    Gestiona misiones, tareas y obtén consejos de IA
                  </p>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2">
                Crea misiones especiales, asigna tareas y utiliza IA para optimizar el aprendizaje
              </p>
            </div>

            <Link href={data.pendingOrders.length > 0 ? "/dashboard/school-admin/licenses/payment" : "/dashboard/school-admin/licenses/request"} className="block">
              <div className={`bg-gradient-to-br ${(() => {
                if (data.pendingOrders.length === 0) return 'from-purple-900/50 to-slate-900 border-2 border-purple-500/30';
                const hasProcessing = data.pendingOrders.some((o: any) => o.status === 'PROCESSING');
                return hasProcessing 
                  ? 'from-blue-900/50 to-slate-900 border-2 border-blue-500/50 animate-pulse'
                  : 'from-red-900/50 to-slate-900 border-2 border-red-500/50 animate-pulse';
              })()} rounded-xl md:rounded-2xl p-4 md:p-6 transition-all cursor-pointer group relative overflow-hidden`}>
                {/* Badge animado para órdenes pendientes */}
                {data.pendingOrders.length > 0 && (() => {
                  const hasProcessing = data.pendingOrders.some((o: any) => o.status === 'PROCESSING');
                  const badgeBg = hasProcessing ? 'bg-blue-500' : 'bg-red-500';
                  const badgePing = hasProcessing ? 'bg-blue-400' : 'bg-red-400';
                  return (
                    <div className="absolute top-2 right-2">
                      <div className="relative">
                        <div className={`animate-ping absolute inline-flex h-5 w-5 md:h-6 md:w-6 rounded-full ${badgePing} opacity-75`}></div>
                        <div className={`relative inline-flex items-center justify-center h-5 w-5 md:h-6 md:w-6 rounded-full ${badgeBg} border-2 border-slate-900`}>
                          <span className="text-white font-bold text-[10px] md:text-xs">{data.pendingOrders.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className={`p-2 md:p-3 ${(() => {
                    if (data.pendingOrders.length === 0) return 'bg-purple-500/20 group-hover:bg-purple-500/30';
                    const hasProcessing = data.pendingOrders.some((o: any) => o.status === 'PROCESSING');
                    return hasProcessing
                      ? 'bg-blue-500/20 group-hover:bg-blue-500/30'
                      : 'bg-red-500/20 group-hover:bg-red-500/30';
                  })()} rounded-lg md:rounded-xl transition-colors flex-shrink-0`}>
                    {data.pendingOrders.length > 0 ? (
                      data.pendingOrders.some((o: any) => o.status === 'PROCESSING') ? (
                        <AlertTriangle size={24} className="text-blue-300" />
                      ) : (
                        <AlertTriangle size={24} className="text-red-300" />
                      )
                    ) : (
                      <Plus size={24} className="text-purple-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      {data.pendingOrders.length > 0 
                        ? (data.pendingOrders.some((o: any) => o.status === 'PROCESSING') ? '📋 Órdenes en Revisión' : '⚠️ Completar Pago')
                        : 'Comprar Licencias'
                      }
                    </h3>
                    <p className={`text-xs ${(() => {
                      if (data.pendingOrders.length === 0) return 'text-purple-300';
                      const hasProcessing = data.pendingOrders.some((o: any) => o.status === 'PROCESSING');
                      return hasProcessing ? 'text-blue-300' : 'text-red-300';
                    })()}`}>
                      {data.pendingOrders.length > 0 
                        ? (data.pendingOrders.some((o: any) => o.status === 'PROCESSING') ? 'Pendientes de aprobación' : 'Tienes órdenes pendientes')
                        : 'Expande tu capacidad'
                      }
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {data.pendingOrders.length > 0 
                    ? (() => {
                        const processingCount = data.pendingOrders.filter((o: any) => o.status === 'PROCESSING').length;
                        const pendingCount = data.pendingOrders.filter((o: any) => o.status === 'PENDING').length;
                        
                        if (processingCount > 0 && pendingCount > 0) {
                          return `${processingCount} en revisión, ${pendingCount} sin pagar`;
                        } else if (processingCount > 0) {
                          return `${processingCount} orden(es) en revisión - El administrador aprobará pronto`;
                        } else {
                          return `${pendingCount} orden(es) esperando pago`;
                        }
                      })()
                    : 'Adquiere más licencias para tus estudiantes'
                  }
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/visiones" className="block mt-6">
              <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-500/20 group-hover:bg-emerald-500/30 rounded-xl transition-colors">
                    <Users size={24} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestionar Visiones
                    </h3>
                    <p className="text-xs text-emerald-300">
                      Crea y asigna licencias
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Crea visiones/grupos y gestiona las licencias de tus participantes
                </p>
              </div>
            </Link>

            {/* Widget de Resultados de Encuestas */}
            <Link href="/dashboard/school-admin/survey-results" className="block mt-6">
              <div className="bg-gradient-to-br from-violet-900/50 via-purple-900/30 to-slate-900 border-2 border-violet-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -z-10"></div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-violet-500/20 group-hover:bg-violet-500/30 rounded-xl transition-colors">
                    <BarChart3 size={24} className="text-violet-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      📊 Resultados de Encuestas
                    </h3>
                    <p className="text-xs text-violet-300">
                      Ver retroalimentación de entrenamientos
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Consulta las encuestas de entrenadores, GameChangers y auditorías de directores
                </p>
              </div>
            </Link>

            {/* Widget de Registros Médicos */}
            <Link href="/dashboard/school-admin/medical-records" className="block mt-6">
              <div className="bg-gradient-to-br from-red-900/50 via-pink-900/30 to-slate-900 border-2 border-red-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 relative overflow-hidden">
                {/* Badge de alertas */}
                {medicalAlertsCount > 0 && (
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <div className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-400 opacity-75"></div>
                      <div className="relative inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 border-2 border-slate-900">
                        <span className="text-white font-bold text-xs">{medicalAlertsCount}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 group-hover:bg-red-500/30 rounded-xl transition-colors">
                    <Heart size={24} className="text-red-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      🏥 Registros Médicos
                    </h3>
                    <p className="text-xs text-red-300">
                      {medicalAlertsCount > 0 ? `${medicalAlertsCount} alertas pendientes` : 'Ver formularios médicos'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Revisa los registros médicos de los participantes y alertas de condiciones especiales
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/strikes" className="block mt-6">
              <div className="bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-slate-900 border-2 border-purple-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 group-hover:bg-purple-500/30 rounded-xl transition-colors">
                    <Shield size={24} className="text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestión de Strikes
                    </h3>
                    <p className="text-xs text-purple-300">
                      Administrar vidas extra
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Asigna tareas extraordinarias y revisa el status de llamadas
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/coordinadores" className="block mt-6">
              <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 border-2 border-blue-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-xl transition-colors">
                    <UserCheck size={24} className="text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestionar Equipo
                    </h3>
                    <p className="text-xs text-blue-300">
                      Crear y asignar
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Crea coordinadores y mentores para asígnarlos a tus visiones
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/users" className="block mt-6">
              <div className="bg-gradient-to-br from-cyan-900/50 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-cyan-500/20 group-hover:bg-cyan-500/30 rounded-xl transition-colors">
                    <GraduationCap size={24} className="text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Ver Mis Participantes
                    </h3>
                    <p className="text-xs text-cyan-300">
                      Detalle y avances
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Lista completa: Participantes, Game Changers, Coordinadores y Mentores
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/roles" className="block mt-6">
              <div className="bg-gradient-to-br from-violet-900/50 to-slate-900 border-2 border-violet-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-violet-500/20 group-hover:bg-violet-500/30 rounded-xl transition-colors">
                    <Shield size={24} className="text-violet-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Roles Múltiples
                    </h3>
                    <p className="text-xs text-violet-300">
                      Asignar roles adicionales
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Asigna roles de Coordinador, Líder o Entrenador a tus usuarios
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/productos" className="block mt-6">
              <div className="bg-gradient-to-br from-pink-900/50 to-slate-900 border-2 border-pink-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-pink-500/20 group-hover:bg-pink-500/30 rounded-xl transition-colors">
                    <ShoppingCart size={24} className="text-pink-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestionar Entrenamientos
                    </h3>
                    <p className="text-xs text-pink-300">
                      Entrenamientos y Talleres
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Administra todos tus productos: CORE y talleres extras
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/gift-codes" className="block mt-6">
              <div className="bg-gradient-to-br from-yellow-900/50 via-amber-900/40 to-slate-900 border-2 border-yellow-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-500/20 group-hover:bg-yellow-500/30 rounded-xl transition-colors">
                    <Ticket size={24} className="text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      CODIGOS BECAS
                    </h3>
                    <p className="text-xs text-yellow-300">
                      Golden & Platinum Tickets
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Genera códigos de regalo para tickets de acceso a tus visiones
                </p>
              </div>
            </Link>

            <Link href="/dashboard/school-admin/pasarela" className="block mt-6">
              <div className="bg-gradient-to-br from-emerald-900/50 via-teal-900/40 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-500/20 group-hover:bg-emerald-500/30 rounded-xl transition-colors">
                    <CreditCard size={24} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      PASARELA DE PAGOS
                    </h3>
                    <p className="text-xs text-emerald-300">
                      Mercado Pago, Stripe, PayPal
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Configura cómo tu organización recibe pagos con tarjeta
                </p>
              </div>
            </Link>

            <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Activity size={24} className="text-green-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm uppercase">Progreso Global</h3>
                  <p className="text-xs text-green-300">Rendimiento general</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cumplimiento:</span>
                  <span className="text-white font-bold">{data.overview.completionRate}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${data.overview.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Misiones & Tareas Extraordinarias */}
      {misionesModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMisionesModalOpen(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-orange-600/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-orange-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-br from-orange-900/60 via-yellow-900/40 to-orange-900/60 border-b border-orange-600/30 p-6 flex items-center justify-between backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <Zap className="text-yellow-400" size={28} />
                <h2 className="text-2xl font-black text-white">
                  Misiones & Tareas Extraordinarias
                </h2>
              </div>
              <button
                onClick={() => setMisionesModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              {/* Revisar Evidencias */}
              <Link 
                href="/dashboard/admin/evidencias"
                onClick={() => setMisionesModalOpen(false)}
                className="block p-5 bg-slate-900/60 border border-amber-600/30 rounded-xl hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-amber-300 transition-colors">
                        ✅ Revisar Evidencias
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        Aprueba misiones y tareas extraordinarias
                      </p>
                    </div>
                  </div>
                  <div className="text-amber-400 group-hover:translate-x-1 transition-transform text-xl">→</div>
                </div>
              </Link>

              {/* Misiones con Quantum IA */}
              <Link 
                href="/dashboard/admin/tareas/nueva?quantum=true"
                onClick={() => setMisionesModalOpen(false)}
                className="block p-5 bg-slate-900/60 border border-purple-600/30 rounded-xl hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                      <BookOpen size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">
                        🧠 Misiones con Quantum IA
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        Crea misiones personalizadas con IA para tu comunidad
                      </p>
                    </div>
                  </div>
                  <div className="text-purple-400 group-hover:translate-x-1 transition-transform text-xl">→</div>
                </div>
              </Link>

              {/* Tareas Extraordinarias */}
              <Link 
                href="/dashboard/admin/tareas/nueva"
                onClick={() => setMisionesModalOpen(false)}
                className="block p-5 bg-slate-900/60 border border-orange-600/30 rounded-xl hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-orange-300 transition-colors">
                        ⚡ Tareas Extraordinarias
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        Asigna tareas especiales para activar la visión
                      </p>
                    </div>
                  </div>
                  <div className="text-orange-400 group-hover:translate-x-1 transition-transform text-xl">→</div>
                </div>
              </Link>

              {/* Consejo de Quantum IA - Invitación */}
              <div className="mt-6 p-5 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-600/40 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">
                    {loadingConsejo ? '⏳' : consejoQuantum?.emoji || '🧬'}
                  </div>
                  <div className="flex-1">
                    <p className="text-base text-cyan-200 font-bold mb-2 flex items-center gap-2">
                      <Users size={18} />
                      💡 Consejo de Quantum IA - Invitación
                    </p>
                    {loadingConsejo ? (
                      <p className="text-sm text-cyan-100/60 animate-pulse">
                        Cargando consejo de activación...
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-cyan-100/80 mb-3">
                          Asigna una tarea de <strong className="text-cyan-300">invitar a 3 personas</strong> a conocer el programa. El crecimiento orgánico fortalece el compromiso de todos.
                        </p>
                        <div 
                          className="text-xs text-cyan-100/70 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: consejoQuantum?.consejo || 'No hay consejo disponible' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón de cierre al final */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setMisionesModalOpen(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR de Organización */}
      {showQRModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-blue-500/30 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-2xl font-black text-white">QR de Registro</h3>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 text-center">
              <div className="w-64 h-64 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl overflow-hidden">
                {qrDataURL ? (
                  <img src={qrDataURL} alt="QR Code" className="w-full h-full object-contain p-4" />
                ) : generatingQR ? (
                  <div className="animate-spin text-4xl">⏳</div>
                ) : (
                  <div className="text-slate-400 text-6xl">📱</div>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {organization?.name || 'Organización'}
              </h3>
              <p className="text-slate-400 mb-2">
                Código QR de registro personalizado
              </p>
              {qrDataURL && (
                <p className="text-slate-500 text-sm mb-6 font-mono break-all px-4">
                  {`${window.location.origin}/auth/signup?org=${organization?.codigoOrganizacion || organization?.id}`}
                </p>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    if (qrDataURL && navigator.share) {
                      fetch(qrDataURL)
                        .then(res => res.blob())
                        .then(blob => {
                          const file = new File([blob], `${organization?.name || 'organizacion'}-qr.png`, { type: 'image/png' });
                          navigator.share({
                            title: `QR de ${organization?.name || 'Organización'}`,
                            text: `Únete a ${organization?.name || 'nuestra organización'} escaneando este QR`,
                            files: [file]
                          }).catch(err => console.log('Error sharing:', err));
                        });
                    } else if (qrDataURL) {
                      // Fallback: copiar URL al portapapeles
                      const url = `${window.location.origin}/auth/signup?org=${organization?.codigoOrganizacion || organization?.id}`;
                      navigator.clipboard.writeText(url);
                      setNotification({type: 'success', message: 'Enlace copiado al portapapeles'});
                    }
                  }}
                  disabled={!qrDataURL || generatingQR}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-xl transition-all"
                >
                  🔗 Compartir
                </button>
                <button 
                  onClick={downloadOrganizationQR}
                  disabled={!qrDataURL}
                  className="px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                >
                  📥 Descargar
                </button>
              </div>

              <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Tip:</strong> Comparte este QR para que nuevos usuarios se registren automáticamente en tu organización
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
  };

  return (
    <div className={`p-3 md:p-6 rounded-xl md:rounded-2xl border ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className="p-1.5 md:p-2 bg-slate-900 rounded-lg">{icon}</div>
        <span className="text-[8px] md:text-[10px] font-bold uppercase text-slate-500 tracking-wider hidden md:inline">KPI</span>
      </div>
      <p className="text-xl md:text-3xl font-black text-white">{value}</p>
      <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-0.5 md:mt-1 line-clamp-1">{label}</p>
      <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-white/5 text-[8px] md:text-[10px] font-mono text-slate-500 line-clamp-2">
        {trend}
      </div>
    </div>
  );
}
