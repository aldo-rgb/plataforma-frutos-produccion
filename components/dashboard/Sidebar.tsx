'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Trophy, Target, BarChart3, User, LogOut, 
  UserPlus, DollarSign, Package, Shield, 
  CreditCard, Gift, Compass, Bot, CheckCircle2, Lock, ClipboardCheck, Users, Calendar, ShieldAlert, CalendarCheck, Zap, Camera, Sparkles, Settings
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
    organization?: {
      id: number;
      name: string;
      logoUrl: string | null;
      brandColor: string | null;
    } | null;
  };
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const [cartaStatus, setCartaStatus] = useState<string | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellMessage, setUpsellMessage] = useState('');

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

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Lógica de bloqueo visual basada en TIER
  const esStaff = ['ADMINISTRADOR', 'COORDINADOR', 'MENTOR', 'GAMECHANGER'].includes(usuario.rol);
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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
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
              <span className="text-[9px] text-slate-500 uppercase tracking-widest -mt-1">
                Neural Network
              </span>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <Link 
          href="/dashboard" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link 
          href="/dashboard/hoy" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/hoy' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CalendarCheck size={20} className="text-blue-400" />
          <span>HOY</span>
        </Link>

        {/* THE VAULT - Quantum Archive */}
        <Link 
          href="/dashboard/vault" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            pathname === '/dashboard/vault' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
              : 'text-slate-400 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-blue-900/50 hover:text-white'
          }`}
        >
          <Camera size={20} className="text-purple-400 group-hover:text-purple-300" />
          <span className="font-semibold">The Vault</span>
        </Link>

        <Link 
          href="/dashboard/ciclos/guia" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/ciclos/guia' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Compass size={20} className="text-pink-500" />
          <span>Guía de Inicio</span>
        </Link>

        {/* Carta F.R.U.T.O.S. - Redirección dinámica según estado */}
        <Link 
          href={
            cartaStatus === 'CAMBIOS_REQUERIDOS' || cartaStatus === 'EN_REVISION' 
              ? '/dashboard/carta/resumen' 
              : '/dashboard/carta'
          } 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/carta' || pathname === '/dashboard/carta/resumen'
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Target size={20} className="text-purple-500" />
          <span>Carta F.R.U.T.O.S.</span>
        </Link>

        <Link 
          href="/dashboard/mentor-ia" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/mentor-ia' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Bot size={20} className="text-indigo-400" />
          <span>Mentor IA</span>
        </Link>

        {/* Quantum Detector - Monitor de Retrasos */}
        <Link 
          href="/dashboard/quantum-detector" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            pathname === '/dashboard/quantum-detector' 
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' 
              : 'text-slate-400 hover:bg-gradient-to-r hover:from-amber-900/50 hover:to-orange-900/50 hover:text-white'
          }`}
        >
          <Zap size={20} className="text-amber-400 group-hover:text-amber-300" />
          <span className="font-semibold">Quantum IA</span>
          <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Beta</span>
        </Link>

        {/* Solicitar Mentoría - Solo PARTICIPANTE - SIEMPRE DESBLOQUEADO (Upsell) */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link 
            href="/dashboard/mentorias" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard/mentorias' 
                ? 'bg-purple-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users size={20} className="text-purple-400" />
            <span>Solicitar Mentoría</span>
          </Link>
        )}

        {/* Mis Sesiones - Desbloqueado para todos */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link 
            href='/dashboard/student/mis-sesiones' 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard/student/mis-sesiones' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckCircle2 size={20} className="text-blue-400" />
            <span>Mis Sesiones</span>
          </Link>
        )}

        <Link 
          href='/dashboard/ranking' 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/ranking' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Trophy size={20} />
          <span>Ranking Global</span>
        </Link>

        {/* Muro de la Excelencia - SIEMPRE DESBLOQUEADO */}
        <Link 
          href="/dashboard/muro" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            pathname === '/dashboard/muro' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
              : 'text-slate-400 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-pink-900/50 hover:text-white'
          }`}
        >
          <Sparkles size={20} className="text-pink-400 group-hover:text-pink-300" />
          <span className="font-semibold">Muro de la Excelencia</span>
        </Link>

        <Link 
          href='/dashboard/canjear' 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/canjear' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Package size={20} />
          <span>Tienda / Canje</span>
        </Link>

        {/* Membresía - SIEMPRE VISIBLE (para upgrades) */}
        <Link 
          href="/dashboard/suscripcion" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/suscripcion' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CreditCard size={20} />
          <span>Membresía</span>
        </Link>

        {/* Panel de Game Changer */}
        {usuario.rol === 'GAME_CHANGER' && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel Game Changer</p>
            
            <Link 
              href="/dashboard/game-changer" 
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === '/dashboard/game-changer' || pathname.startsWith('/dashboard/game-changer/participante')
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} className="text-cyan-400" />
              <span>Mis Participantes</span>
            </Link>
          </div>
        )}

        {/* Panel de Mentor/Coordinador */}
        {(usuario.rol === 'MENTOR' || usuario.rol === 'COORDINADOR') && (
          <div className="pt-6 mt-6 border-t border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Panel de Mentor</p>
            
            <Link 
              href="/dashboard/mentor/revisiones" 
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

            {/* Nuevo: Misiones y Eventos para Mentores */}
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
                <span>Buzón Anónimo</span>
              </Link>
            )}

            {canAccess('finanzas') && (
              <Link 
                href="/dashboard/admin/pagos" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-emerald-900/20 transition-colors"
              >
                <DollarSign size={18} className="text-emerald-500" />
                <span>Finanzas</span>
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

            {canAccess('gestion_precios') && (
              <Link 
                href="/dashboard/admin/precios" 
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Target size={18} />
                <span>Gestión de Precios</span>
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

            {/* Órdenes de Licencias - Solo ADMIN */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR') && (
              <Link 
                href="/dashboard/admin/ordenes" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/ordenes')
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-emerald-900/20'
                }`}
              >
                <CreditCard size={18} className="text-emerald-400" />
                <span>Órdenes de Compra</span>
              </Link>
            )}

            {usuario.rol === 'ADMINISTRADOR' && (
              <Link 
                href="/dashboard/admin/payment-settings" 
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  pathname.startsWith('/dashboard/admin/payment-settings')
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-purple-900/20'
                }`}
              >
                <DollarSign size={18} className="text-purple-400" />
                <span>Config. Pagos</span>
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

            {/* Gestor de Misiones y Eventos - Solo Admin y Coordinador */}
            {(usuario.rol === 'ADMIN' || usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'COORDINADOR') && (
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
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* Configuración */}
        <Link
          href="/dashboard/configuracion"
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors ${
            pathname === '/dashboard/configuracion'
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
