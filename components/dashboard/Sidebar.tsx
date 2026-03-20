'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Trophy, Target, BarChart3, User, LogOut, 
  UserPlus, DollarSign, Package, Shield, Drama, Theater,
  CreditCard, Gift, Compass, Bot, CheckCircle2, Lock, ClipboardCheck, Users, Calendar, ShieldAlert, CalendarCheck, Zap, Camera, Sparkles, Settings, TrendingUp, FileText, Briefcase, QrCode, Store, Star, Crown, Image, Vote, BookOpen, Rocket, Plane, Archive, Printer, Phone, Wallet, ChevronDown,
  Bird
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { MENU_ITEMS } from '@/config/menuPermissions';

interface SidebarProps {
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    suscripcion: string | null;
    puntosCuanticos: number;
    tier?: 'FREE' | 'STANDARD' | 'PREMIUM';
    permissions?: string[]; // Array de IDs de permisos permitidos
    esMentor?: boolean; // Indica si el usuario puede ser mentor
    esEntrenador?: boolean;
    esCoordinador?: boolean;
    esCoordinadorBasico?: boolean; // Flag para coordinador básico
    esCoordinadorAvanzado?: boolean; // Flag para coordinador avanzado
    esLider?: boolean;
    organization?: {
      id: number;
      name: string;
      logoUrl: string | null;
      brandColor: string | null;
    } | null;
  };
  isMobile?: boolean; // Nueva prop para controlar si se muestra en móvil
  onClose?: () => void; // Función para cerrar el sidebar móvil
}

