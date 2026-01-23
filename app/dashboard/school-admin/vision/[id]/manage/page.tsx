'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircle, XCircle, X, Key } from 'lucide-react';

// Roles permitidos para acceder a esta página
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

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
  level?: string;
  isCaptain?: boolean;
}

export default function VisionManagePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const visionId = params.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'avanzado' | 'liderato' | 'fechas' | 'staff'>('info');
  
  // Verificar autenticación y permisos
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    const userRole = session?.user?.rol as string;
    if (!ALLOWED_ROLES.includes(userRole)) {
      router.push('/dashboard');
      return;
    }
  }, [status, session, router]);

  // Determinar si el usuario puede editar (solo SCHOOL_ADMIN y ADMINISTRADOR)
  const userRole = session?.user?.rol as string;
  const canEdit = userRole === 'SCHOOL_ADMIN' || userRole === 'ADMINISTRADOR';
  
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
  const [basicAttendanceFilter, setBasicAttendanceFilter] = useState<'ALL' | 'ATTENDED' | 'NOT_ATTENDED' | 'PENDING' | 'DROP' | 'BACKLOG'>('ALL');
  
  // Estado para registros del nivel AVANZADO
  const [advancedEnrollments, setAdvancedEnrollments] = useState<any[]>([]);
  const [loadingAdvancedEnrollments, setLoadingAdvancedEnrollments] = useState(false);
  const [advancedAttendanceFilter, setAdvancedAttendanceFilter] = useState<'ALL' | 'ATTENDED' | 'NOT_ATTENDED' | 'PENDING' | 'DROP' | 'BACKLOG'>('ALL');
  
  // Estado para registros del nivel LIDERATO (PL)
  const [plEnrollments, setPlEnrollments] = useState<any[]>([]);
  const [loadingPlEnrollments, setLoadingPlEnrollments] = useState(false);
  const [plAttendanceFilter, setPlAttendanceFilter] = useState<'ALL' | 'ATTENDED' | 'NOT_ATTENDED' | 'PENDING' | 'DROP' | 'BACKLOG'>('ALL');
  
  // Estado para productos (para mostrar coordinador y trainer de cada nivel)
  const [productos, setProductos] = useState<any>({
    basic: null,
    advanced: null,
    pl: null
  });
  
  // Estados para edición
  const [editingDates, setEditingDates] = useState(false);
  const [dateData, setDateData] = useState({
    basicStartDate: '',
    basicEndDate: '',
    basicStartTime: '09:00',
    basicRegistrationOpenDate: '',
    advancedStartDate: '',
    advancedEndDate: '',
    advancedStartTime: '15:00',
    advancedRegistrationOpenDate: '',
    plWeekends: [] as Array<{name: string; startDate: string; endDate: string; startTime: string}>,
    plStartTime: '18:00',
    plRegistrationOpenDate: ''
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
  const [gcSearchQuery, setGcSearchQuery] = useState('');
  const [gcSearchResults, setGcSearchResults] = useState<any[]>([]);
  const [gcSearching, setGcSearching] = useState(false);
  const [gcSelectedUser, setGcSelectedUser] = useState<any>(null);
  const [gcShowCreateForm, setGcShowCreateForm] = useState(false);
  const [gcNewUserData, setGcNewUserData] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [gcSelectedLevel, setGcSelectedLevel] = useState('BASIC');
  const [gcRegistering, setGcRegistering] = useState(false);

  // Estados para modal de restablecer contraseña
  const [resetPasswordUser, setResetPasswordUser] = useState<{id: number; nombre: string} | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchVisionData();
    fetchCoordinadores();
    fetchTrainers(); // Cargar trainers globales (de todo el sistema)
    fetchParticipantes();
    fetchGameChangers();
    fetchStaffData(); // Cargar staff existente
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
        
        // Obtener productos para las fechas
        const basicProduct = data.productos?.find((p: any) => p.levelType === 'BASIC');
        const advancedProduct = data.productos?.find((p: any) => p.levelType === 'ADVANCED');
        const plProduct = data.productos?.find((p: any) => p.levelType === 'PL');
        
        // Guardar productos en el estado para mostrar coordinador y trainer
        setProductos({
          basic: basicProduct || null,
          advanced: advancedProduct || null,
          pl: plProduct || null
        });
        
        // Helper para formatear datetime-local
        const formatDateTimeLocal = (isoString: string | null) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          // Format: YYYY-MM-DDTHH:MM
          return date.toISOString().slice(0, 16);
        };
        
        // Cargar todas las fechas de la visión desde la base de datos
        setDateData({
          basicStartDate: data.vision.startDate ? data.vision.startDate.split('T')[0] : '',
          basicEndDate: data.vision.endDate ? data.vision.endDate.split('T')[0] : '',
          basicStartTime: basicProduct?.trainingStartTime || '09:00',
          basicRegistrationOpenDate: formatDateTimeLocal(basicProduct?.registrationOpenDate),
          advancedStartDate: data.vision.advancedStartDate ? data.vision.advancedStartDate.split('T')[0] : '',
          advancedEndDate: data.vision.advancedEndDate ? data.vision.advancedEndDate.split('T')[0] : '',
          advancedStartTime: advancedProduct?.trainingStartTime || '15:00',
          advancedRegistrationOpenDate: formatDateTimeLocal(advancedProduct?.registrationOpenDate),
          plWeekends: [
            {
              name: 'Fin de Semana 1',
              startDate: data.vision.plWeekend1StartDate ? data.vision.plWeekend1StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend1EndDate ? data.vision.plWeekend1EndDate.split('T')[0] : '',
              startTime: plProduct?.plWeekend1StartTime || '18:00',
            },
            {
              name: 'Fin de Semana 2',
              startDate: data.vision.plWeekend2StartDate ? data.vision.plWeekend2StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend2EndDate ? data.vision.plWeekend2EndDate.split('T')[0] : '',
              startTime: plProduct?.plWeekend2StartTime || '18:00',
            },
            {
              name: 'Graduación',
              startDate: data.vision.plWeekend3StartDate ? data.vision.plWeekend3StartDate.split('T')[0] : '',
              endDate: data.vision.plWeekend3EndDate ? data.vision.plWeekend3EndDate.split('T')[0] : '',
              startTime: plProduct?.plWeekend3StartTime || '13:00',
            },
          ],
          plStartTime: plProduct?.trainingStartTime || '18:00',
          plRegistrationOpenDate: formatDateTimeLocal(plProduct?.registrationOpenDate)
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
        // Solo coordinadores (no trainers, esos vienen del API global)
        setCoordinadores(data.coordinadores.filter((u: Usuario) => 
          ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINADOR'].includes(u.rol)
        ));
      }
    } catch (error) {
      console.error('Error fetching coordinadores:', error);
    }
  };

  // Cargar trainers desde el API global (trainers no pertenecen a una organización)
  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/admin/trainers');
      const data = await res.json();
      
      if (data.success) {
        setTrainers(data.trainers || []);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
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

  // Función para toggle de capitán
  const toggleCaptain = async (gameChangerId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/gamechangers/toggle-captain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameChangerId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Actualizar el estado local
        setGameChangers(prev => prev.map(gc => 
          gc.id === gameChangerId 
            ? { ...gc, isCaptain: data.isCaptain }
            : gc
        ));
        setToast({
          show: true,
          message: data.isCaptain ? '👑 Game Changer designado como Capitán' : 'Capitán removido',
          type: 'success'
        });
      } else {
        setToast({
          show: true,
          message: data.error || 'Error al cambiar estado de capitán',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error toggling captain:', error);
      setToast({
        show: true,
        message: 'Error de conexión',
        type: 'error'
      });
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
    setGcSelectedLevel(level || 'BASIC');
    setGcSearchQuery('');
    setGcSearchResults([]);
    setGcSelectedUser(null);
    setGcShowCreateForm(false);
    setGcNewUserData({ nombre: '', email: '', telefono: '' });
  };

  // Buscar usuarios para Game Changer
  const handleSearchGameChanger = async () => {
    if (!gcSearchQuery.trim() || gcSearchQuery.length < 2) {
      setToast({show: true, message: 'Escribe al menos 2 caracteres para buscar', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
      return;
    }

    try {
      setGcSearching(true);
      const res = await fetch(`/api/school-admin/search-users?q=${encodeURIComponent(gcSearchQuery)}&visionId=${visionId}&level=${gcSelectedLevel}`);
      const data = await res.json();

      if (data.success) {
        setGcSearchResults(data.users || []);
        if (data.users?.length === 0) {
          // No se encontró, preguntar si crear nuevo
          setGcShowCreateForm(true);
          // Pre-llenar con la búsqueda si parece un email
          if (gcSearchQuery.includes('@')) {
            setGcNewUserData(prev => ({ ...prev, email: gcSearchQuery }));
          } else if (/^\d+$/.test(gcSearchQuery)) {
            setGcNewUserData(prev => ({ ...prev, telefono: gcSearchQuery }));
          } else {
            setGcNewUserData(prev => ({ ...prev, nombre: gcSearchQuery }));
          }
        }
      } else {
        setToast({show: true, message: data.error || 'Error en la búsqueda', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setToast({show: true, message: 'Error al buscar usuarios', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
    } finally {
      setGcSearching(false);
    }
  };

  // Seleccionar usuario existente como Game Changer
  const handleSelectGameChanger = (user: any) => {
    setGcSelectedUser(user);
    setGcSearchResults([]);
  };

  // Registrar Game Changer (usuario existente o nuevo)
  const handleRegisterGameChanger = async () => {
    try {
      setGcRegistering(true);
      let userId: number;

      if (gcSelectedUser) {
        // Usuario existente seleccionado
        userId = gcSelectedUser.id;
      } else if (gcShowCreateForm) {
        // Crear nuevo usuario
        if (!gcNewUserData.nombre || !gcNewUserData.email) {
          setToast({show: true, message: 'Nombre y email son obligatorios', type: 'error'});
          setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
          setGcRegistering(false);
          return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(gcNewUserData.email)) {
          setToast({show: true, message: 'Por favor ingresa un email válido', type: 'error'});
          setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
          setGcRegistering(false);
          return;
        }

        // Crear usuario nuevo
        const createRes = await fetch('/api/school-admin/create-gamechanger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: gcNewUserData.nombre,
            email: gcNewUserData.email,
            telefono: gcNewUserData.telefono,
            visionId: parseInt(visionId),
            createNewUser: true // Flag para indicar que es usuario nuevo
          }),
        });

        const createData = await createRes.json();
        if (!createData.success) {
          setToast({show: true, message: createData.error || 'Error al crear usuario', type: 'error'});
          setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
          setGcRegistering(false);
          return;
        }
        userId = createData.userId;
      } else {
        setToast({show: true, message: 'Selecciona un usuario o crea uno nuevo', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 3000);
        setGcRegistering(false);
        return;
      }

      // Asignar como Game Changer a la visión
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-gamechangers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameChangerIds: [userId],
          level: gcSelectedLevel
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({show: true, message: '✅ Game Changer registrado exitosamente', type: 'success'});
        setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
        setShowGameChangerModal(false);
        fetchGameChangers();
      } else {
        setToast({show: true, message: data.error || 'Error al registrar Game Changer', type: 'error'});
        setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
      }
    } catch (error) {
      console.error('Error registering game changer:', error);
      setToast({show: true, message: 'Error al registrar Game Changer', type: 'error'});
      setTimeout(() => setToast({show: false, message: '', type: 'error'}), 4000);
    } finally {
      setGcRegistering(false);
    }
  };

  const handleSaveDates = async () => {
    try {
      // Función helper para convertir fecha sin problemas de timezone
      // Agrega T12:00:00 para evitar que al convertir a UTC se vaya al día anterior
      const toSafeISODate = (dateStr: string | null | undefined): string | null => {
        if (!dateStr) return null;
        // Si ya tiene hora (datetime-local), usarlo directamente
        if (dateStr.includes('T')) {
          return new Date(dateStr).toISOString();
        }
        // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de timezone
        return new Date(`${dateStr}T12:00:00`).toISOString();
      };

      const res = await fetch(`/api/school-admin/visiones/${visionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Fechas de Básico
          startDate: toSafeISODate(dateData.basicStartDate),
          endDate: toSafeISODate(dateData.basicEndDate),
          basicStartTime: dateData.basicStartTime,
          basicRegistrationOpenDate: dateData.basicRegistrationOpenDate ? new Date(dateData.basicRegistrationOpenDate).toISOString() : null,
          // Fechas de Avanzado
          advancedStartDate: toSafeISODate(dateData.advancedStartDate),
          advancedEndDate: toSafeISODate(dateData.advancedEndDate),
          advancedStartTime: dateData.advancedStartTime,
          advancedRegistrationOpenDate: dateData.advancedRegistrationOpenDate ? new Date(dateData.advancedRegistrationOpenDate).toISOString() : null,
          // Fechas de PL Weekend 1
          plWeekend1StartDate: toSafeISODate(dateData.plWeekends[0]?.startDate),
          plWeekend1EndDate: toSafeISODate(dateData.plWeekends[0]?.endDate),
          plWeekend1StartTime: dateData.plWeekends[0]?.startTime || '18:00',
          // Fechas de PL Weekend 2
          plWeekend2StartDate: toSafeISODate(dateData.plWeekends[1]?.startDate),
          plWeekend2EndDate: toSafeISODate(dateData.plWeekends[1]?.endDate),
          plWeekend2StartTime: dateData.plWeekends[1]?.startTime || '18:00',
          // Fechas de PL Weekend 3 (Graduación)
          plWeekend3StartDate: toSafeISODate(dateData.plWeekends[2]?.startDate),
          plWeekend3EndDate: toSafeISODate(dateData.plWeekends[2]?.endDate),
          plWeekend3StartTime: dateData.plWeekends[2]?.startTime || '13:00',
          // Control de PL
          plStartTime: dateData.plStartTime,
          plRegistrationOpenDate: dateData.plRegistrationOpenDate ? new Date(dateData.plRegistrationOpenDate).toISOString() : null,
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

  // Función para actualizar el estado de asistencia
  const updateAttendance = async (enrollmentId: number, newStatus: string, level: string) => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/update-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enrollmentId, 
          attendanceStatus: newStatus,
          level 
        })
      });

      const data = await res.json();

      if (data.success) {
        // Actualizar el estado local según el nivel
        if (level === 'BASIC') {
          setBasicEnrollments(prev => 
            prev.map(e => e.id === enrollmentId ? { ...e, attendanceStatus: newStatus } : e)
          );
        } else if (level === 'ADVANCED') {
          setAdvancedEnrollments(prev => 
            prev.map(e => e.id === enrollmentId ? { ...e, attendanceStatus: newStatus } : e)
          );
        } else if (level === 'PL') {
          setPlEnrollments(prev => 
            prev.map(e => e.id === enrollmentId ? { ...e, attendanceStatus: newStatus } : e)
          );
        }

        setToast({ show: true, message: 'Asistencia actualizada', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      } else {
        throw new Error(data.error || 'Error al actualizar');
      }
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      setToast({ show: true, message: error.message || 'Error al actualizar asistencia', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    }
  };

  // Función para abrir modal de restablecer contraseña
  const handleResetPassword = (userId: number, userName: string) => {
    setResetPasswordUser({ id: userId, nombre: userName });
  };

  // Función para confirmar el restablecimiento de contraseña
  const confirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    
    setResettingPassword(true);
    
    try {
      const res = await fetch('/api/school-admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetPasswordUser.id })
      });

      const data = await res.json();

      if (data.success) {
        setToast({ show: true, message: `Contraseña de ${resetPasswordUser.nombre} restablecida a "Quantum123"`, type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
      } else {
        throw new Error(data.error || 'Error al restablecer');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setToast({ show: true, message: error.message || 'Error al restablecer contraseña', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    } finally {
      setResettingPassword(false);
      setResetPasswordUser(null);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  // Verificar permisos antes de mostrar contenido
  if (!ALLOWED_ROLES.includes(userRole)) {
    return null;
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
              <div className="text-blue-100 text-sm mb-1">Inscritos Básico</div>
              <div className="text-5xl font-black text-white">{basicEnrollments.length}</div>
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
              <h2 className="text-2xl font-black text-white mb-4">📋 Información General - Nivel Básico</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

                <div className="bg-slate-900/50 rounded-lg p-4 border border-green-500/30">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">👤 Coordinador Asignado</label>
                  <div className="text-green-400 text-lg font-bold">
                    {productos.basic?.Coordinator?.nombre || 'Sin asignar'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/30">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">🎯 Trainer Asignado</label>
                  <div className="text-cyan-400 text-lg font-bold">
                    {productos.basic?.Trainer?.nombre || 'Sin asignar'}
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
                          className={`bg-slate-900/50 rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                            gc.isCaptain 
                              ? 'border-amber-400 bg-gradient-to-br from-amber-900/30 to-slate-900/50 ring-2 ring-amber-400/50' 
                              : 'border-yellow-500/30 hover:border-yellow-500/50'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${gc.isCaptain ? 'bg-amber-500/20' : 'bg-yellow-500/10'}`}></div>
                          <div className="absolute top-2 right-2 text-2xl">{gc.isCaptain ? '👑' : '⭐'}</div>
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                              gc.isCaptain 
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300' 
                                : 'bg-gradient-to-br from-yellow-500 to-orange-600'
                            }`}>
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</span>
                                {gc.isCaptain && (
                                  <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                                    CAPITÁN
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              {gc.usuario.telefono && (
                                <div className="text-cyan-400 text-xs truncate flex items-center gap-1">
                                  <span>📱</span> {gc.usuario.telefono}
                                </div>
                              )}
                              <div className="text-yellow-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                          {/* Botón de toggle capitán */}
                          <button
                            onClick={() => toggleCaptain(gc.id, gc.isCaptain)}
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-bold transition-all ${
                              gc.isCaptain
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/50'
                            }`}
                          >
                            {gc.isCaptain ? '✖ Quitar Capitán' : '👑 Hacer Capitán'}
                          </button>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/badges?level=BASIC`)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>🪪</span> Gafetes
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=BASIC`)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>📞</span> Llamadas
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Filtros de asistencia */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setBasicAttendanceFilter('ALL')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'ALL'
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Todos ({basicEnrollments.length})
                    </button>
                    <button
                      onClick={() => setBasicAttendanceFilter('ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'ATTENDED'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ✅ Asistió ({basicEnrollments.filter(e => e.attendanceStatus === 'ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setBasicAttendanceFilter('NOT_ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'NOT_ATTENDED'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ❌ No Asistió ({basicEnrollments.filter(e => e.attendanceStatus === 'NOT_ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setBasicAttendanceFilter('PENDING')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'PENDING'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📋 Inscrito ({basicEnrollments.filter(e => !e.attendanceStatus || e.attendanceStatus === 'PENDING').length})
                    </button>
                    <button
                      onClick={() => setBasicAttendanceFilter('DROP')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'DROP'
                          ? 'bg-gray-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      🚫 Drop ({basicEnrollments.filter(e => e.attendanceStatus === 'DROP').length})
                    </button>
                    <button
                      onClick={() => setBasicAttendanceFilter('BACKLOG')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        basicAttendanceFilter === 'BACKLOG'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ⏳ Backlog ({basicEnrollments.filter(e => e.attendanceStatus === 'BACKLOG').length})
                    </button>
                  </div>

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
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Teléfono</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Game Changer</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Asistencia</th>
                            <th className="text-left py-3 px-4 text-green-300 font-bold text-sm">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {basicEnrollments
                            .filter(enrollment => {
                              if (basicAttendanceFilter === 'ALL') return true;
                              if (basicAttendanceFilter === 'PENDING') return !enrollment.attendanceStatus || enrollment.attendanceStatus === 'PENDING';
                              return enrollment.attendanceStatus === basicAttendanceFilter;
                            })
                            .map((enrollment) => (
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
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.telefono || <span className="text-slate-500 italic">Sin teléfono</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.email || <span className="text-slate-500 italic">Sin email</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {enrollment.gameChanger ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {enrollment.gameChanger.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-yellow-300 text-sm font-semibold">{enrollment.gameChanger.nombre}</div>
                                      {enrollment.squadName && (
                                        <div className="text-slate-500 text-xs">{enrollment.squadName}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs italic">Sin asignar</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'short',
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
                                <select
                                  value={enrollment.attendanceStatus || 'PENDING'}
                                  onChange={(e) => updateAttendance(enrollment.id, e.target.value, 'BASIC')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border outline-none ${
                                    enrollment.attendanceStatus === 'ATTENDED' 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                      : enrollment.attendanceStatus === 'NOT_ATTENDED'
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                                      : enrollment.attendanceStatus === 'DROP'
                                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
                                      : enrollment.attendanceStatus === 'BACKLOG'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                  }`}
                                >
                                  <option value="PENDING" className="bg-slate-800 text-blue-300">📋 Inscrito</option>
                                  <option value="ATTENDED" className="bg-slate-800 text-emerald-300">✅ Asistió</option>
                                  <option value="NOT_ATTENDED" className="bg-slate-800 text-red-300">❌ No Asistió</option>
                                  <option value="DROP" className="bg-slate-800 text-gray-300">🚫 Drop</option>
                                  <option value="BACKLOG" className="bg-slate-800 text-amber-300">⏳ Backlog</option>
                                </select>
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleResetPassword(enrollment.userId, enrollment.Usuario?.nombre)}
                                  disabled={resettingPassword && resetPasswordUser?.id === enrollment.userId}
                                  className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                  title="Restablecer contraseña"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
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
              
              {/* Información General - Avanzado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Inicio</label>
                  <div className="text-white text-lg font-bold">
                    {vision.advancedStartDate ? new Date(vision.advancedStartDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">Fecha de Finalización</label>
                  <div className="text-white text-lg font-bold">
                    {vision.advancedEndDate ? new Date(vision.advancedEndDate).toLocaleDateString('es-MX') : 'No definida'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-orange-500/30">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">👤 Coordinador Asignado</label>
                  <div className="text-orange-400 text-lg font-bold">
                    {productos.advanced?.Coordinator?.nombre || 'Sin asignar'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/30">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">🎯 Trainer Asignado</label>
                  <div className="text-cyan-400 text-lg font-bold">
                    {productos.advanced?.Trainer?.nombre || 'Sin asignar'}
                  </div>
                </div>
              </div>
              
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
                          className={`bg-slate-900/50 rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                            gc.isCaptain 
                              ? 'border-amber-400 bg-gradient-to-br from-amber-900/30 to-slate-900/50 ring-2 ring-amber-400/50' 
                              : 'border-orange-500/30 hover:border-orange-500/50'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${gc.isCaptain ? 'bg-amber-500/20' : 'bg-orange-500/10'}`}></div>
                          <div className="absolute top-2 right-2 text-2xl">{gc.isCaptain ? '👑' : '⭐'}</div>
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                              gc.isCaptain 
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300' 
                                : 'bg-gradient-to-br from-orange-500 to-red-600'
                            }`}>
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</span>
                                {gc.isCaptain && (
                                  <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                                    CAPITÁN
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              {gc.usuario.telefono && (
                                <div className="text-cyan-400 text-xs truncate flex items-center gap-1">
                                  <span>📱</span> {gc.usuario.telefono}
                                </div>
                              )}
                              <div className="text-orange-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                          {/* Botón de toggle capitán */}
                          <button
                            onClick={() => toggleCaptain(gc.id, gc.isCaptain)}
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-bold transition-all ${
                              gc.isCaptain
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/50'
                            }`}
                          >
                            {gc.isCaptain ? '✖ Quitar Capitán' : '👑 Hacer Capitán'}
                          </button>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/badges?level=ADVANCED`)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>🪪</span> Gafetes
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=ADVANCED`)}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>📞</span> Llamadas
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Filtros de Asistencia AVANZADO */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setAdvancedAttendanceFilter('ALL')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'ALL'
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Todos ({advancedEnrollments.length})
                    </button>
                    <button
                      onClick={() => setAdvancedAttendanceFilter('ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'ATTENDED'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ✅ Asistió ({advancedEnrollments.filter(e => e.attendanceStatus === 'ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setAdvancedAttendanceFilter('NOT_ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'NOT_ATTENDED'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ❌ No Asistió ({advancedEnrollments.filter(e => e.attendanceStatus === 'NOT_ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setAdvancedAttendanceFilter('PENDING')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'PENDING'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📋 Inscrito ({advancedEnrollments.filter(e => !e.attendanceStatus || e.attendanceStatus === 'PENDING').length})
                    </button>
                    <button
                      onClick={() => setAdvancedAttendanceFilter('DROP')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'DROP'
                          ? 'bg-gray-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      🚫 Drop ({advancedEnrollments.filter(e => e.attendanceStatus === 'DROP').length})
                    </button>
                    <button
                      onClick={() => setAdvancedAttendanceFilter('BACKLOG')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        advancedAttendanceFilter === 'BACKLOG'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ⏳ Backlog ({advancedEnrollments.filter(e => e.attendanceStatus === 'BACKLOG').length})
                    </button>
                  </div>

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
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Teléfono</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Game Changer</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Asistencia</th>
                            <th className="text-left py-3 px-4 text-orange-300 font-bold text-sm">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advancedEnrollments
                            .filter(enrollment => {
                              if (advancedAttendanceFilter === 'ALL') return true;
                              if (advancedAttendanceFilter === 'PENDING') return !enrollment.attendanceStatus || enrollment.attendanceStatus === 'PENDING';
                              return enrollment.attendanceStatus === advancedAttendanceFilter;
                            })
                            .map((enrollment) => (
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
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.telefono || <span className="text-slate-500 italic">Sin teléfono</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.email || <span className="text-slate-500 italic">Sin email</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {enrollment.gameChanger ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {enrollment.gameChanger.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-yellow-300 text-sm font-semibold">{enrollment.gameChanger.nombre}</div>
                                      {enrollment.squadName && (
                                        <div className="text-slate-500 text-xs">{enrollment.squadName}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs italic">Sin asignar</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'short',
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
                                <select
                                  value={enrollment.attendanceStatus || 'PENDING'}
                                  onChange={(e) => updateAttendance(enrollment.id, e.target.value, 'ADVANCED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border outline-none ${
                                    enrollment.attendanceStatus === 'ATTENDED' 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                      : enrollment.attendanceStatus === 'NOT_ATTENDED'
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                                      : enrollment.attendanceStatus === 'DROP'
                                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
                                      : enrollment.attendanceStatus === 'BACKLOG'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                  }`}
                                >
                                  <option value="PENDING" className="bg-slate-800 text-blue-300">📋 Inscrito</option>
                                  <option value="ATTENDED" className="bg-slate-800 text-emerald-300">✅ Asistió</option>
                                  <option value="NOT_ATTENDED" className="bg-slate-800 text-red-300">❌ No Asistió</option>
                                  <option value="DROP" className="bg-slate-800 text-gray-300">🚫 Drop</option>
                                  <option value="BACKLOG" className="bg-slate-800 text-amber-300">⏳ Backlog</option>
                                </select>
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
              
              {/* Información General - Liderato */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">📅 Fin de Semana 1</label>
                  <div className="text-white text-sm font-bold">
                    {vision.plWeekend1StartDate ? new Date(vision.plWeekend1StartDate).toLocaleDateString('es-MX') : 'No definida'}
                    {vision.plWeekend1EndDate && ` - ${new Date(vision.plWeekend1EndDate).toLocaleDateString('es-MX')}`}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">📅 Fin de Semana 2</label>
                  <div className="text-white text-sm font-bold">
                    {vision.plWeekend2StartDate ? new Date(vision.plWeekend2StartDate).toLocaleDateString('es-MX') : 'No definida'}
                    {vision.plWeekend2EndDate && ` - ${new Date(vision.plWeekend2EndDate).toLocaleDateString('es-MX')}`}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">🎓 Graduación</label>
                  <div className="text-white text-sm font-bold">
                    {vision.plWeekend3StartDate ? new Date(vision.plWeekend3StartDate).toLocaleDateString('es-MX') : 'No definida'}
                    {vision.plWeekend3EndDate && ` - ${new Date(vision.plWeekend3EndDate).toLocaleDateString('es-MX')}`}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/30">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">👤 Coordinador Asignado</label>
                  <div className="text-purple-400 text-lg font-bold">
                    {productos.pl?.Coordinator?.nombre || 'Sin asignar'}
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/30 col-span-2">
                  <label className="text-slate-400 text-xs font-medium mb-1 block">🎯 Trainers Asignados (3 Fines de Semana)</label>
                  <div className="text-cyan-400 text-lg font-bold">
                    {productos.pl?.plTrainers && productos.pl.plTrainers.length > 0 
                      ? productos.pl.plTrainers.map((t: any, idx: number) => t?.nombre).filter(Boolean).join(', ') || 'Sin asignar'
                      : productos.pl?.Trainer?.nombre || 'Sin asignar'}
                  </div>
                </div>
              </div>
              
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
                          className={`bg-slate-900/50 rounded-lg p-4 border-2 transition-all relative overflow-hidden ${
                            gc.isCaptain 
                              ? 'border-amber-400 bg-gradient-to-br from-amber-900/30 to-slate-900/50 ring-2 ring-amber-400/50' 
                              : 'border-purple-500/30 hover:border-purple-500/50'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${gc.isCaptain ? 'bg-amber-500/20' : 'bg-purple-500/10'}`}></div>
                          <div className="absolute top-2 right-2 text-2xl">{gc.isCaptain ? '👑' : '⭐'}</div>
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                              gc.isCaptain 
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300' 
                                : 'bg-gradient-to-br from-purple-500 to-pink-600'
                            }`}>
                              {gc.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold truncate text-lg">{gc.usuario.nombre}</span>
                                {gc.isCaptain && (
                                  <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                                    CAPITÁN
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-xs truncate">{gc.usuario.email}</div>
                              {gc.usuario.telefono && (
                                <div className="text-cyan-400 text-xs truncate flex items-center gap-1">
                                  <span>📱</span> {gc.usuario.telefono}
                                </div>
                              )}
                              <div className="text-purple-400 text-xs mt-1">
                                {new Date(gc.assignedAt).toLocaleDateString('es-MX')}
                              </div>
                            </div>
                          </div>
                          {/* Botón de toggle capitán */}
                          <button
                            onClick={() => toggleCaptain(gc.id, gc.isCaptain)}
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-bold transition-all ${
                              gc.isCaptain
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/50'
                            }`}
                          >
                            {gc.isCaptain ? '✖ Quitar Capitán' : '👑 Hacer Capitán'}
                          </button>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/badges?level=PL`)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>🪪</span> Gafetes
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/school-admin/vision/${vision.id}/call-management?level=PL`)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                      >
                        <span>📞</span> Llamadas
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Filtros de Asistencia PL */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setPlAttendanceFilter('ALL')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'ALL'
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Todos ({plEnrollments.length})
                    </button>
                    <button
                      onClick={() => setPlAttendanceFilter('ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'ATTENDED'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ✅ Asistió ({plEnrollments.filter(e => e.attendanceStatus === 'ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setPlAttendanceFilter('NOT_ATTENDED')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'NOT_ATTENDED'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ❌ No Asistió ({plEnrollments.filter(e => e.attendanceStatus === 'NOT_ATTENDED').length})
                    </button>
                    <button
                      onClick={() => setPlAttendanceFilter('PENDING')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'PENDING'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📋 Inscrito ({plEnrollments.filter(e => !e.attendanceStatus || e.attendanceStatus === 'PENDING').length})
                    </button>
                    <button
                      onClick={() => setPlAttendanceFilter('DROP')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'DROP'
                          ? 'bg-gray-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      🚫 Drop ({plEnrollments.filter(e => e.attendanceStatus === 'DROP').length})
                    </button>
                    <button
                      onClick={() => setPlAttendanceFilter('BACKLOG')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        plAttendanceFilter === 'BACKLOG'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ⏳ Backlog ({plEnrollments.filter(e => e.attendanceStatus === 'BACKLOG').length})
                    </button>
                  </div>

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
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Teléfono</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Game Changer</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Fecha de Registro</th>
                            <th className="text-left py-3 px-4 text-purple-300 font-bold text-sm">Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plEnrollments
                            .filter(enrollment => {
                              if (plAttendanceFilter === 'ALL') return true;
                              if (plAttendanceFilter === 'PENDING') return !enrollment.attendanceStatus || enrollment.attendanceStatus === 'PENDING';
                              return enrollment.attendanceStatus === plAttendanceFilter;
                            })
                            .map((enrollment) => (
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
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.telefono || <span className="text-slate-500 italic">Sin teléfono</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {enrollment.Usuario?.email || <span className="text-slate-500 italic">Sin email</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {enrollment.gameChanger ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {enrollment.gameChanger.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-yellow-300 text-sm font-semibold">{enrollment.gameChanger.nombre}</div>
                                      {enrollment.squadName && (
                                        <div className="text-slate-500 text-xs">{enrollment.squadName}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs italic">Sin asignar</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-slate-300 text-sm">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'short',
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
                                <select
                                  value={enrollment.attendanceStatus || 'PENDING'}
                                  onChange={(e) => updateAttendance(enrollment.id, e.target.value, 'PL')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border outline-none ${
                                    enrollment.attendanceStatus === 'ATTENDED' 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                      : enrollment.attendanceStatus === 'NOT_ATTENDED'
                                      ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                                      : enrollment.attendanceStatus === 'DROP'
                                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
                                      : enrollment.attendanceStatus === 'BACKLOG'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                  }`}
                                >
                                  <option value="PENDING" className="bg-slate-800 text-blue-300">📋 Inscrito</option>
                                  <option value="ATTENDED" className="bg-slate-800 text-emerald-300">✅ Asistió</option>
                                  <option value="NOT_ATTENDED" className="bg-slate-800 text-red-300">❌ No Asistió</option>
                                  <option value="DROP" className="bg-slate-800 text-gray-300">🚫 Drop</option>
                                  <option value="BACKLOG" className="bg-slate-800 text-amber-300">⏳ Backlog</option>
                                </select>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">📅 Gestión de Fechas</h2>
                {canEdit && (
                  <button
                    onClick={handleToggleEditDates}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg"
                  >
                    {editingDates ? '💾 Guardar' : '✏️ Editar Fechas'}
                  </button>
                )}
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
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">🕐 Hora de Inicio del Entrenamiento</label>
                    {editingDates ? (
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.basicStartTime}
                        onChange={(e) => setDateData({...dateData, basicStartTime: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.basicStartTime || '09:00'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">📋 Apertura de Registro</label>
                    {editingDates ? (
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.basicRegistrationOpenDate}
                        onChange={(e) => setDateData({...dateData, basicRegistrationOpenDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.basicRegistrationOpenDate ? new Date(dateData.basicRegistrationOpenDate).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No definida (automático 24h antes)'}
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
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">🕐 Hora de Inicio del Entrenamiento</label>
                    {editingDates ? (
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.advancedStartTime}
                        onChange={(e) => setDateData({...dateData, advancedStartTime: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.advancedStartTime || '15:00'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">📋 Apertura de Registro</label>
                    {editingDates ? (
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.advancedRegistrationOpenDate}
                        onChange={(e) => setDateData({...dateData, advancedRegistrationOpenDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.advancedRegistrationOpenDate ? new Date(dateData.advancedRegistrationOpenDate).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No definida (automático 24h antes)'}
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
                
                {/* Control de Entrenamiento PL */}
                <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-purple-500/30">
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">🕐 Hora de Inicio del Entrenamiento</label>
                    {editingDates ? (
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.plStartTime}
                        onChange={(e) => setDateData({...dateData, plStartTime: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.plStartTime || '18:00'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-2 block">📋 Apertura de Registro</label>
                    {editingDates ? (
                      <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        value={dateData.plRegistrationOpenDate}
                        onChange={(e) => setDateData({...dateData, plRegistrationOpenDate: e.target.value})}
                      />
                    ) : (
                      <div className="text-white font-bold">
                        {dateData.plRegistrationOpenDate ? new Date(dateData.plRegistrationOpenDate).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No definida (automático 24h antes)'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {dateData.plWeekends.map((weekend, index) => (
                    <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                      <h4 className="text-white font-bold mb-3">
                        {weekend.name}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
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
                        <div>
                          <label className="text-slate-400 text-sm mb-2 block">🕐 Hora</label>
                          {editingDates ? (
                            <input
                              type="time"
                              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                              value={weekend.startTime}
                              onChange={(e) => {
                                const newWeekends = [...dateData.plWeekends];
                                newWeekends[index].startTime = e.target.value;
                                setDateData({...dateData, plWeekends: newWeekends});
                              }}
                            />
                          ) : (
                            <div className="text-white">
                              {weekend.startTime || (index === 2 ? '13:00' : '18:00')}
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  value={staffData.basicCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, basicCoordinatorId: e.target.value})}
                  disabled={!canEdit}
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  value={staffData.basicTrainerId}
                  onChange={(e) => setStaffData({...staffData, basicTrainerId: e.target.value})}
                  disabled={!canEdit}
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  value={staffData.advancedCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, advancedCoordinatorId: e.target.value})}
                  disabled={!canEdit}
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  value={staffData.advancedTrainerId}
                  onChange={(e) => setStaffData({...staffData, advancedTrainerId: e.target.value})}
                  disabled={!canEdit}
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
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  value={staffData.plCoordinatorId}
                  onChange={(e) => setStaffData({...staffData, plCoordinatorId: e.target.value})}
                  disabled={!canEdit}
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
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          value={staffData.plTrainers[index]}
                          onChange={(e) => {
                            const newTrainers = [...staffData.plTrainers];
                            newTrainers[index] = e.target.value;
                            setStaffData({...staffData, plTrainers: newTrainers});
                          }}
                          disabled={!canEdit}
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

              {canEdit && (
                <button 
                  onClick={handleSaveStaff}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-black text-lg shadow-xl transition-all active:scale-[0.98]"
                >
                  💾 Guardar Configuración de Staff
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Registro de Game Changer */}
      {showGameChangerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-500/30 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-yellow-900/40 p-6 border-b border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-yellow-300">Registrar Game Changer</h3>
                    <p className="text-yellow-400/60 text-sm">
                      Nivel: {gcSelectedLevel === 'BASIC' ? 'Básico' : gcSelectedLevel === 'ADVANCED' ? 'Avanzado' : 'Liderato'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGameChangerModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Búsqueda */}
              {!gcSelectedUser && !gcShowCreateForm && (
                <div className="space-y-4">
                  <label className="text-white font-bold block">🔍 Buscar Usuario</label>
                  <p className="text-slate-400 text-sm">Busca por nombre, correo o teléfono</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre, email o teléfono..."
                      className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      value={gcSearchQuery}
                      onChange={(e) => setGcSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchGameChanger()}
                    />
                    <button
                      onClick={handleSearchGameChanger}
                      disabled={gcSearching}
                      className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 text-white rounded-lg font-bold transition-all"
                    >
                      {gcSearching ? '...' : 'Buscar'}
                    </button>
                  </div>

                  {/* Resultados de búsqueda */}
                  {gcSearchResults.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-slate-400 text-sm">{gcSearchResults.length} usuario(s) encontrado(s):</p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {gcSearchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleSelectGameChanger(user)}
                            className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg cursor-pointer hover:border-yellow-500/50 hover:bg-slate-800/50 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-lg font-bold text-yellow-400">
                                {user.nombre?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-semibold">{user.nombre}</p>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                                {user.telefono && <p className="text-slate-500 text-xs">📱 {user.telefono}</p>}
                              </div>
                              <div className="text-yellow-400 text-sm">Seleccionar →</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón para crear nuevo */}
                  <button
                    onClick={() => setGcShowCreateForm(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-yellow-500/50 rounded-lg text-slate-400 hover:text-yellow-400 transition-all"
                  >
                    ➕ Crear nuevo usuario
                  </button>
                </div>
              )}

              {/* Usuario seleccionado */}
              {gcSelectedUser && (
                <div className="space-y-4">
                  <label className="text-white font-bold block">✅ Usuario Seleccionado</label>
                  <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {gcSelectedUser.nombre?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-lg">{gcSelectedUser.nombre}</p>
                        <p className="text-yellow-400">{gcSelectedUser.email}</p>
                        {gcSelectedUser.telefono && <p className="text-slate-400 text-sm">📱 {gcSelectedUser.telefono}</p>}
                      </div>
                      <button
                        onClick={() => {
                          setGcSelectedUser(null);
                          setGcSearchQuery('');
                        }}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        ✕ Cambiar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de nuevo usuario */}
              {gcShowCreateForm && !gcSelectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold block">➕ Crear Nuevo Usuario</label>
                    <button
                      onClick={() => {
                        setGcShowCreateForm(false);
                        setGcNewUserData({ nombre: '', email: '', telefono: '' });
                      }}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ← Volver a buscar
                    </button>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
                    ⚠️ Se creará con contraseña temporal <strong>Quantum123</strong> y deberá cambiarla al iniciar sesión.
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Nombre completo *</label>
                    <input
                      type="text"
                      placeholder="Nombre del usuario"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      value={gcNewUserData.nombre}
                      onChange={(e) => setGcNewUserData({...gcNewUserData, nombre: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Correo electrónico *</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      value={gcNewUserData.email}
                      onChange={(e) => setGcNewUserData({...gcNewUserData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Teléfono (opcional)</label>
                    <input
                      type="tel"
                      placeholder="10 dígitos"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      value={gcNewUserData.telefono}
                      onChange={(e) => setGcNewUserData({...gcNewUserData, telefono: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowGameChangerModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegisterGameChanger}
                  disabled={gcRegistering || (!gcSelectedUser && !gcShowCreateForm)}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold transition-all"
                >
                  {gcRegistering ? 'Registrando...' : '⭐ Registrar Game Changer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restablecer Contraseña */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Restablecer Contraseña</h3>
                  <p className="text-slate-400 text-sm">Confirma esta acción</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-white text-lg">
                ¿Restablecer la contraseña de <span className="font-bold text-amber-400">{resetPasswordUser.nombre}</span>?
              </p>
              
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="text-lg">🔑</span>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Nueva contraseña temporal</p>
                    <p className="text-white font-mono font-bold text-lg">Quantum123</p>
                  </div>
                </div>
                
                <div className="h-px bg-slate-700" />
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg">ℹ️</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setResetPasswordUser(null)}
                disabled={resettingPassword}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResetPassword}
                disabled={resettingPassword}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {resettingPassword ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Restablecer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
