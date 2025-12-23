"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Session {
  id: number;
  studentName: string;
  scheduledAt: string;
  duration: number;
  status: string;
  type: string;
  studentEmail: string;
  meetingLink?: string;
}

export default function SessionManager({ mentorId }: { mentorId: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);

  // Cargar sesiones pendientes del mentor
  useEffect(() => {
    loadSessions();
  }, [mentorId]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`/api/mentor/sessions?mentorId=${mentorId}`);
      const data = await res.json();
      
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (bookingId: number) => {
    if (!confirm("¿Confirmas que la sesión finalizó con éxito? Esto liberará tu pago y registrará tu asistencia.")) {
      return;
    }

    setCompleting(bookingId);

    try {
      const res = await fetch('/api/mentor/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("✅ Sesión completada. Pago liberado y asistencia registrada.");
        
        // Quitar de la lista local
        setSessions(prev => prev.filter(s => s.id !== bookingId));

        // Si se actualizaron insignias, mostrar mensaje
        if (data.badgesUpdated) {
          alert(`🏅 ¡Insignias actualizadas! Nuevas medallas: ${data.badges.join(', ')}`);
        }
      } else {
        alert(`❌ Error: ${data.error || 'No se pudo completar la sesión'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert("❌ Error de conexión");
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-2 text-slate-400">Cargando sesiones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        💼 Tus Mentorías Activas
        {sessions.length > 0 && (
          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            {sessions.length}
          </span>
        )}
      </h2>
      
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No tienes sesiones pendientes de completar.</p>
          <p className="text-slate-600 text-sm mt-1">Las sesiones aparecerán aquí después de la fecha programada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const isPending = session.status === 'PENDING' || session.status === 'CONFIRMED';
            const scheduledDate = new Date(session.scheduledAt);
            const now = new Date();
            const canComplete = scheduledDate <= now; // Solo si ya pasó la fecha

            return (
              <div 
                key={session.id} 
                className={`flex flex-col md:flex-row md:justify-between md:items-center bg-slate-900 p-4 rounded-lg border ${
                  canComplete ? 'border-green-500/50 bg-green-900/10' : 'border-slate-700'
                } transition-all`}
              >
                <div className="flex-1 mb-3 md:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <p className="font-bold text-white">{session.studentName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      session.type === 'MENTORSHIP' 
                        ? 'bg-amber-900/50 text-amber-300 border border-amber-700' 
                        : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                    }`}>
                      {session.type === 'MENTORSHIP' ? '💰 Mentoría Pagada' : '⚡ Disciplina'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(session.scheduledAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(session.scheduledAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <span className="text-purple-400">{session.duration} min</span>
                  </div>

                  {!canComplete && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                      ⏳ Podrás completarla {formatDistanceToNow(scheduledDate, { addSuffix: true, locale: es })}
                    </p>
                  )}

                  {session.meetingLink && (
                    <a 
                      href={session.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                    >
                      🔗 Unirse a la reunión
                    </a>
                  )}
                </div>

                <button 
                  onClick={() => handleComplete(session.id)}
                  disabled={!canComplete || completing === session.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                    canComplete
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {completing === session.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Terminar y Cobrar
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-2">💡 ¿Cómo funciona?</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Las sesiones aparecen después de su fecha programada</li>
          <li>• Al completar, se libera tu pago automáticamente</li>
          <li>• Tu asistencia se registra para tus insignias 🏅</li>
          <li>• El estudiante podrá calificarte después</li>
        </ul>
      </div>
    </div>
  );
}
