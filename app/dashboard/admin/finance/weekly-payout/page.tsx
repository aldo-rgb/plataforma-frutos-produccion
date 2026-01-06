'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CoordinatorBreakdown {
  coordinatorId: number;
  coordinatorName: string;
  totalAmount: number;
  commissionCount: number;
  byEvent: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
  commissionIds: number[];
}

interface PayoutSummary {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  payoutDate: string;
  totalAmount: string;
  totalCommissions: number;
  coordinatorsCount: number;
  status: string;
  summaryData: {
    coordinators: CoordinatorBreakdown[];
  };
  createdAt: string;
  approvedAt: string | null;
  approvedBy: number | null;
  organization: {
    nombre: string;
  };
  vision: {
    nombre: string;
  } | null;
}

export default function WeeklyPayoutReport() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payouts, setPayouts] = useState<PayoutSummary[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<PayoutSummary | null>(null);
  
  const [formData, setFormData] = useState({
    weekStartDate: '',
    weekEndDate: '',
    organizationId: '1',
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    try {
      setLoading(true);
      const res = await fetch('/api/coordinator-commissions/weekly-payout?limit=20');
      
      if (!res.ok) {
        throw new Error('Error al cargar reportes');
      }

      const data = await res.json();
      setPayouts(data.payouts || []);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudieron cargar los reportes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!formData.weekStartDate || !formData.weekEndDate) {
      toast({
        title: '⚠️ Advertencia',
        description: 'Selecciona las fechas de inicio y fin',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch('/api/coordinator-commissions/weekly-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate: formData.weekStartDate,
          weekEndDate: formData.weekEndDate,
          organizationId: Number(formData.organizationId),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al generar reporte');
      }

      const newPayout = await res.json();
      setPayouts([newPayout, ...payouts]);
      setSelectedPayout(newPayout);
      
      toast({
        title: '✅ Reporte Generado',
        description: `Se generó el reporte con ${newPayout.totalCommissions} comisiones`,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: '❌ Error',
        description: err instanceof Error ? err.message : 'No se pudo generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function updatePayoutStatus(payoutId: number, status: string) {
    try {
      const res = await fetch(`/api/coordinator-commissions/weekly-payout/${payoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar estado');
      }

      const updated = await res.json();
      setPayouts(payouts.map((p) => (p.id === payoutId ? updated : p)));
      if (selectedPayout?.id === payoutId) {
        setSelectedPayout(updated);
      }
      
      toast({
        title: '✅ Actualizado',
        description: `Estado cambiado a ${status}`,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: <Badge variant="outline" className="bg-gray-500/10 text-gray-500">📝 Borrador</Badge>,
      APPROVED: <Badge variant="outline" className="bg-green-500/10 text-green-500">✅ Aprobado</Badge>,
      PAID: <Badge variant="outline" className="bg-blue-500/10 text-blue-500">💰 Pagado</Badge>,
    };
    return badges[status as keyof typeof badges] || status;
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

  const exportToPDF = async () => {
    if (!selectedPayout) return;
    
    toast({
      title: '📄 Exportando PDF',
      description: 'Generando reporte en PDF...',
    });
    
    // Implementación de exportación PDF
    // Puedes usar jsPDF o similar
  };

  const exportToExcel = async () => {
    if (!selectedPayout) return;
    
    toast({
      title: '📊 Exportando Excel',
      description: 'Generando reporte en Excel...',
    });
    
    // Implementación de exportación Excel
    // Puedes usar xlsx o similar
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Reporte de Nómina Semanal</h1>
          <p className="text-gray-400 mt-1">Genera y administra cortes de comisiones</p>
        </div>
        <FileText className="h-8 w-8 text-purple-500" />
      </div>

      {/* Alert de Permisos */}
      {session?.user?.rol !== 'admin' && session?.user?.rol !== 'director' && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertDescription className="text-red-400">
            ⚠️ Solo administradores y directores pueden generar reportes de nómina.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario de Generación */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">🖨️ Generar Corte de Comisiones</CardTitle>
          <CardDescription className="text-gray-400">
            Selecciona el rango de fechas para generar el reporte semanal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weekStartDate" className="text-gray-300">
                Fecha de Inicio
              </Label>
              <Input
                id="weekStartDate"
                type="date"
                value={formData.weekStartDate}
                onChange={(e) =>
                  setFormData({ ...formData, weekStartDate: e.target.value })
                }
                className="bg-[#0a0b14] border-gray-700 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekEndDate" className="text-gray-300">
                Fecha de Fin
              </Label>
              <Input
                id="weekEndDate"
                type="date"
                value={formData.weekEndDate}
                onChange={(e) =>
                  setFormData({ ...formData, weekEndDate: e.target.value })
                }
                className="bg-[#0a0b14] border-gray-700 text-gray-100"
              />
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={generating || !formData.weekStartDate || !formData.weekEndDate}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            <FileText className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
            {generating ? 'Generando Reporte...' : 'Generar Reporte de Nómina'}
          </Button>

          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-400 text-sm">
              Solo se incluirán comisiones con estado "AUTHORIZED". El pago se programará para el próximo miércoles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Lista de Reportes */}
      <Card className="bg-[#1a1b2e] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-gray-100">Historial de Reportes</CardTitle>
          <CardDescription className="text-gray-400">
            Reportes generados recientemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : payouts.length > 0 ? (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  onClick={() => setSelectedPayout(payout)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPayout?.id === payout.id
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-[#0a0b14] border-gray-800 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-purple-400" />
                        <span className="font-semibold text-gray-100">
                          {formatDate(payout.weekStartDate)} - {formatDate(payout.weekEndDate)}
                        </span>
                        {getStatusBadge(payout.status)}
                      </div>
                      <div className="flex items-center space-x-6 mt-2 text-sm text-gray-400">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {payout.coordinatorsCount} coordinadores
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {payout.totalCommissions} comisiones
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Pago: {formatDate(payout.payoutDate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-500">
                        {formatCurrency(payout.totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No hay reportes generados</p>
              <p className="text-sm text-gray-500 mt-2">
                Genera tu primer reporte usando el formulario superior
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle del Reporte Seleccionado */}
      {selectedPayout && (
        <>
          {/* Acciones del Reporte */}
          <Card className="bg-[#1a1b2e] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-gray-100">Acciones del Reporte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                {selectedPayout.status === 'DRAFT' && (
                  <Button
                    onClick={() => updatePayoutStatus(selectedPayout.id, 'APPROVED')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprobar Reporte
                  </Button>
                )}
                
                {selectedPayout.status === 'APPROVED' && (
                  <Button
                    onClick={() => updatePayoutStatus(selectedPayout.id, 'PAID')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Marcar como Pagado
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={exportToPDF}
                  className="border-gray-700 text-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  className="border-gray-700 text-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Desglose por Coordinador */}
          <Card className="bg-[#1a1b2e] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-gray-100">Desglose por Coordinador</CardTitle>
              <CardDescription className="text-gray-400">
                Detalle de comisiones por cada coordinador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedPayout.summaryData?.coordinators?.map((coordinator) => (
                  <div
                    key={coordinator.coordinatorId}
                    className="p-4 rounded-lg bg-[#0a0b14] border border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg text-gray-100">
                          {coordinator.coordinatorName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {coordinator.commissionCount} comisiones
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          {formatCurrency(coordinator.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Desglose por evento */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-700">
                      {Object.entries(coordinator.byEvent).map(([event, data]) => (
                        <div key={event} className="text-center p-2 rounded bg-gray-800/50">
                          <div className="text-xs text-gray-400">{event}</div>
                          <div className="text-sm font-semibold text-gray-100">
                            {data.count}x
                          </div>
                          <div className="text-xs text-green-400">
                            {formatCurrency(data.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
