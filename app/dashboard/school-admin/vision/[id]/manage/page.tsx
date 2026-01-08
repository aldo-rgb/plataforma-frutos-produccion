'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  coordinadorId: number;
  isActive: boolean;
  enabledLevels: string[];
  startDate: string | null;
  endDate: string | null;
  maxParticipantes: number;
  coordinador?: {
    id: number;
    nombre: string;
    email: string;
  };
  _count?: {
    Participantes: number;
    GameChangers: number;
  };
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

interface Participante {
  id: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    profileImage?: string;
  };
  enrolledAt: string;
  currentLevel: string;
}

interface GameChanger {
  id: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    profileImage?: string;
  };
  assignedAt: string;
}

export default function VisionManagePage() {
  const params = useParams();
  const router = useRouter();
  const visionId = params.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'avanzado' | 'liderato' | 'fechas' | 'staff' | 'gamechangers' | 'qr'>('info');
  
  // Toast notification state
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // Estados para coordinadores y trainers
  const [coordinadores, setCoordinadores] = useState<Usuario[]>([]);
  const [trainers, setTrainers] = useState<Usuario[]>([]);
  
  // Estados para participantes y game changers
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [gameChangers, setGameChangers] = useState<GameChanger[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [loadingGameChangers, setLoadingGameChangers] = useState(false);
  
  // Estado para registros del nivel BÁSICO
  const [basicEnrollments, setBasicEnrollments] = useState<any[]>([]);
  const [loadingBasicEnrollments, setLoadingBasicEnrollments] = useState(false);
  
  // Estado para registros del nivel AVANZADO
  const [advancedEnrollments, setAdvancedEnrollments] = useState<any[]>([]);
  const [loadingAdvancedEnrollments, setLoadingAdvancedEnrollments] = useState(false);
  
  // Estado para registros del nivel LIDERATO (PL)
  const [plEnrollments, setPlEnrollments] = useState<any[]>([]);
  const [loadingPlEnrollments, setLoadingPlEnrollments] = useState(false);
  
  // Estados para edición
  const [editingDates, setEditingDates] = useState(false);
  const [dateData, setDateData] = useState({
    basicStartDate: '',
    basicEndDate: '',
    advancedStartDate: '',
    advancedEndDate: '',
    plWeekends: [] as Array<{name: string; startDate: string; endDate: string}>
  });
  
  // Estados para staff
  const [staffData, setStaffData] = useState({
    basicCoordinatorId: '',
    basicTrainerId: '',
    advancedCoordinatorId: '',
    advancedTrainerId: '',
    plCoordinatorId: '',
    plTrainers: ['', '', ''] // 3 trainers para 3 fines de semana
  });
  
  // Estados para modal de Game Changers
  const [showGameChangerModal, setShowGameChangerModal] = useState(false);
  const [newGameChangerData, setNewGameChangerData] = useState({
    nombre: '',
    email: '',
    level: 'BASIC', // Default level
  });

  // Estados para QR
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    fetchVisionData();
    fetchCoordinadores();
    fetchParticipantes();
    fetchGameChangers();
    fetchStaffData(); // Cargar staff existente
    generateQR(); // Generar QR automáticamente
    fetchBasicEnrollments(); // Cargar registros del nivel BÁSICO
    fetchAdvancedEnrollments(); // Cargar registros del nivel AVANZADO
    fetchPlEnrollments(); // Cargar registros del nivel LIDERATO
  }, [visionId]);

  const fetchVisionData = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}`);
      const data = await res.json();
      
      if (data.success) {
        setVision(data.vision);
        
        // Cargar todas las fechas de la visión desde la base de datos
        setDateData({
          basicStartDate: data.vision.startDate ? data.vision.startDate.split('T')[0] : '',
          basicEndDate: data.vision.endDate ? data.vision.endDate.split('T')[0] : '',
          advancedStartDate: data.vision.advancedStartDate ? data.vision.advancedStartDate.split('T')[0] : '',
          advancedEndDate: data.vision.advancedEndDate ? data.vision.advancedEndDate.split('T')[0] : '',
          plWeekends: [
            {
              name: 'Fin de Semana 1',
              startDate: data.vision.plWeekend1StartDate ? data.vision.plWeekend1StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend1EndDate ? data.vision.plWeekend1EndDate.split('T')[0] : '',
            },
            {
              name: 'Fin de Semana 2',
              startDate: data.vision.plWeekend2StartDate ? data.vision.plWeekend2StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend2EndDate ? data.vision.plWeekend2EndDate.split('T')[0] : '',
            },
            {
              name: 'Graduación',
              startDate: data.vision.plWeekend3StartDate ? data.vision.plWeekend3StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend3EndDate ? data.vision.plWeekend3EndDate.split('T')[0] : '',
            },
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinadores = async () => {
    try {
      const res = await fetch('/api/school-admin/coordinadores');
      const data = await res.json();
      
      if (data.success) {
        setCoordinadores(data.coordinadores.filter((u: Usuario) => 
          ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINADOR'].includes(u.rol)
        ));
        setTrainers(data.coordinadores.filter((u: Usuario) => u.rol === 'TRAINER'));
      }
    } catch (error) {
      console.error('Error fetching coordinadores:', error);
    }
  };

  const fetchParticipantes = async () => {
    try {
      setLoadingParticipantes(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/participantes`);
      const data = await res.json();
      
      if (data.success) {
        setParticipantes(data.participantes || []);
      }
    } catch (error) {
      console.error('Error fetching participantes:', error);
    } finally {
      setLoadingParticipantes(false);
    }
  };

  const fetchGameChangers = async () => {
    try {
      setLoadingGameChangers(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/gamechangers`);
      const data = await res.json();
      
      if (data.success) {
        setGameChangers(data.gameChangers || []);
      }
    } catch (error) {
      console.error('Error fetching game changers:', error);
    } finally {
      setLoadingGameChangers(false);
    }
  };

  const fetchBasicEnrollments = async () => {
    try {
      setLoadingBasicEnrollments(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/basic-enrollments`);
      const data = await res.json();
      
      if (data.success) {
        setBasicEnrollments(data.enrollments || []);
      }
    } catch (error) {
      console.error('Error fetching basic enrollments:', error);
    } finally {
      setLoadingBasicEnrollments(false);
    }
  };

  const fetchAdvancedEnrollments = async () => {
    try {
      setLoadingAdvancedEnrollments(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/advanced-enrollments`);
      const data = await res.json();
      
      if (data.success) {
        setAdvancedEnrollments(data.enrollments || []);
      }
    } catch (error) {
      console.error('Error fetching advanced enrollments:', error);
    } finally {
      setLoadingAdvancedEnrollments(false);
    }
  };

  const fetchPlEnrollments = async () => {
    try {
      setLoadingPlEnrollments(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/pl-enrollments`);
      const data = await res.json();
      
      if (data.success) {
        setPlEnrollments(data.enrollments || []);
      }
    } catch (error) {
      console.error('Error fetching PL enrollments:', error);
    } finally {
      setLoadingPlEnrollments(false);
    }
  };

  const fetchStaffData = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/staff`);
      const data = await res.json();
      
      console.log('🔍 STAFF API RESPONSE:', data);
      console.log('🔍 Staff Data:', data.data);
      
      if (data.success && data.data) {
        console.log('✅ Setting staff data:', data.data);
        setStaffData(data.data);
      } else {
        console.log('❌ Staff data not found or success = false');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleOpenGameChangerModal = (level?: string) => {
    setShowGameChangerModal(true);
    setNewGameChangerData({ nombre: '', email: '', level: level || 'BASIC' });
  };

  const handleRegisterGameChanger = async () => {
    // Validaciones
    if (!newGameChangerData.nombre || !newGameChangerData.email) {
      setToast({show: true, message: 'Por favor completa nombre y email', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newGameChangerData.email)) {
      setToast({show: true, message: 'Por favor ingresa un email válido', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
      return;
    }

    try {
      // Crear o convertir usuario a Game Changer
      const createRes = await fetch('/api/school-admin/create-gamechanger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newGameChangerData),
      });

      const createData = await createRes.json();

      if (!createData.success) {
        setToast({show: true, message: createData.error || 'Error al crear Game Changer', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
        return;
      }

      const gameChangerId = createData.userId;

      // Asignar Game Changer a la visión with level
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-gamechangers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameChangerIds: [gameChangerId],
          level: newGameChangerData.level || 'BASIC' // Include level
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({show: true, message: 'Game Changer registrado exitosamente', type: 'success'});
        setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
        setShowGameChangerModal(false);
        setNewGameChangerData({ nombre: '', email: '', level: 'BASIC' });
        fetchGameChangers();
      } else {
        setToast({show: true, message: data.error || 'Error al registrar Game Changer', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
      }
    } catch (error) {
      console.error('Error registering game changer:', error);
      setToast({show: true, message: 'Error al registrar Game Changer', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
    }
  };

  const handleSaveDates = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Fechas de Básico
          startDate: dateData.basicStartDate ? new Date(dateData.basicStartDate).toISOString() : null,
          endDate: dateData.basicEndDate ? new Date(dateData.basicEndDate).toISOString() : null,
          // Fechas de Avanzado
          advancedStartDate: dateData.advancedStartDate ? new Date(dateData.advancedStartDate).toISOString() : null,
          advancedEndDate: dateData.advancedEndDate ? new Date(dateData.advancedEndDate).toISOString() : null,
          // Fechas de PL Weekend 1
          plWeekend1StartDate: dateData.plWeekends[0]?.startDate ? new Date(dateData.plWeekends[0].startDate).toISOString() : null,
          plWeekend1EndDate: dateData.plWeekends[0]?.endDate ? new Date(dateData.plWeekends[0].endDate).toISOString() : null,
          // Fechas de PL Weekend 2
          plWeekend2StartDate: dateData.plWeekends[1]?.startDate ? new Date(dateData.plWeekends[1].startDate).toISOString() : null,
          plWeekend2EndDate: dateData.plWeekends[1]?.endDate ? new Date(dateData.plWeekends[1].endDate).toISOString() : null,
          // Fechas de PL Weekend 3 (Graduación)
          plWeekend3StartDate: dateData.plWeekends[2]?.startDate ? new Date(dateData.plWeekends[2].startDate).toISOString() : null,
          plWeekend3EndDate: dateData.plWeekends[2]?.endDate ? new Date(dateData.plWeekends[2].endDate).toISOString() : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({show: true, message: 'Fechas actualizadas exitosamente', type: 'success'});
        setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
        setEditingDates(false);
        fetchVisionData(); // Recargar datos
      } else {
        setToast({show: true, message: data.error || 'No se pudieron actualizar las fechas', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
      }
    } catch (error) {
      console.error('Error updating dates:', error);
      setToast({show: true, message: 'Error al actualizar las fechas', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
    }
  };

  const handleToggleEditDates = () => {
    if (editingDates) {
      // Si está guardando, ejecutar la función de guardar
      handleSaveDates();
    } else {
      // Solo activar el modo edición, sin sobrescribir el estado
      setEditingDates(true);
    }
  };

  const handleSaveStaff = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/staff`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      });

      const data = await res.json();

      if (data.success) {
        setToast({show: true, message: 'Configuración de staff actualizada exitosamente', type: 'success'});
        setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
      } else {
        setToast({show: true, message: data.error || 'No se pudo actualizar el staff', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      setToast({show: true, message: 'Error al actualizar el staff', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
    }
  };

  const generateQR = async () => {
    setGeneratingQR(true);
    try {
      console.log('🎨 Iniciando generación de QR...');
      
      // Crear la URL de registro con el ID de la visión
      const registrationURL = `${window.location.origin}/dashboard/program/enroll?visionId=${visionId}`;
      console.log('📍 URL del QR:', registrationURL);
      
      // Importar QRCode dinámicamente
      console.log('📦 Importando biblioteca QRCode...');
      const QRCodeModule = await import('qrcode');
      const QRCode = QRCodeModule.default || QRCodeModule;
      console.log('✅ QRCode importado:', typeof QRCode);
      
      // Generar el QR como data URL
      console.log('🔨 Generando código QR...');
      const qrDataUrl = await QRCode.toDataURL(registrationURL, {
        width: 512,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      console.log('✅ QR generado exitosamente, longitud:', qrDataUrl.length);
      setQrDataURL(qrDataUrl);
      setToast({show: true, message: 'QR generado exitosamente', type: 'success'});
      setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
    } catch (error) {
      console.error('❌ Error generating QR:', error);
      console.error('Error detallado:', JSON.stringify(error, null, 2));
      setToast({show: true, message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
    } finally {
      setGeneratingQR(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataURL) {
      setToast({show: true, message: 'Primero genera el QR', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `vision-${vision?.nombre || visionId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToast({show: true, message: 'QR descargado exitosamente', type: 'success'});
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  if (!vision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Visión no encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border min-w-[360px] max-w-md ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500/95 to-green-500/95 border-emerald-300/50 shadow-emerald-500/20' 
              : 'bg-gradient-to-r from-red-500/95 to-rose-500/95 border-red-300/50 shadow-red-500/20'
          }`}>
            {toast.type === 'success' ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white font-semibold text-sm leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({show: false, message: '', type: 'success'})}
              className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-all active:scale-95"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 mb-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard/school-admin/visiones')}
                className="text-blue-100 hover:text-white mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                ← Volver a Visiones
              </button>
              <h1 className="text-4xl font-black text-white mb-2">
                🎯 {vision.nombre}
              </h1>
              <p className="text-blue-100">
                {vision.descripcion || 'Gestión completa de la visión'}
              </p>
              <div className="flex gap-3 mt-4">
                {vision.enabledLevels.map(level => (
                  <span
                    key={level}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-bold"
                  >
                    {level === 'BASIC' ? '🌱 Básico' : level === 'ADVANCED' ? '🔥 Avanzado' : '👑 PL'}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm mb-1">Participantes</div>
              <div className="text-5xl font-black text-white">{vision.maxParticipantes}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-2 mb-6 flex gap-2 overflow-x-auto">
          {[
            { id: 'info', label: '🌱 Básico', icon: '🌱' },
            { id: 'avanzado', label: '🔥 Avanzado', icon: '🔥' },
            { id: 'liderato', label: '👑 Liderato', icon: '👑' },
            { id: 'fechas', label: '📅 Fechas', icon: '📅' },
            { id: 'staff', label: '👥 Coordinadores', icon: '👥' },
            { id: 'gamechangers', label: '⭐ Game Changers', icon: '⭐' },
            { id: 'qr', label: '📱 QR Code', icon: '📱' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          {/* Tab: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-4">📋 Información General</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Nombre de la Visión</label>
                  <div className="text-white text-lg font-bold">{vision.nombre}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Inicio</label>
                  <div className="text-white text-lg font-bold">
                    {vision.startDate ? new Date(vision.startDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Finalización</label>
                  <div className="text-white text-lg font-bold">
                    {vision.endDate ? new Date(vision.endDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>
              </div>

              {/* Lista de Game Changers BÁSICO */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900/50 rounded-xl border-2 border-yellow-500/30 overflow-hidden">
                <div className="bg-yellow-900/40 p-6 border-b border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
                        ⭐
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-yellow-300">Game Changers - Nivel BÁSICO</h3>
                        <p className="text-yellow-400/60 text-sm">
                          {gameChangers.filter((gc: any) => gc.level === 'BASIC').length} participantes destacados
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenGameChangerModal('BASIC')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold text-sm transition-all"
                    >
                      ➕ Registrar Game Changer
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingGameChangers ? (
                    <div className="text-center py-8 text-slate-400">Cargando game changers...</div>
                  ) : gameChangers.filter((gc: any) => gc.level === 'BASIC').length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⭐</div>
                      <p className="text-slate-400 text-lg">No hay Game Changers de BÁSICO registrados aún</p>
                      <p className="text-slate-500 text-sm mt-2">Registra Game Changers para el nivel Básico</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gameChangers.filter((gc: any) => gc.level === 'BASIC').map((gc: any) => (
                        <div
                          key={gc.id}
                          className="bg-slate-900/50 rounded-lg p-4 border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-full"></div>
                          <div className="absolute top-2 right-2 text-2xl">⭐</div>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              <div className="text-yellow-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Registros Nivel BÁSICO */}
              <div className="bg-gradient-to-br from-green-900/30 to-slate-900/50 rounded-xl border-2 border-green-500/30 overflow-hidden">
                <div className="bg-green-900/40 p-6 border-b border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
                        🌱
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-green-300">Registros Nivel BÁSICO</h3>
                        <p className="text-green-400/60 text-sm">
                          {basicEnrollments.length} usuario(s) registrado(s) desde el signup
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=BASIC`)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <span>📞</span> Gestión de Llamadas
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingBasicEnrollments ? (
                    <div className="text-center py-8 text-slate-400">Cargando registros...</div>
                  ) : basicEnrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🌱</div>
                      <p className="text-slate-400 text-lg">No hay registros aún</p>
                      <p className="text-slate-500 text-sm mt-2">Los usuarios que se registren aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-green-500/20">
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Usuario</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Organización</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {basicEnrollments.map((enrollment) => (
                            <tr 
                              key={enrollment.id}
                              className="border-b border-slate-700/50 hover:bg-green-500/5 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {enrollment.Usuario?.nombre?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white font-bold">{enrollment.Usuario?.nombre}</div>
                                    <div className="text-slate-400 text-xs">ID: {enrollment.userId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">{enrollment.Usuario?.email}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.Organization?.name || 'N/A'}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  ID: {enrollment.Usuario?.organizationId}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  {new Date(enrollment.enrolledAt).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  enrollment.enrollmentStatus === 'ENROLLED' 
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>
                                  {enrollment.enrollmentStatus === 'ENROLLED' ? '✅ Inscrito' : '⏳ Pendiente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Avanzado */}
          {activeTab === 'avanzado' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-4">🔥 Nivel Avanzado</h2>
              
              {/* Game Changers AVANZADO - Agregar aquí */}
              <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl border-2 border-orange-500/30 overflow-hidden">
                <div className="bg-orange-900/40 p-6 border-b border-orange-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-2xl">
                        ⭐
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-orange-300">Game Changers - Nivel AVANZADO</h3>
                        <p className="text-orange-400/60 text-sm">
                          {gameChangers.filter((gc: any) => gc.level === 'ADVANCED').length} participantes destacados
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenGameChangerModal('ADVANCED')}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm transition-all"
                    >
                      ➕ Registrar Game Changer
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingGameChangers ? (
                    <div className="text-center py-8 text-slate-400">Cargando game changers...</div>
                  ) : gameChangers.filter((gc: any) => gc.level === 'ADVANCED').length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⭐</div>
                      <p className="text-slate-400 text-lg">No hay Game Changers de AVANZADO registrados aún</p>
                      <p className="text-slate-500 text-sm mt-2">Registra Game Changers para el nivel Avanzado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gameChangers.filter((gc: any) => gc.level === 'ADVANCED').map((gc: any) => (
                        <div
                          key={gc.id}
                          className="bg-slate-900/50 rounded-lg p-4 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full"></div>
                          <div className="absolute top-2 right-2 text-2xl">⭐</div>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              <div className="text-orange-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Registros Nivel AVANZADO */}
              <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl border-2 border-orange-500/30 overflow-hidden">
                <div className="bg-orange-900/40 p-6 border-b border-orange-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-2xl">
                        🔥
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-orange-300">Registros Nivel AVANZADO</h3>
                        <p className="text-orange-400/60 text-sm">
                          {advancedEnrollments.length} usuario(s) registrado(s) desde el signup
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=ADVANCED`)}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <span>📞</span> Gestión de Llamadas
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingAdvancedEnrollments ? (
                    <div className="text-center py-8 text-slate-400">Cargando registros...</div>
                  ) : advancedEnrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔥</div>
                      <p className="text-slate-400 text-lg">No hay registros aún</p>
                      <p className="text-slate-500 text-sm mt-2">Los usuarios que se registren aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-orange-500/20">
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Usuario</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Organización</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advancedEnrollments.map((enrollment) => (
                            <tr 
                              key={enrollment.id}
                              className="border-b border-slate-700/50 hover:bg-orange-500/5 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {enrollment.Usuario?.nombre?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white font-bold">{enrollment.Usuario?.nombre}</div>
                                    <div className="text-slate-400 text-xs">ID: {enrollment.userId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">{enrollment.Usuario?.email}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.Organization?.name || 'N/A'}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  ID: {enrollment.Usuario?.organizationId}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  {new Date(enrollment.enrolledAt).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  enrollment.enrollmentStatus === 'ENROLLED' 
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>
                                  {enrollment.enrollmentStatus === 'ENROLLED' ? '✅ Inscrito' : '⏳ Pendiente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Liderato */}
          {activeTab === 'liderato' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-4">👑 Nivel Liderato</h2>
              
              {/* Game Changers LIDERATO */}
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-xl border-2 border-purple-500/30 overflow-hidden">
                <div className="bg-purple-900/40 p-6 border-b border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
                        ⭐
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-purple-300">Game Changers - Nivel LIDERATO</h3>
                        <p className="text-purple-400/60 text-sm">
                          {gameChangers.filter((gc: any) => gc.level === 'PL').length} participantes destacados
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenGameChangerModal('PL')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-all"
                    >
                      ➕ Registrar Game Changer
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingGameChangers ? (
                    <div className="text-center py-8 text-slate-400">Cargando game changers...</div>
                  ) : gameChangers.filter((gc: any) => gc.level === 'PL').length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⭐</div>
                      <p className="text-slate-400 text-lg">No hay Game Changers de LIDERATO registrados aún</p>
                      <p className="text-slate-500 text-sm mt-2">Registra Game Changers para el nivel Liderato</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gameChangers.filter((gc: any) => gc.level === 'PL').map((gc: any) => (
                        <div
                          key={gc.id}
                          className="bg-slate-900/50 rounded-lg p-4 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full"></div>
                          <div className="absolute top-2 right-2 text-2xl">⭐</div>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              <div className="text-purple-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Registros Nivel LIDERATO */}
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-xl border-2 border-purple-500/30 overflow-hidden">
                <div className="bg-purple-900/40 p-6 border-b border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
                        👑
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-purple-300">Registros Nivel LIDERATO</h3>
                        <p className="text-purple-400/60 text-sm">
                          {plEnrollments.length} usuario(s) registrado(s) desde el signup
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=PL`)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                      <span>📞</span> Gestión de Llamadas
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingPlEnrollments ? (
                    <div className="text-center py-8 text-slate-400">Cargando registros...</div>
                  ) : plEnrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">👑</div>
                      <p className="text-slate-400 text-lg">No hay registros aún</p>
                      <p className="text-slate-500 text-sm mt-2">Los usuarios que se registren aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-purple-500/20">
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Usuario</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Organización</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plEnrollments.map((enrollment) => (
                            <tr 
                              key={enrollment.id}
                              className="border-b border-slate-700/50 hover:bg-purple-500/5 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {enrollment.Usuario?.nombre?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white font-bold">{enrollment.Usuario?.nombre}</div>
                                    <div className="text-slate-400 text-xs">ID: {enrollment.userId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">{enrollment.Usuario?.email}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.Organization?.name || 'N/A'}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  ID: {enrollment.Usuario?.organizationId}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  {new Date(enrollment.enrolledAt).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  enrollment.enrollmentStatus === 'ENROLLED' 
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>
                                  {enrollment.enrollmentStatus === 'ENROLLED' ? '✅ Inscrito' : '⏳ Pendiente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Fechas */}
          {activeTab === 'fechas' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-4">📅 Gestión de Fechas</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Nombre de la Visión</label>
                  <div className="text-white text-lg font-bold">{vision.nombre}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Inicio</label>
                  <div className="text-white text-lg font-bold">
                    {vision.startDate ? new Date(vision.startDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Finalización</label>
                  <div className="text-white text-lg font-bold">
                    {vision.endDate ? new Date(vision.endDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>
              </div>

              {/* Lista de Participantes */}
              <div className="bg-gradient-to-br from-blue-900/30 to-slate-900/50 rounded-xl border-2 border-blue-500/30 overflow-hidden">
                <div className="bg-blue-900/40 p-6 border-b border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
                        👥
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-blue-300">Participantes</h3>
                        <p className="text-blue-400/60 text-sm">
                          {participantes.length} usuarios inscritos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingParticipantes ? (
                    <div className="text-center py-8 text-slate-400">Cargando participantes...</div>
                  ) : participantes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">👥</div>
                      <p className="text-slate-400 text-lg">No hay participantes inscritos</p>
                      <p className="text-slate-500 text-sm mt-2">Los participantes aparecerán aquí una vez inscritos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {participantes.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-900/50 rounded-lg p-4 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {p.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate text-lg">{p.usuario.nombre}</div>
                              <div className="text-slate-400 text-xs truncate">{p.usuario.email}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Game Changers */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900/50 rounded-xl border-2 border-yellow-500/30 overflow-hidden">
                <div className="bg-yellow-900/40 p-6 border-b border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
                        ⭐
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-yellow-300">Game Changers</h3>
                        <p className="text-yellow-400/60 text-sm">
                          {gameChangers.length} participantes destacados
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold text-sm transition-all">
                      ➕ Registrar Game Changer
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingGameChangers ? (
                    <div className="text-center py-8 text-slate-400">Cargando game changers...</div>
                  ) : gameChangers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⭐</div>
                      <p className="text-slate-400 text-lg">No hay Game Changers registrados aún</p>
                      <p className="text-slate-500 text-sm mt-2">Los Game Changers son participantes destacados de la visión</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gameChangers.map((gc) => (
                        <div
                          key={gc.id}
                          className="bg-slate-900/50 rounded-lg p-4 border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-full"></div>
                          <div className="absolute top-2 right-2 text-2xl">⭐</div>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              <div className="text-yellow-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Fechas */}
          {activeTab === 'fechas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">📅 Gestión de Fechas</h2>
                <button
                  onClick={handleToggleEditDates}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  {editingDates ? '💾 Guardar' : '✏️ Editar Fechas'}
                </button>
              </div>

              {/* Nivel Básico */}
              <div className="bg-gradient-to-br from-green-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-green-500/30">
                <h3 className="text-xl font-black text-green-400 mb-4 flex items-center gap-2">
                  🌱 Nivel Básico
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Fecha de Inicio</label>
                    {editingDates ? (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.basicStartDate}
                        onChange={(e) => setDateData({...dateData, basicStartDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {vision?.startDate ? new Date(vision.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No definida'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Fecha de Fin</label>
                    {editingDates ? (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.basicEndDate}
                        onChange={(e) => setDateData({...dateData, basicEndDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {vision?.endDate ? new Date(vision.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No definida'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nivel Avanzado */}
              <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-orange-500/30">
                <h3 className="text-xl font-black text-orange-400 mb-4 flex items-center gap-2">
                  🔥 Nivel Avanzado
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Fecha de Inicio</label>
                    {editingDates ? (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.advancedStartDate}
                        onChange={(e) => setDateData({...dateData, advancedStartDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.advancedStartDate ? new Date(dateData.advancedStartDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No definida'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">Fecha de Fin</label>
                    {editingDates ? (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.advancedEndDate}
                        onChange={(e) => setDateData({...dateData, advancedEndDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.advancedEndDate ? new Date(dateData.advancedEndDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No definida'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fines de Semana PL */}
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-purple-500/30">
                <h3 className="text-xl font-black text-purple-400 mb-4 flex items-center gap-2">
                  👑 Programa Liderato - Fines de Semana
                </h3>
                <div className="space-y-4">
                  {dateData.plWeekends.map((weekend, index) => (
                    <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                      <h4 className="text-white font-bold mb-3">
                        {weekend.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-slate-400 text-sm mb-2 block">Inicio</label>
                          {editingDates ? (
                            <input
                              type="date"
                              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                              value={weekend.startDate}
                              onChange={(e) => {
                                const newWeekends = [...dateData.plWeekends];
                                newWeekends[index].startDate = e.target.value;
                                setDateData({...dateData, plWeekends: newWeekends});
                              }}
                            />
                          ) : (
                            <div className="text-white">
                              {weekend.startDate ? new Date(weekend.startDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Por definir'}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-400 text-sm mb-2 block">Fin</label>
                          {editingDates ? (
                            <input
                              type="date"
                              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                              value={weekend.endDate}
                              onChange={(e) => {
                                const newWeekends = [...dateData.plWeekends];
                                newWeekends[index].endDate = e.target.value;
                                setDateData({...dateData, plWeekends: newWeekends});
                              }}
                            />
                          ) : (
                            <div className="text-white">
                              {weekend.endDate ? new Date(weekend.endDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Por definir'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Staff */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-6">👥 Gestión de Staff</h2>

              {/* Coordinador Básico */}
              <div className="bg-gradient-to-br from-green-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-green-500/30">
                <h3 className="text-xl font-black text-green-400 mb-4">🌱 Coordinador Nivel Básico</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                  value={staffData.basicCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, basicCoordinatorId: e.target.value})}
                >
                  <option value="">Seleccionar coordinador...</option>
                  {coordinadores
                    .filter(c => c.rol === 'COORDINATOR_BASIC')
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} - {c.email}</option>
                    ))}
                </select>
              </div>

              {/* Trainer Básico */}
              <div className="bg-gradient-to-br from-green-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-green-500/30">
                <h3 className="text-xl font-black text-green-400 mb-4">🎯 Trainer Nivel Básico</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                  value={staffData.basicTrainerId}
                  onChange={(e) => setStaffData({...staffData, basicTrainerId: e.target.value})}
                >
                  <option value="">Seleccionar trainer...</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} - {t.email}</option>
                  ))}
                </select>
              </div>

              {/* Coordinador Avanzado */}
              <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-orange-500/30">
                <h3 className="text-xl font-black text-orange-400 mb-4">🔥 Coordinador Nivel Avanzado</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                  value={staffData.advancedCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, advancedCoordinatorId: e.target.value})}
                >
                  <option value="">Seleccionar coordinador...</option>
                  {coordinadores
                    .filter(c => c.rol === 'COORDINATOR_ADVANCED')
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} - {c.email}</option>
                    ))}
                </select>
              </div>

              {/* Trainer Avanzado */}
              <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-orange-500/30">
                <h3 className="text-xl font-black text-orange-400 mb-4">🎯 Trainer Nivel Avanzado</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                  value={staffData.advancedTrainerId}
                  onChange={(e) => setStaffData({...staffData, advancedTrainerId: e.target.value})}
                >
                  <option value="">Seleccionar trainer...</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} - {t.email}</option>
                  ))}
                </select>
              </div>

              {/* Coordinador Liderato */}
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-purple-500/30">
                <h3 className="text-xl font-black text-purple-400 mb-4">👑 Coordinador Programa Liderato</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                  value={staffData.plCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, plCoordinatorId: e.target.value})}
                >
                  <option value="">Seleccionar coordinador...</option>
                  {coordinadores.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.email}</option>
                  ))}
                </select>
              </div>

              {/* Trainers PL por fin de semana */}
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/50 rounded-xl p-6 border-2 border-purple-500/30">
                <h3 className="text-xl font-black text-purple-400 mb-4">👑 Trainers Programa Liderato</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((weekend, index) => {
                    const selectedTrainer = trainers.find(t => t.id.toString() === staffData.plTrainers[index]);
                    
                    return (
                      <div key={weekend} className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                        <label className="text-white font-bold mb-2 block">
                          Fin de Semana {weekend} {weekend === 3 && '(Graduación)'}
                        </label>
                        
                        {/* Mostrar trainer actual si existe */}
                        {selectedTrainer && (
                          <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-xl">
                                👤
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-semibold">{selectedTrainer.nombre}</p>
                                <p className="text-purple-300 text-sm">{selectedTrainer.email}</p>
                              </div>
                              <div className="text-xs text-purple-400 font-medium">
                                ✓ Asignado
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <select 
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                          value={staffData.plTrainers[index]}
                          onChange={(e) => {
                            const newTrainers = [...staffData.plTrainers];
                            newTrainers[index] = e.target.value;
                            setStaffData({...staffData, plTrainers: newTrainers});
                          }}
                        >
                          <option value="">Seleccionar trainer...</option>
                          {trainers.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={handleSaveStaff}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-black text-lg shadow-xl transition-all active:scale-[0.98]"
              >
                💾 Guardar Configuración de Staff
              </button>
            </div>
          )}

          {/* Tab: Game Changers */}
          {activeTab === 'gamechangers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">⭐ Game Changers</h2>
                <button 
                  onClick={() => handleOpenGameChangerModal()}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  ➕ Registrar Game Changer
                </button>
              </div>

              {loadingGameChangers ? (
                <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700 text-center">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <p className="text-slate-400">Cargando Game Changers...</p>
                </div>
              ) : gameChangers.length > 0 ? (
                <div className="grid gap-4">
                  {gameChangers.map((gc) => (
                    <div key={gc.id} className="bg-gradient-to-br from-yellow-900/20 to-slate-900/50 rounded-xl p-6 border-2 border-yellow-500/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-2xl">
                          {gc.usuario.profileImage ? (
                            <img src={gc.usuario.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            '⭐'
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{gc.usuario.nombre}</h3>
                          <p className="text-slate-400 text-sm">{gc.usuario.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-xs">Asignado</p>
                          <p className="text-slate-400 text-sm">{new Date(gc.assignedAt).toLocaleDateString('es-MX')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-700 text-center">
                  <div className="text-6xl mb-4">⭐</div>
                  <p className="text-slate-400 text-lg">No hay Game Changers registrados aún</p>
                  <p className="text-slate-500 text-sm mt-2">Los Game Changers son participantes destacados de la visión</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: QR Code */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white mb-6">📱 Código QR de la Visión</h2>

              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl p-12 border-2 border-blue-500/30 text-center">
                <div className="w-64 h-64 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl overflow-hidden">
                  {qrDataURL ? (
                    <img src={qrDataURL} alt="QR Code" className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-slate-400 text-6xl">📱</div>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  QR de Inscripción
                </h3>
                <p className="text-slate-400 mb-2">
                  Código único para esta visión: <span className="text-blue-400 font-mono">{vision.nombre}</span>
                </p>
                {qrDataURL && (
                  <p className="text-slate-500 text-sm mb-6 font-mono break-all px-12">
                    {`${window.location.origin}/dashboard/program/enroll?visionId=${visionId}`}
                  </p>
                )}

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      if (qrDataURL && navigator.share) {
                        fetch(qrDataURL)
                          .then(res => res.blob())
                          .then(blob => {
                            const file = new File([blob], `vision-${vision?.nombre || visionId}-qr.png`, { type: 'image/png' });
                            navigator.share({
                              title: `QR de ${vision?.nombre || 'Visión'}`,
                              text: `Inscríbete a ${vision?.nombre || 'esta visión'} escaneando este QR`,
                              files: [file]
                            }).catch(err => console.log('Error sharing:', err));
                          });
                      } else if (qrDataURL) {
                        // Fallback: copiar URL al portapapeles
                        const url = `${window.location.origin}/dashboard/program/enroll?visionId=${visionId}`;
                        navigator.clipboard.writeText(url);
                        setToast({show: true, message: 'Enlace copiado al portapapeles', type: 'success'});
                        setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
                      }
                    }}
                    disabled={!qrDataURL || generatingQR}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-xl transition-all"
                  >
                    🔗 Compartir
                  </button>
                  <button 
                    onClick={downloadQR}
                    disabled={!qrDataURL}
                    className="px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                  >
                    📥 Descargar QR
                  </button>
                </div>

                <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-300 text-sm">
                    💡 <strong>Tip:</strong> Este QR permitirá a los participantes inscribirse directamente a esta visión escaneándolo con su celular
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Game Changer */}
      {showGameChangerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-yellow-500/30 max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">⭐ Registrar Game Changer</h3>
                <p className="text-sm text-yellow-400 mt-1">
                  Nivel: {newGameChangerData.level === 'BASIC' ? '🌱 BÁSICO' : newGameChangerData.level === 'ADVANCED' ? '🔥 AVANZADO' : '👑 PL'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGameChangerModal(false);
                  setNewGameChangerData({ nombre: '', email: '', level: 'BASIC' });
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                Crea un nuevo usuario Game Changer para el nivel <strong className="text-yellow-400">{newGameChangerData.level}</strong>. Si el email ya existe, se asignará como Game Changer a este nivel.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-white font-bold block mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                    value={newGameChangerData.nombre}
                    onChange={(e) => setNewGameChangerData({...newGameChangerData, nombre: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-white font-bold block mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Ej: juan@example.com"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium"
                    value={newGameChangerData.email}
                    onChange={(e) => setNewGameChangerData({...newGameChangerData, email: e.target.value})}
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-xs">
                    🔑 <strong>Contraseña automática:</strong> Quantum123
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowGameChangerModal(false);
                  setNewGameChangerData({ nombre: '', email: '', level: 'BASIC' });
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterGameChanger}
                disabled={!newGameChangerData.nombre || !newGameChangerData.email}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
              >
                ⭐ Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