export function Sidebar({ usuario, isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isParticipanteView = searchParams.get('view') === 'participante';
  const [cartaStatus, setCartaStatus] = useState<string | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('');
  const [isPLParticipant, setIsPLParticipant] = useState(false);
  const [hasPLAttendance, setHasPLAttendance] = useState(false);
  const [hasActiveAdvanced, setHasActiveAdvanced] = useState(false);
  const [reportesPendientes, setReportesPendientes] = useState(0);
  const [activeRole, setActiveRole] = useState<string>(usuario.rol); // Rol activo del RoleSwitcher
  const [activeVisionId, setActiveVisionId] = useState<number | null>(null); // Visión vigente
  const [lideratoExpanded, setLideratoExpanded] = useState(false); // Menú Liderato desplegable
  const [iaRecommendation, setIaRecommendation] = useState<{
    message: string;
    emoji: string;
  }>({
    message: 'Completa tus tareas de hoy para ganar más puntos 🚀',
    emoji: '💡'
  });

  // Helper para cerrar el sidebar en móvil al hacer click
  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Función para validar si el usuario puede usar un rol específico
  const canUseRole = (role: string): boolean => {
    if (role === 'COORDINATOR_BASIC') return !!(usuario.esCoordinadorBasico || usuario.esCoordinador);
    if (role === 'COORDINATOR_ADVANCED') return !!(usuario.esCoordinadorAvanzado || usuario.esCoordinador);
    if (role === 'TRAINER') return !!(usuario.esEntrenador);
    if (role === 'MENTOR') return !!(usuario.esMentor);
    if (role === 'LIDER') return !!(usuario.esLider);
    // El rol base del usuario siempre es válido
    return role === usuario.rol;
  };

  // Leer activeRole de localStorage y escuchar cambios
  useEffect(() => {
    // Leer valor inicial
    const savedRole = localStorage.getItem('activeRole');
    if (savedRole && canUseRole(savedRole)) {
      setActiveRole(savedRole);
    } else {
      // Si el rol guardado no es válido, usar el rol base del usuario
      setActiveRole(usuario.rol);
      localStorage.setItem('activeRole', usuario.rol);
    }

    // Escuchar cambios en localStorage (cuando el RoleSwitcher cambia el rol desde otra pestaña)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeRole' && e.newValue && canUseRole(e.newValue)) {
        setActiveRole(e.newValue);
      }
    };

    // Escuchar evento personalizado (cuando el RoleSwitcher cambia el rol en la misma pestaña)
    const handleRoleChange = (e: CustomEvent<{ role: string }>) => {
      if (canUseRole(e.detail.role)) {
        setActiveRole(e.detail.role);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roleChange', handleRoleChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roleChange', handleRoleChange as EventListener);
    };
  }, [usuario.rol, usuario.esCoordinadorBasico, usuario.esCoordinadorAvanzado, usuario.esEntrenador, usuario.esMentor, usuario.esLider]);

  // Verificar si trainer tiene avanzado vigente
  useEffect(() => {
    const checkActiveAdvanced = async () => {
      try {
        const response = await fetch('/api/trainer/has-active-advanced');
        if (response.ok) {
          const data = await response.json();
          setHasActiveAdvanced(data.hasActiveAdvanced === true);
        }
      } catch (error) {
        console.error('Error checking active advanced:', error);
      }
    };

    // Verificar si el rol es TRAINER o si tiene esEntrenador
    if (usuario.rol === 'TRAINER' || usuario.esEntrenador) {
      checkActiveAdvanced();
    }
  }, [usuario.rol, usuario.esEntrenador]);

  // Verificar si es participante PL con asistencia
  useEffect(() => {
    const checkPLStatus = async () => {
      try {
        const response = await fetch('/api/legacy-vision-builder');
        if (response.ok) {
          const data = await response.json();
          setIsPLParticipant(data.hasAccess === true);
          setHasPLAttendance(data.hasAttendance === true);
        }
      } catch (error) {
        console.error('Error checking PL status:', error);
      }
    };

    if (usuario.rol === 'PARTICIPANTE') {
      checkPLStatus();
    }
  }, [usuario.rol]);

  // Obtener estado de la carta
  useEffect(() => {
    const fetchCartaStatus = async () => {
      try {
        const response = await fetch('/api/carta/my-carta');
        if (response.ok) {
          const data = await response.json();
          setCartaStatus(data.carta?.estado || null);
        }
      } catch (error) {
        console.error('Error fetching carta status:', error);
      }
    };

    // Solo fetch si es participante
    if (usuario.rol === 'PARTICIPANTE') {
      fetchCartaStatus();
    }
  }, [usuario.rol]);

  // Obtener recomendación de IA
  useEffect(() => {
    const fetchIARecommendation = async () => {
      try {
        const response = await fetch('/api/quantum-ia/recommendation');
        if (response.ok) {
          const data = await response.json();
          setIaRecommendation({
            message: data.message,
            emoji: data.emoji || '💡'
          });
        }
      } catch (error) {
        console.error('Error fetching IA recommendation:', error);
      }
    };

    if (usuario.rol === 'PARTICIPANTE') {
      fetchIARecommendation();
    }
  }, [usuario.rol]);

  // Obtener visión vigente (próxima a ocurrir) para coordinadores
  useEffect(() => {
    const fetchActiveVision = async () => {
      try {
        const response = await fetch('/api/coordinador/productos-activos');
        if (response.ok) {
          const data = await response.json();
          // Buscar la visión más próxima (con fecha de inicio más cercana al futuro)
          const productos = data.productos || [];
          if (productos.length > 0) {
            // Obtener visionId único más reciente
            const visionIds = [...new Set(productos.map((p: any) => p.visionId).filter(Boolean))];
            if (visionIds.length > 0) {
              // Usar el último visionId (más reciente)
              setActiveVisionId(visionIds[visionIds.length - 1] as number);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching active vision:', error);
      }
    };

    // Solo para coordinadores
    if (activeRole === 'COORDINATOR_BASIC' || activeRole === 'COORDINATOR_ADVANCED' || usuario.esCoordinador) {
      fetchActiveVision();
    }
  }, [activeRole, usuario.esCoordinador]);

  // Obtener cantidad de reportes anónimos pendientes (para SCHOOL_ADMIN y ADMIN)
  useEffect(() => {
    const fetchReportesPendientes = async () => {
      try {
        const response = await fetch('/api/vision/reporte-anonimo');
        if (response.ok) {
          const data = await response.json();
          // Contar solo los pendientes
          const pendientes = Array.isArray(data) 
            ? data.filter((r: any) => r.estado === 'PENDIENTE').length 
            : 0;
          setReportesPendientes(pendientes);
        }
      } catch (error) {
        console.error('Error fetching reportes pendientes:', error);
      }
    };

    if (usuario.rol === 'SCHOOL_ADMIN' || usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') {
      fetchReportesPendientes();
    }
  }, [usuario.rol]);

  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar redirección manual si falla
      window.location.href = '/login';
    }
  };

  // Lógica de bloqueo visual basada en TIER
  const esStaff = ['ADMINISTRADOR', 'COORDINADOR', 'MENTOR', 'GAMECHANGER', 'LIDER'].includes(usuario.rol);
  const userTier = usuario.tier || 'FREE';
  
  // NOTA: Usuarios PARTICIPANTES ya NO están bloqueados por falta de visión
  // Todos los PARTICIPANTES tienen acceso completo, solo difieren en:
  // - Usuarios gratuitos: NO generan puntos cuánticos, solo XP
  // - Usuarios gratuitos: NO necesitan autorización para carta ni evidencias
  // - Usuarios gratuitos: NO pueden enviar carta a revisión sin pagar primero
  const esUsuarioInactivo = false; // DESHABILITADO - todos tienen acceso
  
  // Helper para verificar si un tier tiene acceso
  const tierLevel = {
    'FREE': 1,
    'STANDARD': 2,
    'PREMIUM': 3
  };
  
  const canAccessByTier = (requiredTier: 'FREE' | 'STANDARD' | 'PREMIUM') => {
    if (esStaff) return true; // Staff siempre tiene acceso
    return true; // TODOS los usuarios tienen acceso completo
  };

  // =====================================================
  // FILTRADO MÁGICO DE PERMISOS
  // =====================================================
  // Permisos hardcoded por ahora (luego vendrán de la BD)
  const userPermissions = usuario.permissions || [
    'ranking', 'tienda', 'membresia' // Permisos por defecto
  ];

  // Si eres ADMIN, ves todo. Si no, solo lo que esté en tu lista.
  const allowedMenuItems = MENU_ITEMS.filter(item => {
    if (usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') return true;
    return userPermissions.includes(item.id);
  });

  // Mapeo de IDs a rutas (para el nuevo sistema)
  const routeMapping: Record<string, string> = {
    'ranking': '/dashboard/ranking',
    'tienda': '/dashboard/canjear',
    'membresia': '/dashboard/suscripcion',
    'auth_cartas': '/dashboard/staff',
    'auth_evidencias': '/dashboard/admin/evidencias',
    'alta_usuarios': '/dashboard/staff/alta-usuarios',
    'finanzas': '/dashboard/admin/pagos',
    'inv_recompensas': '/dashboard/admin/productos',
    'gestion_precios': '/dashboard/admin/precios',
    'gestion_usuarios': '/dashboard/admin/usuarios',
    'codigos': '/dashboard/admin/codigos',
    'gestion_talentos': '/dashboard/admin/mentores',
  };

  // Verificar si un módulo está permitido
  const canAccess = (itemId: string) => {
    if (usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') return true;
    return allowedMenuItems.some(item => item.id === itemId);
  };

  return (
    <aside className={`${isMobile ? 'flex w-full' : 'hidden lg:flex w-64 border-r border-slate-800'} bg-slate-900 flex-col`}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        {usuario.organization?.logoUrl ? (
          // Logo de la organización
          <>
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
              <img 
                src={usuario.organization.logoUrl} 
                alt={usuario.organization.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-lg text-white tracking-wide">
              {usuario.organization.name}
            </span>
          </>
        ) : (
          // Logo QUANTUM para usuarios sin organización
          <>
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Campo cuántico de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 rounded-lg opacity-20 blur-sm animate-pulse"></div>
              
              {/* Cerebro cuántico */}
              <div className="relative w-10 h-10 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center overflow-hidden">
                {/* Circuito neural */}
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {/* Cerebro base */}
                  <path d="M12 2C8.5 2 6 4.5 6 8c0 1 .2 2 .5 3C5 12 4 14 4 16c0 3.5 2.5 6 6 6h4c3.5 0 6-2.5 6-6 0-2-1-4-2.5-5 .3-1 .5-2 .5-3 0-3.5-2.5-6-6-6z" 
                        strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                  {/* Conexiones cuánticas */}
                  <circle cx="9" cy="9" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="9" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="13" r="1.5" fill="currentColor" />
                  <circle cx="9" cy="16" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="16" r="1.5" fill="currentColor" />
                  {/* Enlaces neuronales */}
                  <line x1="9" y1="9" x2="12" y2="13" strokeWidth="1" opacity="0.5" />
                  <line x1="15" y1="9" x2="12" y2="13" strokeWidth="1" opacity="0.5" />
                  <line x1="12" y1="13" x2="9" y2="16" strokeWidth="1" opacity="0.5" />
                  <line x1="12" y1="13" x2="15" y2="16" strokeWidth="1" opacity="0.5" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 tracking-wider">
                QUANTUM
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold -mt-0.5">
                MATTER
              </span>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <Link 
          href="/dashboard"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard' 
              ? 'bg-slate-700 text-white font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        {/* Panel de Trainer */}
        {!isParticipanteView && usuario.rol === 'TRAINER' && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Panel Trainer</p>
            
            <Link 
              href="/dashboard/trainer/bitacoras"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/trainer/bitacoras' || pathname.startsWith('/dashboard/trainer/bitacoras')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText size={18} className="text-slate-400" />
              <span>Bitácoras</span>
            </Link>

            <Link 
              href="/dashboard/trainer/biblioteca"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/trainer/biblioteca' || pathname.startsWith('/dashboard/trainer/biblioteca')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen size={18} className="text-slate-400" />
              <span>La Biblioteca</span>
            </Link>

            <Link 
              href="/dashboard/trainer/lanzador"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/trainer/lanzador' || pathname.startsWith('/dashboard/trainer/lanzador')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Rocket size={18} className="text-slate-400" />
              <span>El Lanzador</span>
            </Link>

            <Link 
              href="/dashboard/trainer/perfil"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/trainer/perfil'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User size={18} className="text-slate-400" />
              <span>Mi Perfil</span>
            </Link>

            <Link 
              href="/dashboard/trainer/estadisticas"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/trainer/estadisticas'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 size={18} className="text-slate-400" />
              <span>Mis Estadísticas</span>
            </Link>
          </div>
        )}

        {/* Panel de Game Changer */}
        {!isParticipanteView && usuario.rol === 'GAME_CHANGER' && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Panel Game Changer</p>
            
            <Link 
              href="/dashboard/mis-atomos"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mis-atomos' || pathname.startsWith('/dashboard/mis-atomos')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-slate-400" />
              <span>Mis Átomos</span>
            </Link>
          </div>
        )}

        {/* Panel de Mentor - Mostrar si activeRole es MENTOR (no TRAINER) y tiene rol MENTOR o esMentor */}
        {!isParticipanteView && activeRole !== 'TRAINER' && (usuario.rol === 'MENTOR' || (activeRole === 'MENTOR' && usuario.esMentor)) && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Panel de Mentor</p>
            
            <Link 
              href="/dashboard/mentor/cartas"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/cartas' || pathname.startsWith('/dashboard/mentor/cartas/')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck size={18} className="text-slate-400" />
              <span>Revisar Cartas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/validacion" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/validacion'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 size={18} className="text-slate-400" />
              <span>Validar Evidencias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/participantes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/participantes'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-slate-400" />
              <span>Mis Participantes</span>
            </Link>

            <Link 
              href="/dashboard/mentor/calendario" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/calendario'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarCheck size={18} className="text-slate-400" />
              <span>Calendario</span>
            </Link>

            <Link 
              href="/dashboard/mentor/horarios" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/horarios'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-slate-400" />
              <span>Horarios llamadas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/disponibilidad"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/disponibilidad'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-slate-400" />
              <span>Horarios Mentorias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/sesiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/sesiones'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-slate-400" />
              <span>Mis Sesiones</span>
            </Link>

            <Link 
              href="/dashboard/mentor/perfil"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/perfil'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User size={18} className="text-slate-400" />
              <span>Editar Mi Perfil</span>
            </Link>

            <Link 
              href="/dashboard/mentor/mi-qr"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/mi-qr'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <QrCode size={18} className="text-slate-400" />
              <span>Mi QR Personal</span>
            </Link>
          </div>
        )}

        {/* Panel de Líder */}
        {!isParticipanteView && usuario.rol === 'LIDER' && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Panel de Mentor</p>
            
            <Link 
              href="/dashboard/mentor/cartas"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/cartas' || pathname.startsWith('/dashboard/mentor/cartas/')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck size={18} className="text-slate-400" />
              <span>Revisar Cartas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/validacion" 
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/validacion'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 size={18} className="text-slate-400" />
              <span>Validar Evidencias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/participantes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/participantes'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-slate-400" />
              <span>Mis Participantes</span>
            </Link>

            <Link 
              href="/dashboard/mentor/calendario" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/calendario'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarCheck size={18} className="text-slate-400" />
              <span>Calendario</span>
            </Link>

            <Link 
              href="/dashboard/mentor/horarios" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/horarios'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-slate-400" />
              <span>Horarios llamadas</span>
            </Link>

            <Link 
              href="/dashboard/lider/perfil" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/lider/perfil'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User size={18} className="text-slate-400" />
              <span>Editar Mi Perfil</span>
            </Link>
          </div>
        )}

        {/* Panel de Trainer - Personajes solo si tiene avanzado vigente o activeRole es TRAINER */}
        {!isParticipanteView && (usuario.rol === 'TRAINER' || activeRole === 'TRAINER') && hasActiveAdvanced && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Herramientas Avanzadas</p>
            
            <Link 
              href="/dashboard/trainer/personajes"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/trainer/personajes' || pathname.startsWith('/dashboard/trainer/personajes')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Drama size={18} className="text-slate-400" />
              <span>Personajes</span>
            </Link>

            <Link 
              href="/dashboard/trainer/metamorfosis"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/trainer/metamorfosis' || pathname.startsWith('/dashboard/trainer/metamorfosis')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Theater size={18} className="text-slate-400" />
              <span>Saltos Cuánticos</span>
            </Link>
          </div>
        )}

        {/* Panel de Coordinador Básico - Solo cuando activeRole es COORDINATOR_BASIC Y el usuario tiene el flag */}
        {(activeRole === 'COORDINATOR_BASIC' || pathname.startsWith('/dashboard/coordinador-basico')) && (usuario.esCoordinadorBasico || usuario.esCoordinador) && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Coordinador Básico</p>

            <Link 
              href={`/dashboard/school-admin/vision/${activeVisionId || 6}/call-management?level=BASIC`}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.includes('/call-management')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Phone size={18} className="text-slate-400" />
              <span>Llamadas</span>
            </Link>

            <Link 
              href="/dashboard/coordinador/treasury"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/coordinador/treasury') || pathname.startsWith('/dashboard/tesoreria')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={18} className="text-slate-400" />
              <span>Tesorería</span>
            </Link>
          </div>
        )}

        {/* Panel de Coordinador Avanzado - Solo cuando activeRole es COORDINATOR_ADVANCED Y el usuario tiene el flag */}
        {(activeRole === 'COORDINATOR_ADVANCED' || pathname.startsWith('/dashboard/coordinador-avanzado')) && (usuario.esCoordinadorAvanzado || usuario.esCoordinador) && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Coordinador Avanzado</p>
            
            <Link 
              href="/dashboard/coordinador-avanzado"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/coordinador-avanzado'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard size={18} className="text-slate-400" />
              <span>Dashboard</span>
            </Link>

            <Link 
              href={`/dashboard/school-admin/vision/${activeVisionId || 6}/call-management?level=BASIC`}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.includes('/call-management')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Phone size={18} className="text-slate-400" />
              <span>Llamadas</span>
            </Link>

            <Link 
              href="/dashboard/coordinador/treasury"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/coordinador/treasury') || pathname.startsWith('/dashboard/tesoreria')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={18} className="text-slate-400" />
              <span>Tesorería</span>
            </Link>
          </div>
        )}

        {/* Herramientas de Ceremonia - COORDINADOR, TRAINER, ADMINISTRADOR o activeRole TRAINER */}
        {!isParticipanteView && (usuario.rol === 'COORDINADOR' || usuario.rol === 'TRAINER' || usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR' || activeRole === 'TRAINER') && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Ceremonia 3er Fin</p>
            
            <Link 
              href="/dashboard/time-capsule"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/time-capsule')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Archive size={18} className="text-slate-400" />
              <span>Cartas de Aprecio</span>
            </Link>

            <Link 
              href="/dashboard/flight-deck"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/flight-deck')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bird size={18} className="text-slate-400" />
              <span>Vuelos 3er Fin</span>
            </Link>

            <Link 
              href={`/dashboard/school-admin/vision/${activeVisionId || 6}/call-management?level=BASIC`}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.includes('/call-management')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Phone size={18} className="text-slate-400" />
              <span>Llamadas</span>
            </Link>
          </div>
        )}

        {/* Panel de Director de Escuela (SCHOOL_ADMIN) */}
        {!isParticipanteView && usuario.rol === 'SCHOOL_ADMIN' && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Mi Escuela</p>
            
            <Link 
              href="/dashboard/school-admin/branding"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/branding'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles size={18} className="text-slate-400" />
              <span>Personalizar Login</span>
            </Link>

            <Link 
              href="/dashboard/director/treasury/batches"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/director/treasury')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={18} className="text-slate-400" />
              <span>Gestión Financiera</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/legacy-audit"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/legacy-audit'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gift size={18} className="text-slate-400" />
              <span>Auditar Donaciones</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/pasarela"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/pasarela'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard size={18} className="text-slate-400" />
              <span>Pasarela de Pago</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/comisiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/comisiones'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Wallet size={18} className="text-slate-400" />
              <span>Gestión de Comisiones</span>
            </Link>

{/* QUANTUM PAY-BOT OCULTO - Pendiente desarrollo
            <Link 
              href="/dashboard/school-admin/auditar-transferencias"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/auditar-transferencias'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={18} className="text-slate-400" />
              <span>🤖 Quantum Pay-Bot</span>
            </Link>
            */}

            <Link 
              href="/dashboard/school-admin/manteles"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/manteles'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Printer size={18} className="text-slate-400" />
              <span>Generador Manteles</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/reportes-anonimos"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/reportes-anonimos'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="relative">
                <ShieldAlert size={18} className="text-slate-400" />
                {reportesPendientes > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                    {reportesPendientes}
                  </span>
                )}
              </div>
              <span>Buzón Anónimo</span>
              {reportesPendientes > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {reportesPendientes} nuevo{reportesPendientes > 1 ? 's' : ''}
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Panel Maestro (Basado en Permisos) */}
        {!isParticipanteView && (usuario.rol === 'ADMINISTRADOR' || allowedMenuItems.some(item => item.section === 'Panel Maestro')) && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Panel Maestro</p>
            
            {canAccess('auth_cartas') && (
              <Link 
                href="/dashboard/staff" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Shield size={18} className="text-slate-400" />
                <span>Autorizar Cartas</span>
              </Link>
            )}

            {canAccess('auth_evidencias') && (
              <Link 
                href="/dashboard/admin/evidencias" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <CheckCircle2 size={18} className="text-slate-400" />
                <span>Autorizar Evidencias</span>
              </Link>
            )}

            {/* Buzón Anónimo - Solo ADMIN y ADMINISTRADOR */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/reportes-anonimos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/reportes-anonimos'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert size={18} className="text-slate-400" />
                <span>Buzón Mentorías</span>
              </Link>
            )}

            {/* Buzón Anónimo Visiones - Solo ADMIN y ADMINISTRADOR */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/school-admin/reportes-anonimos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/school-admin/reportes-anonimos'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert size={18} className="text-red-500" />
                <span>Buzón Visiones</span>
              </Link>
            )}

            {canAccess('inv_recompensas') && (
              <Link 
                href="/dashboard/admin/productos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <Package size={18} className="text-slate-400" />
                <span>Inv. Recompensas</span>
              </Link>
            )}

            {canAccess('gestion_usuarios') && (
              <Link 
                href="/dashboard/admin/usuarios" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <User size={18} />
                <span>Gestión Usuarios</span>
              </Link>
            )}

            {/* Gestión de Escuelas B2B - Solo ADMIN */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/schools" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/schools')
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users size={18} className="text-slate-400" />
                <span>Gestión de Escuelas</span>
              </Link>
            )}

            {canAccess('codigos') && (
              <Link 
                href="/dashboard/admin/codigos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <Gift size={18} className="text-slate-400" />
                <span>Códigos de Regalo</span>
              </Link>
            )}

            {canAccess('gestion_talentos') && (
              <Link 
                href="/dashboard/admin/mentores" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <Users size={18} className="text-slate-400" />
                <span>Gestión de Mentores</span>
              </Link>
            )}

            {/* Gestor de Misiones y Eventos - Admin, Coordinador, Director y School Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'COORDINADOR' || usuario.rol === 'DIRECTOR' || usuario.rol === 'SCHOOL_ADMIN') && (
              <Link 
                href="/dashboard/admin/tareas" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/tareas')
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Zap size={18} className="text-slate-400" />
                <span>Misiones y Eventos</span>
              </Link>
            )}

            {/* Gestión de Ciclos - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/ciclos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/ciclos'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CalendarCheck size={18} className="text-slate-400" />
                <span>Gestión de Ciclos</span>
              </Link>
            )}

            {/* Personajes del Sistema - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/personajes" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/personajes'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles size={18} className="text-slate-400" />
                <span>Personajes del Sistema</span>
              </Link>
            )}

            {/* Saltos Cuánticos del Sistema - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/saltos-cuanticos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/saltos-cuanticos'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Theater size={18} className="text-slate-400" />
                <span>Saltos Cuánticos</span>
              </Link>
            )}

            {/* Panel de Permisos - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/permisos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors border-t border-slate-700 mt-2 pt-3"
              >
                <Shield size={18} className="text-slate-400" />
                <span>Gestión de Permisos</span>
              </Link>
            )}
          </div>
        )}

        {/* REPORTES Y CONTROL - Solo Admin */}
        {!isParticipanteView && (usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
          <div className="pt-6 mt-6 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Reportes y Control</p>
            
            {/* Resumen Financiero */}
            <Link 
              href="/dashboard/admin/reports/financial" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/financial'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp size={18} className="text-slate-400" />
              <span>Resumen Financiero</span>
            </Link>

            {/* Control de Reservas */}
            <Link 
              href="/dashboard/admin/reports/bookings" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/bookings'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar size={18} className="text-slate-400" />
              <span>Control de Reservas</span>
            </Link>

            {/* Paquetes y Mentores */}
            <Link 
              href="/dashboard/admin/reports/packages" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/packages'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase size={18} className="text-slate-400" />
              <span>Paquetes y Mentores</span>
            </Link>

            {/* Comisiones de Mentores */}
            <Link 
              href="/dashboard/admin/reports/commissions" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/commissions'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign size={18} className="text-slate-400" />
              <span>Comisiones Mentores</span>
            </Link>

            {/* Finanzas */}
            {canAccess('finanzas') && (
              <Link 
                href="/dashboard/admin/pagos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/pagos'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <DollarSign size={18} className="text-slate-400" />
                <span>Finanzas</span>
              </Link>
            )}

            {/* Gestión de Precios */}
            {canAccess('gestion_precios') && (
              <Link 
                href="/dashboard/admin/precios" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/precios'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Target size={18} className="text-slate-400" />
                <span>Gestión de Precios</span>
              </Link>
            )}

            {/* Órdenes de Compra */}
            <Link 
              href="/dashboard/admin/ordenes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/admin/ordenes')
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard size={18} className="text-slate-400" />
              <span>Órdenes de Compra</span>
            </Link>

            {/* Configuración de Pagos */}
            {usuario.rol === 'ADMINISTRADOR' && (
              <Link 
                href="/dashboard/admin/payment-settings" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/payment-settings')
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <DollarSign size={18} className="text-slate-400" />
                <span>Config. Pagos</span>
              </Link>
            )}
          </div>
        )}

        {/* NAVEGACIÓN GENERAL - Al final para todos los usuarios EXCEPTO SCHOOL_ADMIN, COORDINADOR (a menos que esté en vista participante), MENTOR en su dashboard, y cuando activeRole es TRAINER o COORDINATOR_BASIC/ADVANCED */}
        {usuario.rol !== 'SCHOOL_ADMIN' && (usuario.rol !== 'COORDINADOR' || isParticipanteView) && activeRole !== 'TRAINER' && activeRole !== 'COORDINATOR_BASIC' && activeRole !== 'COORDINATOR_ADVANCED' && !pathname.startsWith('/dashboard/mentor') && !pathname.startsWith('/dashboard/coordinador-basico') && !pathname.startsWith('/dashboard/coordinador-avanzado') && (
        <div className="pt-6 mt-6 border-t border-slate-700/50">
          <p className="px-4 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Navegación</p>
          
          <Link 
            href="/dashboard/hoy" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/hoy' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CalendarCheck size={18} className="text-slate-400" />
            <span>HOY</span>
          </Link>

          {/* Quantum Chronos - Calendario Inteligente */}
          <Link 
            href="/dashboard/calendar" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
              pathname === '/dashboard/calendar' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Calendar size={18} className="text-slate-400" />
            <span>Agenda</span>
          </Link>

          {/* THE VAULT - Quantum Archive */}
          <Link 
            href="/dashboard/vault" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
              pathname === '/dashboard/vault' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Camera size={18} className="text-slate-400" />
            <span>The Vault</span>
          </Link>

          {/* Guía de Inicio - Solo visible para ADMIN */}
          {usuario.rol === 'ADMIN' && (
            <Link 
              href="/dashboard/ciclos/guia" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/ciclos/guia' 
                  ? 'bg-slate-700 text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Compass size={18} className="text-slate-400" />
              <span>Guía de Inicio</span>
            </Link>
          )}

          {/* Carta F.R.U.T.O.S. - Redirección dinámica según estado */}
          <Link 
            href={
              cartaStatus === 'CAMBIOS_REQUERIDOS' || cartaStatus === 'EN_REVISION' 
                ? '/dashboard/carta/resumen' 
                : '/dashboard/carta'
            } 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/carta' || pathname === '/dashboard/carta/resumen'
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Target size={18} className="text-slate-400" />
            <span>Objetivos</span>
          </Link>

          {/* Quantum Detector - Monitor de Retrasos */}
          <Link 
            href="/dashboard/quantum-detector" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
              pathname === '/dashboard/quantum-detector' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Zap size={18} className="text-slate-400" />
            <span>Quantum IA</span>
            <span className="ml-auto text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">Beta</span>
          </Link>

          {/* Solicitar Mentoría - Solo PARTICIPANTE */}
          {usuario.rol === 'PARTICIPANTE' && (
            <Link 
              href="/dashboard/mentorias" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentorias' 
                  ? 'bg-slate-700 text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users size={18} className="text-slate-400" />
              <span>Solicitar Mentoría</span>
            </Link>
          )}

          <Link 
            href='/dashboard/ranking' 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/ranking' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Trophy size={18} />
            <span>Ranking Global</span>
          </Link>

          <Link 
            href='/dashboard/canjear' 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/canjear' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package size={18} />
            <span>Tienda / Canje</span>
          </Link>

          {/* Membresía */}
          <Link 
            href="/dashboard/suscripcion" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/suscripcion' 
                ? 'bg-slate-700 text-white font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CreditCard size={18} />
            <span>Membresía</span>
          </Link>

          {/* SECCIÓN LIDERATO - DESPLEGABLE */}
          <button
            onClick={() => setLideratoExpanded(!lideratoExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 mt-4 text-sm rounded-lg transition-colors hover:bg-slate-800/50 group"
          >
            <span className="text-xs font-bold text-slate-400 uppercase">LIDERATO</span>
            <ChevronDown 
              size={16} 
              className={`text-slate-500 transition-transform duration-200 ${lideratoExpanded ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Contenido desplegable de Liderato */}
          {lideratoExpanded && (
            <div className="ml-2 pl-2 border-l border-slate-700/50 space-y-1">
              {/* Legacy Builder - Donaciones */}
              <Link 
                href="/dashboard/legacy-builder" 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                  pathname.startsWith('/dashboard/legacy-builder')
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Gift size={18} className="text-slate-400" />
                <span>Legado</span>
              </Link>

              {/* Ver Votaciones */}
              <Link 
                href="/dashboard/votaciones" 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                  pathname.startsWith('/dashboard/votaciones')
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Vote size={18} className="text-slate-400" />
                <span>Ver Votaciones</span>
              </Link>

              {/* Legacy Vision Builder - Capitanías */}
              <Link 
                href="/dashboard/legacy-vision-builder" 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                  pathname.startsWith('/dashboard/legacy-vision-builder')
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Crown size={18} className="text-slate-400" />
                <span>Capitanías</span>
              </Link>

              {/* Directorio de Talentos - Mercado */}
              <Link 
                href="/dashboard/mercado" 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                  pathname.startsWith('/dashboard/mercado')
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Store size={18} className="text-slate-400" />
                <span>Directorio</span>
              </Link>

              {/* Mi Negocio - Perfil Empresarial */}
              <Link 
                href="/dashboard/mi-negocio" 
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                  pathname === '/dashboard/mi-negocio'
                    ? 'bg-slate-700 text-white font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Briefcase size={18} className="text-slate-400" />
                <span>Mi Futuro Imposible</span>
              </Link>
            </div>
          )}

          {/* Mi QR Personal - Solo para PARTICIPANTE, LIDER, GAMECHANGER */}
          {(usuario.rol === 'PARTICIPANTE' || usuario.rol === 'LIDER' || usuario.rol === 'GAMECHANGER') && (
            <Link 
              href="/dashboard/mi-qr" 
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${
                pathname === '/dashboard/mi-qr' 
                  ? 'bg-slate-700 text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <QrCode size={18} className="text-slate-400" />
              <span className="font-medium">Mi QR Personal</span>
            </Link>
          )}
        </div>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700/50 space-y-2">
        {/* Mis Tickets */}
        <Link
          href="/dashboard/my-tickets"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${
            pathname === '/dashboard/my-tickets'
              ? 'bg-slate-700 text-white font-medium'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3" />
            <path d="M2 9h20" />
            <path d="M2 15a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3" />
            <path d="M2 15h20" />
            <path d="M12 6v12" />
          </svg>
          <span>Mis Tickets</span>
        </Link>

        {/* Buzón Anónimo - Solo para PARTICIPANTE */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link
            href="/dashboard/buzon-anonimo"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors ${
              pathname === '/dashboard/buzon-anonimo'
                ? 'bg-slate-700 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <ShieldAlert size={20} className="text-slate-400" />
            <span>Buzón Anónimo</span>
          </Link>
        )}
        
        {/* Configuración */}
        <Link
          href="/dashboard/configuracion"
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors ${
            pathname === '/dashboard/configuracion' || pathname === '/dashboard/perfil-completo'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Settings size={20} />
          <span>Configuración</span>
        </Link>

        {/* Cerrar Sesión */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-slate-800/60 transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Modal de Upsell */}
      {showUpsellModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Lock className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Función Premium</h3>
            </div>
            
            <p className="text-slate-300 mb-6">{upsellMessage}</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpsellModal(false)}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
              <Link
                href="/dashboard/suscripcion"
                onClick={() => setShowUpsellModal(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-colors text-center font-semibold"
              >
                Ver Planes
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
