'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface CallTrackingData {
  id: number;
  userId: number;
  visionId: number;
  enrolledAt: string;
  enrollmentStatus: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    organizacion: {
      id: number;
      name: string;
    } | null;
  };
  angelEnrolamiento: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  coordinador: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  tracking: {
    id: number;
    nickname: string | null;
    phone: string | null;
    preferredCallTimeStart: string | null;
    preferredCallTimeEnd: string | null;
    attendanceStatus: 'PENDING' | 'ASISTE' | 'NO_ASISTE';
    callAttempts: number;
    lastInteractionAt: string | null;
    interactions: Array<{
      id: number;
      callResult: string;
      comments: string | null;
      createdAt: string;
      Usuario: {
        id: number;
        nombre: string;
      };
    }>;
  } | null;
}

export default function CallManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const visionId = params?.id as string;

  // Obtener el nivel desde la URL o usar BASIC por defecto
  const levelFromUrl = searchParams?.get('level') as 'BASIC' | 'ADVANCED' | 'PL' | null;
  const initialLevel = levelFromUrl && ['BASIC', 'ADVANCED', 'PL'].includes(levelFromUrl) 
    ? levelFromUrl 
    : 'BASIC';

  const [callData, setCallData] = useState<CallTrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMyList, setFilterMyList] = useState(false);
  const [filterActiveHours, setFilterActiveHours] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'BASIC' | 'ADVANCED' | 'PL'>(initialLevel);
  const [selectedCard, setSelectedCard] = useState<CallTrackingData | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callResult, setCallResult] = useState('');
  const [callComments, setCallComments] = useState('');
  const [editingTrackingId, setEditingTrackingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    nickname: '',
    phone: '',
    preferredCallTimeStart: '',
    preferredCallTimeEnd: '',
  });

  // Fetch data
  useEffect(() => {
    fetchCallTrackingData();
  }, [visionId, selectedLevel]);

  const fetchCallTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/school-admin/visiones/${visionId}/call-tracking?level=${selectedLevel}`);
      if (response.ok) {
        const data = await response.json();
        setCallData(data);
      }
    } catch (error) {
      console.error('Error fetching call tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utility: Check if current time is within preferred call window
  const isWithinPreferredHours = (start: string | null, end: string | null): boolean => {
    if (!start || !end) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  };

  // Filter and sort data
  const filteredAndSortedData = callData
    .filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.usuario.nombre.toLowerCase().includes(searchLower) ||
        item.usuario.email.toLowerCase().includes(searchLower) ||
        item.usuario.telefono?.includes(searchTerm) ||
        (item.tracking?.nickname?.toLowerCase().includes(searchLower) ?? false);

      if (!matchesSearch) return false;

      // My list filter
      if (filterMyList && session?.user?.id) {
        const myCoordinadorMatch = item.coordinador?.id === Number(session.user.id);
        if (!myCoordinadorMatch) return false;
      }

      // Active hours filter
      if (filterActiveHours) {
        const isActive = isWithinPreferredHours(
          item.tracking?.preferredCallTimeStart ?? null,
          item.tracking?.preferredCallTimeEnd ?? null
        );
        if (!isActive) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Smart sorting: prioritize those within preferred hours
      const aIsActive = isWithinPreferredHours(
        a.tracking?.preferredCallTimeStart ?? null,
        a.tracking?.preferredCallTimeEnd ?? null
      );
      const bIsActive = isWithinPreferredHours(
        b.tracking?.preferredCallTimeStart ?? null,
        b.tracking?.preferredCallTimeEnd ?? null
      );

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Secondary sort: by last interaction (null first = never contacted)
      const aLastInteraction = a.tracking?.lastInteractionAt
        ? new Date(a.tracking.lastInteractionAt).getTime()
        : 0;
      const bLastInteraction = b.tracking?.lastInteractionAt
        ? new Date(b.tracking.lastInteractionAt).getTime()
        : 0;

      return aLastInteraction - bLastInteraction;
    });

  // Handle call action
  const handleOpenCallModal = (item: CallTrackingData) => {
    setSelectedCard(item);
    setShowCallModal(true);
    setCallResult('');
    setCallComments('');
  };

  const handleSubmitCallResult = async () => {
    if (!selectedCard || !callResult) return;

    try {
      // If no tracking exists yet, create it
      if (!selectedCard.tracking) {
        const trackingResponse = await fetch(
          `/api/school-admin/visiones/${visionId}/call-tracking`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enrollmentId: selectedCard.id,
              trackingData: {
                phone: selectedCard.usuario.telefono,
                attendanceStatus: 'PENDING',
              },
            }),
          }
        );

        if (!trackingResponse.ok) {
          alert('Error al crear tracking');
          return;
        }

        const newTracking = await trackingResponse.json();
        selectedCard.tracking = newTracking;
      }

      // Register interaction
      if (!selectedCard.tracking) {
        console.error('No tracking found');
        return;
      }
      
      const response = await fetch(
        `/api/school-admin/visiones/${visionId}/call-interactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingId: selectedCard.tracking.id,
            callResult,
            comments: callComments,
          }),
        }
      );

      if (response.ok) {
        setShowCallModal(false);
        fetchCallTrackingData(); // Refresh data
      }
    } catch (error) {
      console.error('Error submitting call result:', error);
    }
  };

  // Handle edit tracking
  const handleEditTracking = (item: CallTrackingData) => {
    setEditingTrackingId(item.tracking?.id ?? null);
    setEditFormData({
      nickname: item.tracking?.nickname ?? '',
      phone: item.tracking?.phone ?? item.usuario.telefono ?? '',
      preferredCallTimeStart: item.tracking?.preferredCallTimeStart ?? '',
      preferredCallTimeEnd: item.tracking?.preferredCallTimeEnd ?? '',
    });
  };

  const handleSaveTracking = async (enrollmentId: number) => {
    try {
      const response = await fetch(
        `/api/school-admin/visiones/${visionId}/call-tracking`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentId,
            trackingData: editFormData,
          }),
        }
      );

      if (response.ok) {
        setEditingTrackingId(null);
        fetchCallTrackingData();
      }
    } catch (error) {
      console.error('Error saving tracking:', error);
    }
  };

  // Toggle attendance status
  const toggleAttendanceStatus = async (item: CallTrackingData) => {
    if (!item.tracking) {
      // Create tracking first
      const response = await fetch(
        `/api/school-admin/visiones/${visionId}/call-tracking`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentId: item.id,
            trackingData: {
              phone: item.usuario.telefono,
              attendanceStatus: 'ASISTE',
            },
          }),
        }
      );

      if (response.ok) {
        fetchCallTrackingData();
      }
      return;
    }

    const newStatus =
      item.tracking.attendanceStatus === 'ASISTE' ? 'NO_ASISTE' : 'ASISTE';

    const response = await fetch(
      `/api/school-admin/visiones/${visionId}/call-tracking`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: item.id,
          trackingData: {
            attendanceStatus: newStatus,
          },
        }),
      }
    );

    if (response.ok) {
      fetchCallTrackingData();
    }
  };

  // Calculate stats
  const totalCalls = filteredAndSortedData.length;
  const callsAsiste = filteredAndSortedData.filter(
    (item) => item.tracking?.attendanceStatus === 'ASISTE'
  ).length;
  const callsToday = filteredAndSortedData.filter((item) => {
    if (!item.tracking?.lastInteractionAt) return false;
    const lastCall = new Date(item.tracking.lastInteractionAt);
    const today = new Date();
    return lastCall.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => router.back()}
          className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
        >
          ← Volver
        </button>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                <span className="text-4xl">📞</span>
                Quantum Connection Hub
              </h1>
              <p className="text-slate-400">Gestión Inteligente de Llamadas - Nivel {selectedLevel === 'BASIC' ? '🌱 BÁSICO' : selectedLevel === 'ADVANCED' ? '🔥 AVANZADO' : '👑 LIDERATO'}</p>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-4">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-4 border border-blue-500/30">
                <div className="text-blue-400 text-xs font-medium">Llamadas Hoy</div>
                <div className="text-white text-2xl font-bold">{callsToday}/50</div>
              </div>
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl p-4 border border-green-500/30">
                <div className="text-green-400 text-xs font-medium">Confirmados</div>
                <div className="text-white text-2xl font-bold">{callsAsiste}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-4 border border-purple-500/30">
                <div className="text-purple-400 text-xs font-medium">Total</div>
                <div className="text-white text-2xl font-bold">{totalCalls}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Progreso Diario</span>
              <span className="text-white font-bold">{Math.round((callsToday / 50) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((callsToday / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 flex gap-4 items-center">
          {/* Level Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLevel('BASIC')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedLevel === 'BASIC'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              🌱 Básico
            </button>
            <button
              onClick={() => setSelectedLevel('ADVANCED')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedLevel === 'ADVANCED'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              🔥 Avanzado
            </button>
            <button
              onClick={() => setSelectedLevel('PL')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedLevel === 'PL'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              👑 Liderato
            </button>
          </div>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, email, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Filter: My List */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-600 hover:border-purple-500 transition-all">
            <input
              type="checkbox"
              checked={filterMyList}
              onChange={(e) => setFilterMyList(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-white text-sm font-medium">Mi Lista</span>
          </label>

          {/* Filter: Active Hours */}
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-600 hover:border-green-500 transition-all">
            <input
              type="checkbox"
              checked={filterActiveHours}
              onChange={(e) => setFilterActiveHours(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-white text-sm font-medium">🕒 Solo Disponibles Ahora</span>
          </label>
        </div>
      </div>

      {/* Call Cards Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-slate-400 text-xl">Cargando datos...</p>
          </div>
        ) : filteredAndSortedData.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-400 text-xl">No se encontraron registros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedData.map((item) => {
              const isActive = isWithinPreferredHours(
                item.tracking?.preferredCallTimeStart ?? null,
                item.tracking?.preferredCallTimeEnd ?? null
              );
              const attendanceStatus = item.tracking?.attendanceStatus ?? 'PENDING';

              return (
                <div
                  key={item.id}
                  className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 overflow-hidden transition-all hover:scale-105 hover:shadow-2xl ${
                    isActive
                      ? 'border-green-500 shadow-green-500/20'
                      : 'border-slate-600'
                  }`}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 border-b border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {item.usuario.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">
                            {item.tracking?.nickname || item.usuario.nombre}
                          </div>
                          {item.tracking?.nickname && (
                            <div className="text-slate-400 text-xs">
                              {item.usuario.nombre}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attendance Badge */}
                      <button
                        onClick={() => toggleAttendanceStatus(item)}
                        className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          attendanceStatus === 'ASISTE'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30'
                            : attendanceStatus === 'NO_ASISTE'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-500/30'
                        }`}
                      >
                        {attendanceStatus === 'ASISTE'
                          ? '✅ ASISTE'
                          : attendanceStatus === 'NO_ASISTE'
                          ? '🔴 NO ASISTE'
                          : '⏳ PENDIENTE'}
                      </button>
                    </div>

                    {/* Active Hours Indicator */}
                    {isActive && (
                      <div className="mt-2 flex items-center gap-2 text-green-400 text-xs font-medium">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Disponible ahora
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Contact Info */}
                    <div>
                      <div className="text-slate-400 text-xs mb-1">📧 Email</div>
                      <div className="text-white text-sm">{item.usuario.email}</div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-xs mb-1">📞 Teléfono</div>
                      <div className="text-white text-sm font-mono">
                        {item.tracking?.phone || item.usuario.telefono || 'No registrado'}
                      </div>
                    </div>

                    {/* Preferred Call Time */}
                    {editingTrackingId === item.tracking?.id ? (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">🕒 Horario de Llamada</div>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={editFormData.preferredCallTimeStart}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                preferredCallTimeStart: e.target.value,
                              })
                            }
                            className="bg-slate-900/50 border border-slate-600 rounded px-2 py-1 text-white text-xs flex-1"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={editFormData.preferredCallTimeEnd}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                preferredCallTimeEnd: e.target.value,
                              })
                            }
                            className="bg-slate-900/50 border border-slate-600 rounded px-2 py-1 text-white text-xs flex-1"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveTracking(item.id)}
                          className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 rounded"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">🕒 Horario de Llamada</div>
                        <div className="flex items-center justify-between">
                          <div className="text-white text-sm">
                            {item.tracking?.preferredCallTimeStart &&
                            item.tracking?.preferredCallTimeEnd
                              ? `${item.tracking.preferredCallTimeStart} - ${item.tracking.preferredCallTimeEnd}`
                              : 'No definido'}
                          </div>
                          <button
                            onClick={() => handleEditTracking(item)}
                            className="text-purple-400 hover:text-purple-300 text-xs"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Angel de Enrolamiento */}
                    {item.angelEnrolamiento && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">😇 Invitado por</div>
                        <div className="text-white text-sm">
                          {item.angelEnrolamiento.nombre}
                        </div>
                      </div>
                    )}

                    {/* Organization */}
                    {item.usuario.organizacion && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">🏢 Organización</div>
                        <div className="text-white text-sm">
                          {item.usuario.organizacion.name}
                        </div>
                      </div>
                    )}

                    {/* Coordinator */}
                    {item.coordinador && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">👤 Coordinador</div>
                        <div className="text-white text-sm">{item.coordinador.nombre}</div>
                      </div>
                    )}

                    {/* Call Attempts */}
                    <div>
                      <div className="text-slate-400 text-xs mb-1">📊 Intentos de Llamada</div>
                      <div className="text-white text-sm font-bold">
                        {item.tracking?.callAttempts || 0}
                      </div>
                    </div>

                    {/* Last Interaction */}
                    {item.tracking?.lastInteractionAt && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">🕐 Última Interacción</div>
                        <div className="text-white text-sm">
                          {new Date(item.tracking.lastInteractionAt).toLocaleString('es-MX')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Action Buttons */}
                  <div className="p-4 bg-slate-900/50 border-t border-slate-700 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenCallModal(item)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      📞 Llamar
                    </button>
                    <button
                      onClick={() => {
                        if (item.tracking?.phone || item.usuario.telefono) {
                          window.open(
                            `https://wa.me/${(item.tracking?.phone || item.usuario.telefono)?.replace(/\D/g, '')}`,
                            '_blank'
                          );
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      💬 WhatsApp
                    </button>
                  </div>

                  {/* Interaction History */}
                  {item.tracking?.interactions && item.tracking.interactions.length > 0 && (
                    <div className="p-4 bg-slate-900/30 border-t border-slate-700">
                      <div className="text-slate-400 text-xs mb-2 font-medium">📝 Bitácora</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {item.tracking.interactions.map((interaction) => (
                          <div
                            key={interaction.id}
                            className="bg-slate-800/50 rounded p-2 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-purple-400 font-medium">
                                {interaction.Usuario.nombre}
                              </span>
                              <span className="text-slate-500">
                                {new Date(interaction.createdAt).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                            <div className="text-slate-300">{interaction.callResult}</div>
                            {interaction.comments && (
                              <div className="text-slate-400 mt-1">{interaction.comments}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Result Modal */}
      {showCallModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border-2 border-purple-500/50 max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-slate-700">
              <h2 className="text-2xl font-black text-white">
                📞 Resultado de la Llamada
              </h2>
              <p className="text-slate-400 mt-1">{selectedCard.usuario.nombre}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Call Result Options */}
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">
                  Resultado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ANSWERED', label: '✅ Contestó', color: 'green' },
                    { value: 'VOICEMAIL', label: '📵 Buzón', color: 'yellow' },
                    { value: 'NO_ANSWER', label: '❌ No Contestó', color: 'red' },
                    { value: 'WRONG_NUMBER', label: '📞 Número Erróneo', color: 'orange' },
                    { value: 'RESCHEDULED', label: '📅 Re-agendar', color: 'blue' },
                    { value: 'CONFIRMED', label: '🎉 Confirmó', color: 'purple' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCallResult(option.value)}
                      className={`px-4 py-3 rounded-lg font-bold text-sm transition-all border-2 ${
                        callResult === option.value
                          ? `bg-${option.color}-500/30 border-${option.color}-500 text-white`
                          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="text-slate-300 text-sm font-medium mb-2 block">
                  Comentarios
                </label>
                <textarea
                  value={callComments}
                  onChange={(e) => setCallComments(e.target.value)}
                  placeholder="Agrega notas sobre la llamada..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCallModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitCallResult}
                disabled={!callResult}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
