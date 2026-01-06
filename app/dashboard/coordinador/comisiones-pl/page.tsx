'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, DollarSign, TrendingUp, Award, Target, UserPlus, GraduationCap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Commission {
  id: number;
  amount: string;
  status: string;
  triggerEvent: string;
  createdAt: string;
  payoutScheduledDate: string | null;
  payoutCompletedDate: string | null;
  relatedUser: {
    nombre: string;
    apellido: string;
  };
  vision: {
    nombre: string;
  };
  configSnapshot?: {
    invitedBy?: number;
  };
}

interface CommissionSummary {
  total: number;
  totalAmount: string;
  pending: number;
  authorized: number;
  paid: number;
  byEvent: {
    [key: string]: {
      count: number;
      amount: string;
    };
  };
}

interface CommissionsData {
  commissions: Commission[];
  summary: CommissionSummary;
}

export default function CoordinadorPLCommissions() {
  const { data: session } = useSession();
  const [data, setData] = useState<CommissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCommissions();
    }
  }, [session]);

  async function fetchCommissions() {
    try {
      setLoading(true);
      const res = await fetch(`/api/coordinator-commissions?coordinatorId=${session?.user?.id}&limit=100`);
      
      if (!res.ok) {
        throw new Error('Error al cargar comisiones');
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING_REVIEW: <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">🟡 Pendiente</Badge>,
      AUTHORIZED: <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">🟢 Liberado</Badge>,
      PAID: <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">💰 Pagado</Badge>,
      CANCELLED: <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">🔴 Cancelado</Badge>,
      DISPUTED: <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">⚠️ Disputa</Badge>,
    };
    return badges[status as keyof typeof badges] || status;
  };

  const getEventBadge = (event: string) => {
    const badges = {
      PL_START: <Badge variant="outline" className="bg-blue-500/10 text-blue-500">🚀 Inicio PL</Badge>,
      PL_GUEST_PAID: <Badge variant="outline" className="bg-purple-500/10 text-purple-500">👥 Invitado</Badge>,
      PL_GRADUATION: <Badge variant="outline" className="bg-green-500/10 text-green-500">🎓 Graduación</Badge>,
    };
    return badges[event as keyof typeof badges] || event;
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">❌ {error}</p>
        <button 
          onClick={fetchCommissions}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Desglose por tipo de comisión
  const plStartCount = data?.summary?.byEvent?.PL_START?.count || 0;
  const plStartAmount = data?.summary?.byEvent?.PL_START?.amount || '0';
  
  const plGuestCount = data?.summary?.byEvent?.PL_GUEST_PAID?.count || 0;
  const plGuestAmount = data?.summary?.byEvent?.PL_GUEST_PAID?.amount || '0';
  
  const plGradCount = data?.summary?.byEvent?.PL_GRADUATION?.count || 0;
  const plGradAmount = data?.summary?.byEvent?.PL_GRADUATION?.amount || '0';

  const totalPLAmount = Number(plStartAmount) + Number(plGuestAmount) + Number(plGradAmount);

  // Datos para gráfica de proyección
  const currentGuests = plGuestCount;
  const ownTribe = plStartCount;
  const targetGuestsPerStudent = 4;
  const guestRate = 400;
  const projectedGuests = ownTribe * targetGuestsPerStudent;
  const projectedGuestRevenue = projectedGuests * guestRate;
  const currentGuestRevenue = Number(plGuestAmount);

  const projectionData = [
    {
      name: 'Actual',
      invitados: currentGuests,
      ingreso: currentGuestRevenue,
    },
    {
      name: 'Meta (4x)',
      invitados: projectedGuests,
      ingreso: projectedGuestRevenue,
    },
  ];

  // Datos para desglose visual
  const breakdownData = [
    { name: 'Inicio PL', amount: Number(plStartAmount), count: plStartCount, color: '#3b82f6' },
    { name: 'Invitados', amount: Number(plGuestAmount), count: plGuestCount, color: '#8b5cf6' },
    { name: 'Graduación', amount: Number(plGradAmount), count: plGradCount, color: '#10b981' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Comisiones e Impacto PL</h1>
          <p className="text-gray-400 mt-1">Panel completo de todas tus comisiones de Proyecto de Liderazgo</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1b2e] border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Inicio PL (Tu Tribu)
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">{plStartCount}</div>
            <div className="text-sm font-medium text-blue-400 mt-2">{formatCurrency(plStartAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Invitados Pagados
            </CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">{plGuestCount}</div>
            <div className="text-sm font-medium text-purple-400 mt-2">{formatCurrency(plGuestAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Graduaciones
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">{plGradCount}</div>
            <div className="text-sm font-medium text-green-400 mt-2">{formatCurrency(plGradAmount)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Estimado
            </CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">{formatCurrency(totalPLAmount)}</div>
            <div className="text-xs text-gray-400 mt-2">
              {data?.summary?.authorized || 0} autorizadas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Desglose (Recibo de Nómina) */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">📋 Recibo de Nómina - Desglose Detallado</CardTitle>
          <CardDescription className="text-gray-400">
            Tu nómina calculada por cada tipo de comisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {breakdownData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}10` }}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="font-medium text-gray-100">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.count} comisiones</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-100">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/40">
                <div className="font-bold text-xl text-gray-100">TOTAL ESTIMADO</div>
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  {formatCurrency(totalPLAmount)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfica de Proyección */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">📊 Proyección de Invitados</CardTitle>
          <CardDescription className="text-gray-400">
            Meta: 4 invitados pagados por cada alumno de tu tribu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1b2e',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'ingreso') {
                      return [formatCurrency(value), 'Ingreso'];
                    }
                    return [value, 'Invitados'];
                  }}
                />
                <Legend />
                <Bar dataKey="invitados" fill="#8b5cf6" name="Invitados" />
                <Bar dataKey="ingreso" fill="#3b82f6" name="Ingreso" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Progreso hacia la meta</div>
                <div className="text-2xl font-bold text-gray-100 mt-1">
                  {currentGuests} / {projectedGuests} invitados
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Potencial adicional</div>
                <div className="text-2xl font-bold text-green-400 mt-1">
                  {formatCurrency(projectedGuestRevenue - currentGuestRevenue)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Historial */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Historial de Comisiones</CardTitle>
          <CardDescription className="text-gray-400">
            Desglose por tipo de comisión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-[#0a0b14]">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="start">Inicio PL</TabsTrigger>
              <TabsTrigger value="guests">Invitados</TabsTrigger>
              <TabsTrigger value="grad">Graduaciones</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {data?.commissions && data.commissions.length > 0 ? (
                data.commissions.map((commission) => (
                  <CommissionCard key={commission.id} commission={commission} />
                ))
              ) : (
                <EmptyState />
              )}
            </TabsContent>

            <TabsContent value="start" className="space-y-4 mt-4">
              {data?.commissions?.filter((c) => c.triggerEvent === 'PL_START').length > 0 ? (
                data.commissions
                  .filter((c) => c.triggerEvent === 'PL_START')
                  .map((commission) => <CommissionCard key={commission.id} commission={commission} />)
              ) : (
                <EmptyState message="No hay comisiones de Inicio PL" />
              )}
            </TabsContent>

            <TabsContent value="guests" className="space-y-4 mt-4">
              {data?.commissions?.filter((c) => c.triggerEvent === 'PL_GUEST_PAID').length > 0 ? (
                data.commissions
                  .filter((c) => c.triggerEvent === 'PL_GUEST_PAID')
                  .map((commission) => <CommissionCard key={commission.id} commission={commission} />)
              ) : (
                <EmptyState message="No hay comisiones de Invitados" />
              )}
            </TabsContent>

            <TabsContent value="grad" className="space-y-4 mt-4">
              {data?.commissions?.filter((c) => c.triggerEvent === 'PL_GRADUATION').length > 0 ? (
                data.commissions
                  .filter((c) => c.triggerEvent === 'PL_GRADUATION')
                  .map((commission) => <CommissionCard key={commission.id} commission={commission} />)
              ) : (
                <EmptyState message="No hay comisiones de Graduación" />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resumen por Estado */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Estado de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="text-yellow-500 text-sm font-medium">🟡 Pendientes</div>
              <div className="text-2xl font-bold text-gray-100 mt-2">
                {data?.summary?.pending || 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="text-green-500 text-sm font-medium">🟢 Liberados</div>
              <div className="text-2xl font-bold text-gray-100 mt-2">
                {data?.summary?.authorized || 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="text-blue-500 text-sm font-medium">💰 Pagados</div>
              <div className="text-2xl font-bold text-gray-100 mt-2">
                {data?.summary?.paid || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function CommissionCard({ commission }: { commission: Commission }) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-[#0a0b14] border border-gray-800 hover:border-purple-500/40 transition-colors">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="font-semibold text-gray-100">
              {commission.relatedUser.nombre} {commission.relatedUser.apellido}
            </div>
            {getStatusBadge(commission.status)}
            {getEventBadge(commission.triggerEvent)}
          </div>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
            <span>📚 {commission.vision.nombre}</span>
            <span>📅 {formatDate(commission.createdAt)}</span>
            {commission.payoutScheduledDate && (
              <span>💰 Pago: {formatDate(commission.payoutScheduledDate)}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(commission.amount)}
          </div>
          {commission.payoutCompletedDate && (
            <div className="text-xs text-blue-400 mt-1">
              Pagado: {formatDate(commission.payoutCompletedDate)}
            </div>
          )}
        </div>
      </div>
    );
  }

  function EmptyState({ message = 'Aún no tienes comisiones' }: { message?: string }) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-400">{message}</p>
        <p className="text-sm text-gray-500 mt-2">
          Las comisiones aparecerán aquí automáticamente
        </p>
      </div>
    );
  }
}
