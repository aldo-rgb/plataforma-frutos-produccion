'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Trophy, Target, BarChart3, User, LogOut, 
  UserPlus, DollarSign, Package, Shield, Drama, Theater,
  CreditCard, Gift, Compass, Bot, CheckCircle2, Lock, ClipboardCheck, Users, Calendar, ShieldAlert, CalendarCheck, Zap, Camera, Sparkles, Settings, TrendingUp, FileText, Briefcase, QrCode, Store, Star, Crown, Image
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { MENU_ITEMS } from '@/config/menuPermissions';
import InstallAppButton from '@/components/pwa/InstallAppButton';

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
  const [cartaStatus, setCartaStatus] = useState<string | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('');
  const [isPLParticipant, setIsPLParticipant] = useState(false);
  const [hasPLAttendance, setHasPLAttendance] = useState(false);
  const [hasActiveAdvanced, setHasActiveAdvanced] = useState(false);
  const [reportesPendientes, setReportesPendientes] = useState(0);
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

    if (usuario.rol === 'TRAINER') {
      checkActiveAdvanced();
    }
  }, [usuario.rol]);

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
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        {/* Panel de Game Changer */}
        {usuario.rol === 'GAME_CHANGER' && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel Game Changer</p>
            
            <Link 
              href="/dashboard/mis-atomos"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mis-atomos' || pathname.startsWith('/dashboard/mis-atomos')
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-cyan-400" />
              <span>Mis Átomos</span>
            </Link>
          </div>
        )}

        {/* Panel de Mentor */}
        {usuario.rol === 'MENTOR' && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel de Mentor</p>
            
            <Link 
              href="/dashboard/mentor/revisiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/revisiones'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck size={18} className="text-purple-400" />
              <span>Revisar Cartas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/validacion" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/validacion'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 size={18} className="text-cyan-400" />
              <span>Validar Evidencias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/participantes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/participantes'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-blue-400" />
              <span>Mis Participantes</span>
            </Link>

            <Link 
              href="/dashboard/mentor/calendario" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/calendario'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarCheck size={18} className="text-green-400" />
              <span>Calendario</span>
            </Link>

            <Link 
              href="/dashboard/mentor/horarios" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/horarios'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-indigo-400" />
              <span>Horarios llamadas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/disponibilidad"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/disponibilidad'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-orange-400" />
              <span>Horarios Mentorias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/sesiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/sesiones'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-purple-400" />
              <span>Mis Sesiones</span>
            </Link>

            <Link 
              href="/dashboard/mentor/perfil"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/perfil'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User size={18} className="text-emerald-400" />
              <span>Editar Mi Perfil</span>
            </Link>
          </div>
        )}

        {/* Panel de Líder */}
        {usuario.rol === 'LIDER' && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel de Mentor</p>
            
            <Link 
              href="/dashboard/mentor/revisiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/revisiones'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck size={18} className="text-purple-400" />
              <span>Revisar Cartas</span>
            </Link>

            <Link 
              href="/dashboard/mentor/validacion" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/validacion'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 size={18} className="text-cyan-400" />
              <span>Validar Evidencias</span>
            </Link>

            <Link 
              href="/dashboard/mentor/participantes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/participantes'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-blue-400" />
              <span>Mis Participantes</span>
            </Link>

            <Link 
              href="/dashboard/mentor/calendario" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/calendario'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarCheck size={18} className="text-green-400" />
              <span>Calendario</span>
            </Link>

            <Link 
              href="/dashboard/mentor/horarios" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentor/horarios'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar size={18} className="text-indigo-400" />
              <span>Horarios llamadas</span>
            </Link>

            <Link 
              href="/dashboard/lider/perfil" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/lider/perfil'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User size={18} className="text-emerald-400" />
              <span>Editar Mi Perfil</span>
            </Link>
          </div>
        )}

        {/* Panel de Trainer - Personajes solo si tiene avanzado vigente */}
        {usuario.rol === 'TRAINER' && hasActiveAdvanced && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">🎭 Herramientas Avanzado</p>
            
            <Link 
              href="/dashboard/trainer/personajes"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/trainer/personajes' || pathname.startsWith('/dashboard/trainer/personajes')
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
              }`}
            >
              <Drama size={18} className="text-purple-400" />
              <span>Personajes</span>
            </Link>

            <Link 
              href="/dashboard/trainer/metamorfosis"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/trainer/metamorfosis' || pathname.startsWith('/dashboard/trainer/metamorfosis')
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-fuchsia-900/20'
              }`}
            >
              <Theater size={18} className="text-fuchsia-400" />
              <span>Saltos Cuánticos</span>
            </Link>
          </div>
        )}

        {/* Panel de Director de Escuela (SCHOOL_ADMIN) */}
        {usuario.rol === 'SCHOOL_ADMIN' && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">🏫 Mi Escuela</p>
            
            <Link 
              href="/dashboard/school-admin/branding"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/branding'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
              }`}
            >
              <Sparkles size={18} className="text-purple-400" />
              <span>Personalizar Login</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/flyer-designer"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/flyer-designer'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-cyan-900/20'
              }`}
            >
              <Image size={18} className="text-cyan-400" />
              <span>Personalizar Invitación</span>
            </Link>

            <Link 
              href="/dashboard/director/treasury/batches"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/director/treasury')
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-emerald-900/20'
              }`}
            >
              <DollarSign size={18} className="text-emerald-400" />
              <span>Gestión Financiera</span>
            </Link>

            <Link 
              href="/dashboard/coordinador/visiones"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/coordinador/visiones') || pathname.startsWith('/dashboard/director/visiones')
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-blue-900/20'
              }`}
            >
              <Users size={18} className="text-blue-400" />
              <span>Mis Visiones</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/legacy-audit"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/legacy-audit'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-emerald-900/20'
              }`}
            >
              <Gift size={18} className="text-emerald-400" />
              <span>Auditar Donaciones</span>
            </Link>

            <Link 
              href="/dashboard/school-admin/reportes-anonimos"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/school-admin/reportes-anonimos'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-orange-900/20'
              }`}
            >
              <div className="relative">
                <ShieldAlert size={18} className="text-orange-400" />
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
        {(usuario.rol === 'ADMINISTRADOR' || allowedMenuItems.some(item => item.section === 'Panel Maestro')) && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel Maestro</p>
            
            {canAccess('auth_cartas') && (
              <Link 
                href="/dashboard/staff" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Shield size={18} className="text-orange-500" />
                <span>Autorizar Cartas</span>
              </Link>
            )}

            {canAccess('auth_evidencias') && (
              <Link 
                href="/dashboard/admin/evidencias" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <CheckCircle2 size={18} className="text-blue-500" />
                <span>Autorizar Evidencias</span>
              </Link>
            )}

            {/* Buzón Anónimo - Solo ADMIN y ADMINISTRADOR */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/reportes-anonimos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/reportes-anonimos'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-orange-900/20'
                }`}
              >
                <ShieldAlert size={18} className="text-orange-500" />
                <span>Buzón Mentorías</span>
              </Link>
            )}

            {/* Buzón Anónimo Visiones - Solo ADMIN y ADMINISTRADOR */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/school-admin/reportes-anonimos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/school-admin/reportes-anonimos'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-red-900/20'
                }`}
              >
                <ShieldAlert size={18} className="text-red-500" />
                <span>Buzón Visiones</span>
              </Link>
            )}

            {canAccess('inv_recompensas') && (
              <Link 
                href="/dashboard/admin/productos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-purple-900/20 transition-colors"
              >
                <Package size={18} className="text-purple-500" />
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
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
                }`}
              >
                <Users size={18} className="text-purple-400" />
                <span>Gestión de Escuelas</span>
              </Link>
            )}

            {canAccess('codigos') && (
              <Link 
                href="/dashboard/admin/codigos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-yellow-900/20 transition-colors"
              >
                <Gift size={18} className="text-yellow-500" />
                <span>Códigos de Regalo</span>
              </Link>
            )}

            {canAccess('gestion_talentos') && (
              <Link 
                href="/dashboard/admin/mentores" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-purple-900/20 transition-colors"
              >
                <Users size={18} className="text-purple-500" />
                <span>Gestión de Mentores</span>
              </Link>
            )}

            {/* Gestor de Misiones y Eventos - Solo Admin, Coordinador y Director */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'COORDINADOR' || usuario.rol === 'DIRECTOR') && (
              <Link 
                href="/dashboard/admin/tareas" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/tareas')
                    ? 'bg-gradient-to-r from-amber-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-amber-900/20'
                }`}
              >
                <Zap size={18} className="text-amber-400" />
                <span>Misiones y Eventos</span>
              </Link>
            )}

            {/* Gestión de Ciclos - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/ciclos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/ciclos'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-900/20'
                }`}
              >
                <CalendarCheck size={18} className="text-cyan-500" />
                <span>Gestión de Ciclos</span>
              </Link>
            )}

            {/* Personajes del Sistema - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/personajes" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/personajes'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-900/20'
                }`}
              >
                <Sparkles size={18} className="text-cyan-400" />
                <span>Personajes del Sistema</span>
              </Link>
            )}

            {/* Saltos Cuánticos del Sistema - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/saltos-cuanticos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/saltos-cuanticos'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-fuchsia-900/20'
                }`}
              >
                <Theater size={18} className="text-fuchsia-400" />
                <span>Saltos Cuánticos</span>
              </Link>
            )}

            {/* Panel de Permisos - Solo Admin */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/permisos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-blue-900/20 transition-colors border-t border-slate-700 mt-2 pt-3"
              >
                <Shield size={18} className="text-blue-500" />
                <span>Gestión de Permisos</span>
              </Link>
            )}
          </div>
        )}

        {/* REPORTES Y CONTROL - Solo Admin */}
        {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">📊 Reportes y Control</p>
            
            {/* Resumen Financiero */}
            <Link 
              href="/dashboard/admin/reports/financial" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/financial'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-emerald-900/20'
              }`}
            >
              <TrendingUp size={18} className="text-emerald-400" />
              <span>Resumen Financiero</span>
            </Link>

            {/* Control de Reservas */}
            <Link 
              href="/dashboard/admin/reports/bookings" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/bookings'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-blue-900/20'
              }`}
            >
              <Calendar size={18} className="text-blue-400" />
              <span>Control de Reservas</span>
            </Link>

            {/* Paquetes y Mentores */}
            <Link 
              href="/dashboard/admin/reports/packages" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/packages'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
              }`}
            >
              <Briefcase size={18} className="text-purple-400" />
              <span>Paquetes y Mentores</span>
            </Link>

            {/* Comisiones de Mentores */}
            <Link 
              href="/dashboard/admin/reports/commissions" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/admin/reports/commissions'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-green-900/20'
              }`}
            >
              <DollarSign size={18} className="text-green-400" />
              <span>Comisiones Mentores</span>
            </Link>

            {/* Finanzas */}
            {canAccess('finanzas') && (
              <Link 
                href="/dashboard/admin/pagos" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/pagos'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-emerald-900/20'
                }`}
              >
                <DollarSign size={18} className="text-emerald-500" />
                <span>Finanzas</span>
              </Link>
            )}

            {/* Gestión de Precios */}
            {canAccess('gestion_precios') && (
              <Link 
                href="/dashboard/admin/precios" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/dashboard/admin/precios'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-cyan-900/20'
                }`}
              >
                <Target size={18} className="text-cyan-400" />
                <span>Gestión de Precios</span>
              </Link>
            )}

            {/* Órdenes de Compra */}
            <Link 
              href="/dashboard/admin/ordenes" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname.startsWith('/dashboard/admin/ordenes')
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-orange-900/20'
              }`}
            >
              <CreditCard size={18} className="text-orange-400" />
              <span>Órdenes de Compra</span>
            </Link>

            {/* Configuración de Pagos */}
            {usuario.rol === 'ADMINISTRADOR' && (
              <Link 
                href="/dashboard/admin/payment-settings" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/payment-settings')
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-indigo-900/20'
                }`}
              >
                <DollarSign size={18} className="text-indigo-400" />
                <span>Config. Pagos</span>
              </Link>
            )}
          </div>
        )}

        {/* NAVEGACIÓN GENERAL - Al final para todos los usuarios */}
        <div className="pt-6 mt-6 border-t border-slate-800">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">🏠 Navegación</p>
          
          <Link 
            href="/dashboard/hoy" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/hoy' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CalendarCheck size={18} className="text-blue-400" />
            <span>HOY</span>
          </Link>

          {/* Quantum Chronos - Calendario Inteligente */}
          <Link 
            href="/dashboard/calendar" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/calendar' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-indigo-900/50 hover:to-purple-900/50 hover:text-white'
            }`}
          >
            <Calendar size={18} className="text-indigo-400 group-hover:text-indigo-300" />
            <span className="font-semibold">Agenda</span>
          </Link>

          {/* THE VAULT - Quantum Archive */}
          <Link 
            href="/dashboard/vault" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/vault' 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-blue-900/50 hover:text-white'
            }`}
          >
            <Camera size={18} className="text-purple-400 group-hover:text-purple-300" />
            <span className="font-semibold">The Vault</span>
          </Link>

          <Link 
            href="/dashboard/ciclos/guia" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/ciclos/guia' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Compass size={18} className="text-pink-500" />
            <span>Guía de Inicio</span>
          </Link>

          {/* Carta F.R.U.T.O.S. - Redirección dinámica según estado */}
          <Link 
            href={
              cartaStatus === 'CAMBIOS_REQUERIDOS' || cartaStatus === 'EN_REVISION' 
                ? '/dashboard/carta/resumen' 
                : '/dashboard/carta'
            } 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/carta' || pathname === '/dashboard/carta/resumen'
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Target size={18} className="text-purple-500" />
            <span>Objetivos</span>
          </Link>

          {/* Quantum Detector - Monitor de Retrasos */}
          <Link 
            href="/dashboard/quantum-detector" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/quantum-detector' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-amber-900/50 hover:to-orange-900/50 hover:text-white'
            }`}
          >
            <Zap size={18} className="text-amber-400 group-hover:text-amber-300" />
            <span className="font-semibold">Quantum IA</span>
            <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">Beta</span>
          </Link>

          {/* Solicitar Mentoría - Solo PARTICIPANTE */}
          {usuario.rol === 'PARTICIPANTE' && (
            <Link 
              href="/dashboard/mentorias" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/mentorias' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users size={18} className="text-purple-400" />
              <span>Solicitar Mentoría</span>
            </Link>
          )}

          {/* Mis Sesiones - Solo PARTICIPANTE */}
          {usuario.rol === 'PARTICIPANTE' && (
            <Link 
              href='/dashboard/student/mis-sesiones' 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/student/mis-sesiones' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CheckCircle2 size={18} className="text-blue-400" />
              <span>Mis Sesiones</span>
            </Link>
          )}

          {/* Mis Tickets - Para todos */}
          <Link 
            href='/dashboard/my-tickets' 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/my-tickets' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-cyan-900/30 hover:to-blue-900/30 hover:text-cyan-300'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-cyan-400 group-hover:text-cyan-300"
            >
              <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3" />
              <path d="M2 9h20" />
              <path d="M2 15a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3" />
              <path d="M2 15h20" />
              <path d="M12 6v12" />
            </svg>
            <span className="font-medium">Mis Tickets</span>
          </Link>

          <Link 
            href='/dashboard/ranking' 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/ranking' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Trophy size={18} />
            <span>Ranking Global</span>
          </Link>

          {/* Muro de la Excelencia */}
          <Link 
            href="/dashboard/muro" 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/muro' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-pink-900/50 hover:text-white'
            }`}
          >
            <Sparkles size={18} className="text-pink-400 group-hover:text-pink-300" />
            <span className="font-semibold">Muro de la Excelencia</span>
          </Link>

          <Link 
            href='/dashboard/canjear' 
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
              pathname === '/dashboard/canjear' 
                ? 'bg-blue-600 text-white' 
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
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CreditCard size={18} />
            <span>Membresía</span>
          </Link>

          {/* SECCIÓN LIDERATO */}
          <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2 mt-4">🚀 Liderato</p>

          {/* Legacy Builder - Donaciones */}
          <Link 
            href="/dashboard/legacy-builder" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname.startsWith('/dashboard/legacy-builder')
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-emerald-900/30 hover:to-teal-900/30 hover:text-emerald-300'
            }`}
          >
            <Gift size={18} className="text-emerald-400 group-hover:text-emerald-300" />
            <span className="font-medium">Legacy Builder</span>
          </Link>

          {/* Legacy Vision Builder - Capitanías */}
          <Link 
            href="/dashboard/legacy-vision-builder" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname.startsWith('/dashboard/legacy-vision-builder')
                ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg shadow-yellow-500/20' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-yellow-900/30 hover:to-amber-900/30 hover:text-yellow-300'
            }`}
          >
            <Crown size={18} className="text-yellow-400 group-hover:text-yellow-300" />
            <span className="font-medium">Capitanías</span>
          </Link>

          {/* Directorio de Talentos - Mercado */}
          <Link 
            href="/dashboard/mercado" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname.startsWith('/dashboard/mercado')
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-orange-900/30 hover:to-amber-900/30 hover:text-orange-300'
            }`}
          >
            <Store size={18} className="text-orange-400 group-hover:text-orange-300" />
            <span className="font-medium">Directorio Talentos</span>
          </Link>

          {/* Mi Negocio - Perfil Empresarial */}
          <Link 
            href="/dashboard/mi-negocio" 
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
              pathname === '/dashboard/mi-negocio'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/20' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-yellow-900/30 hover:to-orange-900/30 hover:text-yellow-300'
            }`}
          >
            <Briefcase size={18} className="text-yellow-400 group-hover:text-yellow-300" />
            <span className="font-medium">Mi Futuro Imposible</span>
          </Link>

          {/* Mi QR Personal - Solo para PARTICIPANTE, LIDER, GAMECHANGER */}
          {(usuario.rol === 'PARTICIPANTE' || usuario.rol === 'LIDER' || usuario.rol === 'GAMECHANGER') && (
            <Link 
              href="/dashboard/mi-qr" 
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors group ${
                pathname === '/dashboard/mi-qr' 
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-gradient-to-r hover:from-cyan-900/30 hover:to-blue-900/30 hover:text-cyan-300'
              }`}
            >
              <QrCode size={18} className="text-cyan-400 group-hover:text-cyan-300" />
              <span className="font-medium">Mi QR Personal</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* Instalar App PWA */}
        <InstallAppButton variant="sidebar" />

        {/* Buzón Anónimo - Solo para PARTICIPANTE */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link
            href="/dashboard/buzon-anonimo"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors ${
              pathname === '/dashboard/buzon-anonimo'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-orange-900/20 hover:text-orange-300'
            }`}
          >
            <ShieldAlert size={20} className="text-orange-400" />
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
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
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
                <Lock className="w-6 h-6 text-orange-500" />
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
