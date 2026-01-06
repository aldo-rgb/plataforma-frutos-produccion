'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, DollarSign, Users, TrendingUp } from 'lucide-react';

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

export default function CoordinadorBasicoCommissions() {
  const { data: session } = useSession();
  const [data, setData] = useState<CommissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateConfig, setRateConfig] = useState<number>(300);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCommissions();
      fetchConfig();
    }
  }, [session]);

  async function fetchCommissions() {
    try {
      setLoading(true);
      const res = await fetch(`/api/coordinator-commissions?coordinatorId=${session?.user?.id}&limit=50`);
      
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

  async function fetchConfig() {
    try {
      // Obtener configuración de la primera visión (ajustar según necesidad)
      const res = await fetch(`/api/coordinator-commissions/config?visionId=1`);
      if (res.ok) {
        const config = await res.json();
        setRateConfig(Number(config.basicSeatedRate));
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
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

  const formatCurrency = (amount: string) => {
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

  const basicSeatedCount = data?.summary?.byEvent?.BASIC_SEATED?.count || 0;
  const basicSeatedAmount = data?.summary?.byEvent?.BASIC_SEATED?.amount || '0';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Mi Nómina Básico</h1>
          <p className="text-gray-400 mt-1">Comisiones por alumnos sentados con asistencia</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#1a1b2e] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Alumnos Sentados
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">{basicSeatedCount}</div>
            <p className="text-xs text-gray-400 mt-1">
              Con asistencia confirmada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Total Generado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">
              {formatCurrency(basicSeatedAmount)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Por alumnos básico
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              Pagos Liberados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">
              {data?.summary?.authorized || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Comisiones autorizadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1b2e] border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">
              En Revisión
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">
              {data?.summary?.pending || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Pendientes de revisión
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calculadora Visual */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Calculadora de Comisiones</CardTitle>
          <CardDescription className="text-gray-400">
            Cálculo automático basado en tus alumnos sentados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 text-2xl font-bold">
            <div className="text-center">
              <div className="text-4xl text-purple-500">{basicSeatedCount}</div>
              <div className="text-sm text-gray-400 mt-1">Alumnos</div>
            </div>
            <div className="text-gray-500">×</div>
            <div className="text-center">
              <div className="text-4xl text-green-500">{formatCurrency(rateConfig.toString())}</div>
              <div className="text-sm text-gray-400 mt-1">Tarifa</div>
            </div>
            <div className="text-gray-500">=</div>
            <div className="text-center">
              <div className="text-4xl text-blue-500">{formatCurrency(basicSeatedAmount)}</div>
              <div className="text-sm text-gray-400 mt-1">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Comisiones */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Historial de Comisiones</CardTitle>
          <CardDescription className="text-gray-400">
            Desglose detallado de todas tus comisiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.commissions && data.commissions.length > 0 ? (
            <div className="space-y-4">
              {data.commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#0a0b14] border border-gray-800 hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-semibold text-gray-100">
                        {commission.relatedUser.nombre} {commission.relatedUser.apellido}
                      </div>
                      {getStatusBadge(commission.status)}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-400">Aún no tienes comisiones registradas</p>
              <p className="text-sm text-gray-500 mt-2">
                Las comisiones aparecerán aquí cuando tus alumnos sean sentados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen por Estado */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Resumen por Estado</CardTitle>
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
}
