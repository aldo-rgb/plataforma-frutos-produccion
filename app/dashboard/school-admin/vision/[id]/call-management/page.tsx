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
    apodo: string | null;
    email: string;
    telefono: string | null;
    expectations: string | null;
    invitedByText: string | null;
    invitedByUser: {
      id: number;
      nombre: string;
      vision: string | null;
      telefono: string | null;
    } | null;
    organizacion: {
      id: number;
      name: string;
    } | null;
    paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | 'NO_TICKET' | 'PENDING';
  };
  angelEnrolamiento: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
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
  const visionIdFromUrl = params?.id as string;

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
  const [filterByStatus, setFilterByStatus] = useState<'ALL' | 'PENDING' | 'ASISTE' | 'NO_ASISTE'>('PENDING');
  const [excludeUnpaid, setExcludeUnpaid] = useState(true); // Por defecto excluir usuarios sin pago
  const [selectedLevel, setSelectedLevel] = useState<'BASIC' | 'ADVANCED' | 'PL'>(initialLevel);
  const [selectedCard, setSelectedCard] = useState<CallTrackingData | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showAttendanceConfirm, setShowAttendanceConfirm] = useState(false);
  const [callResult, setCallResult] = useState('');
  const [callComments, setCallComments] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [editingTrackingId, setEditingTrackingId] = useState<number | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{nombre: string, telefono: string} | null>(null);
  const [editFormData, setEditFormData] = useState({
    nickname: '',
    phone: '',
    preferredCallTimeStart: '',
    preferredCallTimeEnd: '',
  });

  // Estado para visiones disponibles
  const [visiones, setVisiones] = useState<Array<{id: number; nombre: string}>>([]);
  const [selectedVisionId, setSelectedVisionId] = useState<string>(visionIdFromUrl);

  // Variable para usar en fetch
  const visionId = selectedVisionId;

  // Cargar visiones disponibles
  useEffect(() => {
    const fetchVisiones = async () => {
      try {
        const response = await fetch('/api/coordinador/productos-activos');
        if (response.ok) {
          const data = await response.json();
          // Extraer visiones únicas de los productos
          const visionesUnicas = new Map<number, string>();
          data.productos?.forEach((p: any) => {
            if (p.visionId && p.name) {
              // Extraer nombre de la visión del nombre del producto (ej: "Vision 25 - Básico" -> "Vision 25")
              const visionName = p.name.split(' - ')[0] || p.name;
              if (!visionesUnicas.has(p.visionId)) {
                visionesUnicas.set(p.visionId, visionName);
              }
            }
          });
          const visionesArray = Array.from(visionesUnicas.entries()).map(([id, nombre]) => ({ id, nombre }));
          setVisiones(visionesArray);
          
          // Si no hay visión seleccionada en URL o no existe, usar la primera disponible
          if (visionesArray.length > 0 && !visionesArray.find(v => v.id.toString() === visionIdFromUrl)) {
            setSelectedVisionId(visionesArray[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching visiones:', error);
      }
    };
    fetchVisiones();
  }, [visionIdFromUrl]);

  // Fetch data
  useEffect(() => {
    if (selectedVisionId) {
      fetchCallTrackingData();
    }
  }, [selectedVisionId, selectedLevel, excludeUnpaid]);

  const fetchCallTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/school-admin/visiones/${selectedVisionId}/call-tracking?level=${selectedLevel}&excludeUnpaid=${excludeUnpaid}`);
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

  // Utility: Parse time from different formats (HH:mm or "10am-3pm")
  const parseTimeRange = (timeString: string | null | undefined): { start: number, end: number } | null => {
    if (!timeString) return null;
    
    // Formato "HH:mm - HH:mm" o "HH:mm-HH:mm"
    if (timeString.includes(':')) {
      const parts = timeString.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const [startHour, startMin] = parts[0].split(':').map(Number);
        const [endHour, endMin] = parts[1].split(':').map(Number);
        return {
          start: startHour * 60 + startMin,
          end: endHour * 60 + endMin
        };
      }
    }
    
    // Formato "10am-3pm"
    const ampmMatch = timeString.match(/(\d+)(am|pm)\s*-\s*(\d+)(am|pm)/i);
    if (ampmMatch) {
      let startHour = parseInt(ampmMatch[1]);
      const startPeriod = ampmMatch[2].toLowerCase();
      let endHour = parseInt(ampmMatch[3]);
      const endPeriod = ampmMatch[4].toLowerCase();
      
      // Convertir a formato 24 horas
      if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
      if (startPeriod === 'am' && startHour === 12) startHour = 0;
      if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
      if (endPeriod === 'am' && endHour === 12) endHour = 0;
      
      return {
        start: startHour * 60,
        end: endHour * 60
      };
    }
    
    return null;
  };

  // Utility: Check if current time is within preferred call window
  const isWithinPreferredHours = (start: string | null, end: string | null, horarioLlamada?: string | null): boolean => {
    // Primero intentar con start/end del tracking
    let timeRange = null;
    if (start && end) {
      timeRange = parseTimeRange(`${start}-${end}`);
    }
    // Si no hay en tracking, usar horarioLlamada del usuario
    else if (horarioLlamada) {
      timeRange = parseTimeRange(horarioLlamada);
    }
    
    if (!timeRange) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    return currentTime >= timeRange.start && currentTime <= timeRange.end;
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

      // Status filter
      if (filterByStatus !== 'ALL') {
        const status = item.tracking?.attendanceStatus || 'PENDING';
        if (status !== filterByStatus) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Smart sorting: prioritize those within preferred hours
      const aIsActive = isWithinPreferredHours(
        a.tracking?.preferredCallTimeStart ?? null,
        a.tracking?.preferredCallTimeEnd ?? null,
        (a.usuario as any).horarioLlamada
      );
      const bIsActive = isWithinPreferredHours(
        b.tracking?.preferredCallTimeStart ?? null,
        b.tracking?.preferredCallTimeEnd ?? null,
        (b.usuario as any).horarioLlamada
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
    setRescheduleDate('');
  };

  const handleSubmitCallResult = async () => {
    if (!selectedCard || !callResult) return;
    
    // Si es "Contestó", mostrar modal de confirmación de asistencia
    if (callResult === 'ANSWERED') {
      setShowAttendanceConfirm(true);
      return;
    }
    
    // Si es reagendar, validar que tenga fecha
    if (callResult === 'RESCHEDULED' && !rescheduleDate) {
      alert('Por favor selecciona una fecha para reagendar');
      return;
    }

    await submitCallInteraction();
  };

  const handleAttendanceConfirm = async (willAttend: boolean) => {
    setShowAttendanceConfirm(false);
    await submitCallInteraction(willAttend ? 'ASISTE' : 'NO_ASISTE');
  };

  const submitCallInteraction = async (attendanceStatus?: string) => {
    if (!selectedCard || !callResult) return;

    try {
      // If no tracking exists yet, create it
      if (!selectedCard.tracking) {
        const trackingResponse = await fetch(
          `/api/school-admin/visiones/${selectedVisionId}/call-tracking`,
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
      
      // Preparar comentarios con fecha de reagendamiento si aplica
      let finalComments = callComments;
      if (callResult === 'RESCHEDULED' && rescheduleDate) {
        const fecha = new Date(rescheduleDate);
        const fechaFormateada = fecha.toLocaleString('es-ES', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        });
        finalComments = `${callComments}\n📅 Reagendado para: ${fechaFormateada}`;
      }
      
      const response = await fetch(
        `/api/school-admin/visiones/${selectedVisionId}/call-interactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingId: selectedCard.tracking.id,
            callResult,
            comments: finalComments,
            // Si es reagendar, volver a PENDING; si viene attendanceStatus (ASISTE/NO_ASISTE) usarlo
            attendanceStatus: callResult === 'RESCHEDULED' ? 'PENDING' : attendanceStatus,
          }),
        }
      );

      if (response.ok) {
        setShowCallModal(false);
        setShowAttendanceConfirm(false);
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
        `/api/school-admin/visiones/${selectedVisionId}/call-tracking`,
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
        `/api/school-admin/visiones/${selectedVisionId}/call-tracking`,
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
      `/api/school-admin/visiones/${selectedVisionId}/call-tracking`,
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
    (item) => item.tracking?.attendanceStatus === 'ASISTE' || item.tracking?.attendanceStatus === 'CONFIRMED'
  ).length;
  
  // Llamadas pendientes = no tienen tracking O su status es PENDING/null
  // Es decir, todos los que NO han confirmado asistencia
  const callsToday = filteredAndSortedData.filter((item) => {
    const status = item.tracking?.attendanceStatus;
    return !status || status === 'PENDING' || status === 'NO_ANSWER' || status === 'BUSY';
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-white/60 hover:text-white flex items-center gap-2"
          >
            ← Volver
          </button>
          
          {/* Selector de Visión */}
          {visiones.length > 0 && (
            <select
              value={selectedVisionId}
              onChange={(e) => setSelectedVisionId(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {visiones.map((vision) => (
                <option key={vision.id} value={vision.id.toString()}>
                  {vision.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center gap-2 md:gap-3">
                <span className="text-3xl md:text-4xl">📞</span>
                <span className="break-words">Quantum Connection Hub</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base">Gestión Inteligente de Llamadas - Nivel {selectedLevel === 'BASIC' ? '🌱 BÁSICO' : selectedLevel === 'ADVANCED' ? '🔥 AVANZADO' : '👑 LIDERATO'}</p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-3 md:p-4 border border-blue-500/30">
                <div className="text-blue-400 text-xs font-medium">Pendientes</div>
                <div className="text-white text-xl md:text-2xl font-bold">{callsToday}</div>
              </div>
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl p-3 md:p-4 border border-green-500/30">
                <div className="text-green-400 text-xs font-medium">Confirmados</div>
                <div className="text-white text-xl md:text-2xl font-bold">{callsAsiste}/{totalCalls}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-3 md:p-4 border border-purple-500/30">
                <div className="text-purple-400 text-xs font-medium">Total</div>
                <div className="text-white text-xl md:text-2xl font-bold">{totalCalls}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Progreso Diario</span>
              <span className="text-white font-bold">{totalCalls > 0 ? Math.round((callsToday / totalCalls) * 100) : 0}%</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${totalCalls > 0 ? Math.min((callsToday / totalCalls) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-slate-700">
          {/* Level Selector */}
          <div className="flex gap-1 md:gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedLevel('BASIC')}
              className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm md:text-base ${
                selectedLevel === 'BASIC'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              🌱 Básico
            </button>
            <button
              onClick={() => setSelectedLevel('ADVANCED')}
              className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm md:text-base ${
                selectedLevel === 'ADVANCED'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              🔥 Avanzado
            </button>
            <button
              onClick={() => setSelectedLevel('PL')}
              className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm md:text-base ${
                selectedLevel === 'PL'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              👑 Liderato
            </button>
          </div>

          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 md:py-3 text-sm md:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3">
            {/* Filtros de checkbox */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-600 hover:border-purple-500 transition-all">
                <input
                  type="checkbox"
                  checked={filterMyList}
                  onChange={(e) => setFilterMyList(e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-white text-xs md:text-sm font-medium">Mi Lista</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-600 hover:border-green-500 transition-all">
                <input
                  type="checkbox"
                  checked={filterActiveHours}
                  onChange={(e) => setFilterActiveHours(e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
                <span className="text-white text-xs md:text-sm font-medium">🕒 Solo Disponibles</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-3 md:px-4 py-2 md:py-3 rounded-lg border border-red-500/50 hover:border-red-500 transition-all">
                <input
                  type="checkbox"
                  checked={excludeUnpaid}
                  onChange={(e) => setExcludeUnpaid(e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5 accent-red-500"
                />
                <span className="text-white text-xs md:text-sm font-medium">💳 Excluir Sin Pago</span>
              </label>
            </div>

            {/* Filtros por status de asistencia */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterByStatus('ALL')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm ${
                  filterByStatus === 'ALL'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                📋 Todos
              </button>
              <button
                onClick={() => setFilterByStatus('PENDING')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm ${
                  filterByStatus === 'PENDING'
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ⏳ Pendientes
              </button>
              <button
                onClick={() => setFilterByStatus('ASISTE')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm ${
                  filterByStatus === 'ASISTE'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ✅ Asisten
              </button>
              <button
                onClick={() => setFilterByStatus('NO_ASISTE')}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap text-sm ${
                  filterByStatus === 'NO_ASISTE'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ❌ No Asisten
              </button>
            </div>
          </div>
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
                      <div className="flex flex-col gap-2 items-end">
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
                        
                        {/* Payment Status Badge */}
                        {item.usuario.paymentStatus && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.usuario.paymentStatus === 'PAID'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : item.usuario.paymentStatus === 'PARTIAL'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : item.usuario.paymentStatus === 'UNPAID'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                          }`}>
                            {item.usuario.paymentStatus === 'PAID' ? '💳 PAGADO' 
                              : item.usuario.paymentStatus === 'PARTIAL' ? '⏳ PARCIAL'
                              : item.usuario.paymentStatus === 'UNPAID' ? '⚠️ SIN PAGO'
                              : '📭 SIN TICKET'}
                          </span>
                        )}
                      </div>
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

                    {/* Apodo / Nickname */}
                    {item.usuario.apodo && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">💫 Le gusta que le digan</div>
                        <div className="text-white text-sm font-medium">{item.usuario.apodo}</div>
                      </div>
                    )}

                    {/* Expectativas del entrenamiento */}
                    {item.usuario.expectations && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">🎯 Qué espera del entrenamiento</div>
                        <div className="text-white text-sm italic">"{item.usuario.expectations}"</div>
                      </div>
                    )}

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
                            {item.tracking?.preferredCallTimeStart && item.tracking?.preferredCallTimeEnd
                              ? `${item.tracking.preferredCallTimeStart} - ${item.tracking.preferredCallTimeEnd}`
                              : (item.usuario as any).horarioLlamada || 'No definido'}
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
                    {(item.angelEnrolamiento || item.usuario.invitedByUser || item.usuario.invitedByText) && (
                      <div>
                        <div className="text-slate-400 text-xs mb-1">😇 Invitado por</div>
                        <div className="text-white text-sm">
                          {item.angelEnrolamiento?.nombre || item.usuario.invitedByUser?.nombre || item.usuario.invitedByText || 'No especificado'}
                        </div>
                        {item.usuario.invitedByUser?.vision && (
                          <div className="text-cyan-400 text-xs mt-1">
                            Visión: {item.usuario.invitedByUser.vision}
                          </div>
                        )}
                        {item.usuario.invitedByUser?.telefono && (
                          <button
                            onClick={() => {
                              setSelectedContact({
                                nombre: item.usuario.invitedByUser!.nombre,
                                telefono: item.usuario.invitedByUser!.telefono!
                              });
                              setContactModalOpen(true);
                            }}
                            className="mt-2 flex items-center gap-2 text-green-400 hover:text-green-300 text-xs transition-colors"
                          >
                            📞 {item.usuario.invitedByUser.telefono}
                          </button>
                        )}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border-2 border-purple-500/50 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto my-4">
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-slate-700 sticky top-0 z-10">
              <h2 className="text-2xl font-black text-white">
                📞 Resultado de la Llamada
              </h2>
              <p className="text-slate-400 mt-1">{selectedCard.usuario.nombre}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Botón de Llamar */}
              {selectedCard.usuario.telefono && (
                <a
                  href={`tel:${selectedCard.usuario.telefono}`}
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl py-4 font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span className="text-2xl">📞</span>
                  Llamar ahora
                  <span className="text-sm font-normal opacity-90">({selectedCard.usuario.telefono})</span>
                </a>
              )}
              
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

              {/* Campo de fecha para reagendar */}
              {callResult === 'RESCHEDULED' && (
                <div className="animate-fadeIn">
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    📅 Fecha y Hora para Reagendar
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-blue-500/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Información del invitador cuando es número erróneo */}
              {callResult === 'WRONG_NUMBER' && (
                <div className="animate-fadeIn bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="text-orange-400 text-sm font-medium mb-3">
                    😇 Contactar a quien lo invitó
                  </div>
                  {selectedCard.angelEnrolamiento ? (
                    <>
                      <div className="text-white text-lg font-bold mb-2">
                        {selectedCard.angelEnrolamiento.nombre}
                      </div>
                      <div className="text-slate-300 text-sm mb-3">
                        {selectedCard.angelEnrolamiento.email}
                      </div>
                      {selectedCard.angelEnrolamiento.telefono ? (
                        <a
                          href={`tel:${selectedCard.angelEnrolamiento.telefono}`}
                          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg py-3 font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          <span className="text-xl">📞</span>
                          Llamar a {selectedCard.angelEnrolamiento.nombre.split(' ')[0]}
                          <span className="text-sm font-normal opacity-90">
                            ({selectedCard.angelEnrolamiento.telefono})
                          </span>
                        </a>
                      ) : (
                        <div className="text-slate-400 text-sm text-center py-2">
                          No hay teléfono registrado para esta persona
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-400 text-sm text-center py-2">
                      No se encontró información de quien invitó a este usuario
                    </div>
                  )}
                </div>
              )}

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

      {/* Modal de Confirmación de Asistencia */}
      {showAttendanceConfirm && selectedCard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">✅</span>
                Confirmación de Asistencia
              </h2>
              <p className="text-green-100 text-sm mt-2">
                {selectedCard.usuario.nombre} contestó la llamada
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-slate-300 text-center mb-6 text-lg">
                ¿Confirmó que va a asistir al entrenamiento?
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAttendanceConfirm(true)}
                  className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2"
                >
                  <span className="text-3xl">✅</span>
                  <span>Sí Asiste</span>
                </button>
                
                <button
                  onClick={() => handleAttendanceConfirm(false)}
                  className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2"
                >
                  <span className="text-3xl">❌</span>
                  <span>No Asiste</span>
                </button>
              </div>

              <button
                onClick={() => setShowAttendanceConfirm(false)}
                className="w-full mt-4 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contacto */}
      {contactModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border-2 border-purple-500 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Contactar</h3>
                  <p className="text-slate-300">{selectedContact.nombre}</p>
                </div>
                <button
                  onClick={() => setContactModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <div className="text-slate-400 text-sm mb-2">Teléfono</div>
                <div className="text-white text-2xl font-mono font-bold">
                  {selectedContact.telefono}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${selectedContact.telefono.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
                >
                  <span className="text-2xl">💬</span>
                  <span>Enviar WhatsApp</span>
                </a>

                {/* Llamar */}
                <a
                  href={`tel:${selectedContact.telefono}`}
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                >
                  <span className="text-2xl">📞</span>
                  <span>Llamar Ahora</span>
                </a>

                {/* Copiar */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedContact.telefono);
                    alert('📋 Teléfono copiado al portapapeles');
                  }}
                  className="flex items-center justify-center gap-3 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
                >
                  <span className="text-2xl">📋</span>
                  <span>Copiar Número</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
