'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Calendar, Clock, CheckCircle, XCircle,
  Search, Save, AlertTriangle, ClipboardList, UserCheck,
  ChevronDown, ChevronUp, Filter, Download
} from 'lucide-react';

interface Participant {
  id: number;
  enrollmentId: number;
  userId: number;
  nombre: string;
  email: string;
  telefono: string | null;
  profileImage: string | null;
}

interface AttendanceRecord {
  enrollmentId: number;
  sessionNumber: number;
  attended: boolean;
  attendedAt: string | null;
}

interface SessionAttendance {
  sessionNumber: number;
  date: string;
  title: string;
  attendees: {
    enrollmentId: number;
    attended: boolean;
    attendedAt: string | null;
  }[];
}

export default function AsistenciaPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producto, setProducto] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [sessions, setSessions] = useState<{ number: number; date: string; title: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyAbsent, setShowOnlyAbsent] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProductData();
  }, [resolvedParams.productId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Obtener datos del producto y participantes
      const response = await fetch(`/api/coordinador/asistencia/${resolvedParams.productId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      const data = await response.json();
      
      setProducto(data.producto);
      setParticipants(data.participants || []);
      setSessions(data.sessions || []);
      
      // Cargar asistencia existente
      if (data.attendance) {
        const attendanceMap = new Map<string, boolean>();
        data.attendance.forEach((record: AttendanceRecord) => {
          const key = `${record.enrollmentId}-${record.sessionNumber}`;
          attendanceMap.set(key, record.attended);
        });
        setAttendance(attendanceMap);
      }

      // Seleccionar la sesión más reciente o la primera
      if (data.sessions && data.sessions.length > 0) {
        const today = new Date();
        const currentSession = data.sessions.find((s: any) => new Date(s.date) <= today) || data.sessions[0];
        setSelectedSession(currentSession.number);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceKey = (enrollmentId: number, sessionNumber: number) => {
    return `${enrollmentId}-${sessionNumber}`;
  };

  const toggleAttendance = (enrollmentId: number) => {
    const key = getAttendanceKey(enrollmentId, selectedSession);
    const newAttendance = new Map(attendance);
    newAttendance.set(key, !attendance.get(key));
    setAttendance(newAttendance);
  };

  const markAllPresent = () => {
    const newAttendance = new Map(attendance);
    filteredParticipants.forEach(p => {
      const key = getAttendanceKey(p.enrollmentId, selectedSession);
      newAttendance.set(key, true);
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance = new Map(attendance);
    filteredParticipants.forEach(p => {
      const key = getAttendanceKey(p.enrollmentId, selectedSession);
      newAttendance.set(key, false);
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      // Preparar datos de asistencia para la sesión seleccionada
      const attendanceData = participants.map(p => ({
        enrollmentId: p.enrollmentId,
        sessionNumber: selectedSession,
        attended: attendance.get(getAttendanceKey(p.enrollmentId, selectedSession)) || false
      }));

      const response = await fetch(`/api/coordinador/asistencia/${resolvedParams.productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber: selectedSession,
          attendance: attendanceData
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      setSaveMessage({ type: 'success', text: '✅ Asistencia guardada correctamente' });
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Error saving attendance:', error);
      setSaveMessage({ type: 'error', text: '❌ Error al guardar asistencia' });
    } finally {
      setSaving(false);
    }
  };

  // Filtrar participantes
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showOnlyAbsent) {
      const key = getAttendanceKey(p.enrollmentId, selectedSession);
      return matchesSearch && !attendance.get(key);
    }
    
    return matchesSearch;
  });

  // Estadísticas
  const totalParticipants = participants.length;
  const presentCount = participants.filter(p => 
    attendance.get(getAttendanceKey(p.enrollmentId, selectedSession))
  ).length;
  const absentCount = totalParticipants - presentCount;
  const attendanceRate = totalParticipants > 0 ? Math.round((presentCount / totalParticipants) * 100) : 0;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-slate-400 mt-4">Cargando datos de asistencia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/coordinador-basico"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ClipboardList className="text-cyan-400" size={32} />
                Registro de Asistencia
              </h1>
              {producto && (
                <p className="text-slate-400 mt-2">
                  {producto.name} • {producto.levelType === 'BASIC' ? 'Básico' : 
                    producto.levelType === 'INTERMEDIATE' ? 'Intermedio' : 
                    producto.levelType === 'ADVANCED' ? 'Avanzado' : producto.levelType}
                </p>
              )}
            </div>

            <button
              onClick={saveAttendance}
              disabled={saving}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
                ${saving 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 hover:scale-105'
                }
              `}
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Asistencia'}
            </button>
          </div>

          {/* Mensaje de guardado */}
          {saveMessage && (
            <div className={`mt-4 p-4 rounded-xl ${
              saveMessage.type === 'success' 
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalParticipants}</p>
                <p className="text-sm text-slate-400">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck className="text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{presentCount}</p>
                <p className="text-sm text-slate-400">Presentes</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="text-red-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{absentCount}</p>
                <p className="text-sm text-slate-400">Ausentes</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <CheckCircle className="text-cyan-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400">{attendanceRate}%</p>
                <p className="text-sm text-slate-400">Asistencia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Selector */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-cyan-400" size={20} />
              <span className="text-white font-semibold">Sesión:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                {sessions.length > 0 ? (
                  sessions.map(s => (
                    <option key={s.number} value={s.number}>
                      Sesión {s.number} - {s.title || new Date(s.date).toLocaleDateString('es-ES')}
                    </option>
                  ))
                ) : (
                  // Si no hay sesiones predefinidas, mostrar opciones genéricas
                  [...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Sesión {i + 1}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markAllPresent}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 text-sm font-semibold transition-all"
              >
                ✓ Todos Presentes
              </button>
              <button
                onClick={markAllAbsent}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 text-sm font-semibold transition-all"
              >
                ✗ Todos Ausentes
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          
          <button
            onClick={() => setShowOnlyAbsent(!showOnlyAbsent)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              showOnlyAbsent 
                ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Filter size={20} />
            Solo Ausentes
          </button>
        </div>

        {/* Participants List */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
            <span className="text-slate-400 font-semibold">#</span>
            <span className="text-slate-400 font-semibold">Participante</span>
            <span className="text-slate-400 font-semibold text-center">Asistencia</span>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">
                {searchTerm ? 'No se encontraron participantes' : 'No hay participantes inscritos'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredParticipants.map((participant, index) => {
                const key = getAttendanceKey(participant.enrollmentId, selectedSession);
                const isPresent = attendance.get(key) || false;

                return (
                  <div
                    key={participant.enrollmentId}
                    className={`grid grid-cols-[auto_1fr_auto] gap-4 p-4 items-center transition-colors ${
                      isPresent ? 'bg-green-500/5' : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <span className="text-slate-500 font-mono text-sm w-8">
                      {index + 1}
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {participant.profileImage ? (
                          <img 
                            src={participant.profileImage} 
                            alt={participant.nombre}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          participant.nombre.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{participant.nombre}</p>
                        <p className="text-slate-400 text-sm">{participant.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAttendance(participant.enrollmentId)}
                      className={`
                        w-16 h-10 rounded-xl flex items-center justify-center transition-all
                        ${isPresent 
                          ? 'bg-green-500/20 border-2 border-green-500 text-green-400' 
                          : 'bg-slate-700/50 border-2 border-slate-600 text-slate-400 hover:border-slate-500'
                        }
                      `}
                    >
                      {isPresent ? (
                        <CheckCircle size={24} />
                      ) : (
                        <XCircle size={24} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Progreso de asistencia</span>
            <span className="text-cyan-400 font-bold">{attendanceRate}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
