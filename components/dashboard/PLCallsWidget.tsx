'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  CalendarPlus,
  Loader2,
  Flag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PLStats {
  vision: { id: number; nombre: string };
  currentWeek: number;
  atomStats: {
    squadId: string;
    squadName: string;
    memberCount: number;
    totalCalls: number;
    completedCalls: number;
    scheduledCalls: number;
    overallAttendanceRate: number;
    callsByWeek: Array<{
      week: number;
      hasCall: boolean;
      status: string | null;
      scheduledDate: string | null;
      scheduledTime: string | null;
    }>;
  } | null;
  atRiskParticipants: Array<{
    id: number;
    nombre: string;
    lastRiskWeek: number;
  }>;
}

interface PLSquad {
  id: string;
  name: string;
  visionId: number;
  level: string;
}

export default function PLCallsWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PLStats | null>(null);
  const [squad, setSquad] = useState<PLSquad | null>(null);
  const [nextCall, setNextCall] = useState<{
    weekNumber: number;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    fetchPLData();
  }, []);

  const fetchPLData = async () => {
    try {
      setLoading(true);

      // Obtener squads del GC
      const squadsRes = await fetch('/api/game-changer/squads');
      const squadsData = await squadsRes.json();

      const plSquad = squadsData.squads?.find((s: any) => s.level === 'PL');

      if (!plSquad) {
        setLoading(false);
        return;
      }

      setSquad(plSquad);

      // Obtener estadísticas PL
      const statsRes = await fetch(`/api/pl-calls/stats?visionId=${plSquad.visionId}`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Encontrar próxima llamada programada
      if (statsData.atomStats?.callsByWeek) {
        const scheduled = statsData.atomStats.callsByWeek.find(
          (w: any) => w.hasCall && w.status === 'SCHEDULED'
        );
        if (scheduled) {
          setNextCall({
            weekNumber: scheduled.week,
            scheduledDate: scheduled.scheduledDate,
            scheduledTime: scheduled.scheduledTime,
            status: scheduled.status
          });
        }
      }

    } catch (error) {
      console.error('Error fetching PL data:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si está cargando o no hay squad PL
  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-yellow-500/30">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!squad) {
    return null; // No mostrar widget si no tiene squad PL
  }

  const currentWeekData = stats?.atomStats?.callsByWeek?.find(
    w => w.week === stats?.currentWeek
  );
  const hasCurrentWeekCall = currentWeekData?.hasCall;
  const currentWeekStatus = currentWeekData?.status;

  return (
    <Card className="bg-gradient-to-br from-yellow-900/20 to-slate-900/50 border-yellow-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Phone className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Llamadas PL</CardTitle>
              <CardDescription className="text-yellow-400/80">
                {squad.name} • Semana {stats?.currentWeek || 0}
              </CardDescription>
            </div>
          </div>
          <Link href="/dashboard/game-changer/pl-calls">
            <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300">
              Ver todas
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">
              {stats?.atomStats?.completedCalls || 0}
            </p>
            <p className="text-xs text-slate-400">Completadas</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {stats?.atomStats?.scheduledCalls || 0}
            </p>
            <p className="text-xs text-slate-400">Programadas</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {stats?.atomStats?.overallAttendanceRate || 0}%
            </p>
            <p className="text-xs text-slate-400">Asistencia</p>
          </div>
        </div>

        {/* Current Week Status */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentWeekStatus === 'COMPLETED' ? 'bg-green-500/20' :
                currentWeekStatus === 'SCHEDULED' ? 'bg-blue-500/20' :
                'bg-yellow-500/20'
              }`}>
                <span className="text-lg font-bold text-yellow-400">{stats?.currentWeek || 0}</span>
              </div>
              <div>
                <p className="font-medium text-white">Semana Actual</p>
                {currentWeekStatus === 'COMPLETED' ? (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Llamada completada
                  </p>
                ) : currentWeekStatus === 'SCHEDULED' ? (
                  <p className="text-xs text-blue-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Llamada programada
                  </p>
                ) : (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Sin llamada programada
                  </p>
                )}
              </div>
            </div>

            {!hasCurrentWeekCall && (
              <Link href="/dashboard/game-changer/pl-calls">
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                  <CalendarPlus className="w-4 h-4 mr-1" />
                  Agendar
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Next Scheduled Call */}
        {nextCall && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Próxima Llamada
            </div>
            <p className="text-white font-medium">
              Semana {nextCall.weekNumber} • {new Date(nextCall.scheduledDate).toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              })} a las {nextCall.scheduledTime}
            </p>
          </div>
        )}

        {/* At Risk Alert */}
        {stats?.atRiskParticipants && stats.atRiskParticipants.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              {stats.atRiskParticipants.length} participante(s) en riesgo
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.atRiskParticipants.slice(0, 3).map(p => (
                <Badge key={p.id} className="bg-red-500/20 text-red-300 border-red-500/30">
                  <Flag className="w-3 h-3 mr-1" />
                  {p.nombre.split(' ')[0]}
                </Badge>
              ))}
              {stats.atRiskParticipants.length > 3 && (
                <Badge className="bg-slate-700 text-slate-300">
                  +{stats.atRiskParticipants.length - 3} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Week Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progreso de Semanas</span>
            <span>{stats?.atomStats?.completedCalls || 0} / 12 semanas</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(week => {
              const weekData = stats?.atomStats?.callsByWeek?.find(w => w.week === week);
              const status = weekData?.status;
              const isCurrentWeek = week === stats?.currentWeek;

              let bgColor = 'bg-slate-700';
              if (status === 'COMPLETED') bgColor = 'bg-green-500';
              else if (status === 'SCHEDULED') bgColor = 'bg-blue-500';
              else if (week < (stats?.currentWeek || 0) && !weekData?.hasCall) bgColor = 'bg-red-500/50';

              return (
                <div
                  key={week}
                  className={`flex-1 h-2 rounded-full ${bgColor} ${isCurrentWeek ? 'ring-2 ring-yellow-400' : ''}`}
                  title={`Semana ${week}: ${status || 'Sin programar'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Members Count */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-4 h-4" />
            <span>{stats?.atomStats?.memberCount || 0} miembros en tu átomo</span>
          </div>
          <Link href={`/dashboard/game-changer/squads?level=PL&visionId=${squad.visionId}`}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
              Ver átomo
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
