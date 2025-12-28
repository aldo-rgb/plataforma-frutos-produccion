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
  const [rankingData, setRankingData] = useState<{
    topUsers: Array<{ id: number; nombre: string; puntos: number; position: number }>;
    userRank: { position: number; total: number } | null;
  } | null>(null);
  const [iaRecommendation, setIaRecommendation] = useState<{
    message: string;
    emoji: string;
  }>({
    message: 'Completa tus tareas de hoy para ganar más puntos 🚀',
    emoji: '💡'
  });

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

  // Obtener datos de ranking
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetch('/api/ranking/widget');
        if (response.ok) {
          const data = await response.json();
          setRankingData(data);
        }
      } catch (error) {
        console.error('Error fetching ranking:', error);
      }
    };

    if (usuario.rol === 'PARTICIPANTE') {
      fetchRanking();
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
          <span>Objetivos</span>
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

      {/* Widget de Ranking - Solo para PARTICIPANTE */}
      {usuario.rol === 'PARTICIPANTE' && rankingData && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-4">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Top Ranking
                </h3>
                <Link 
                  href="/dashboard/ranking"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Ver todo →
                </Link>
              </div>
            </div>

            {/* Top 3 */}
            <div className="px-3 py-3 space-y-2">
              {rankingData.topUsers.slice(0, 3).map((user, index) => {
                const isCurrentUser = user.id === usuario.id;
                const medals = ['🥇', '🥈', '🥉'];
                const gradients = [
                  'from-yellow-500/20 to-amber-600/20 border-yellow-500/40',
                  'from-slate-400/20 to-slate-500/20 border-slate-400/40',
                  'from-amber-600/20 to-orange-700/20 border-orange-500/40'
                ];

                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                      isCurrentUser 
                        ? `bg-gradient-to-r ${gradients[index]} border-2 shadow-lg scale-105` 
                        : `bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800/80`
                    }`}
                  >
                    {/* Posición con medalla */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-xl">
                      {medals[index]}
                    </div>

                    {/* Info del usuario */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${
                        isCurrentUser ? 'text-white' : 'text-slate-300'
                      }`}>
                        {isCurrentUser ? 'Tú' : user.nombre.split(' ')[0]}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {user.puntos.toLocaleString()} PC
                      </p>
                    </div>

                    {/* Badge si es el usuario actual */}
                    {isCurrentUser && (
                      <div className="flex-shrink-0 px-2 py-1 bg-purple-600 rounded-full">
                        <span className="text-[10px] font-bold text-white">TÚ</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Posición del usuario si no está en el top 3 */}
            {rankingData.userRank && rankingData.userRank.position > 3 && (
              <div className="px-3 pb-3">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-3"></div>
                <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-2 border-indigo-500/50 rounded-xl p-3 shadow-lg">
                  <div className="text-center mb-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Tu Posición</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                        #{rankingData.userRank.position}
                      </span>
                      <span className="text-sm text-slate-500">
                        de {rankingData.userRank.total}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-black/20 rounded-lg px-3 py-2">
                    <span className="text-slate-400">Tus puntos:</span>
                    <span className="font-bold text-purple-300">{usuario.puntosCuanticos.toLocaleString()} PC</span>
                  </div>
                  <Link
                    href="/dashboard/ranking"
                    className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-lg"
                  >
                    <Trophy className="w-3 h-3" />
                    Subir de Nivel
                  </Link>
                </div>
              </div>
            )}

            {/* Si está en el top 3, mostrar una mini celebración */}
            {rankingData.userRank && rankingData.userRank.position <= 3 && (
              <div className="px-3 pb-3">
                <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/50 rounded-xl p-3 text-center">
                  <p className="text-yellow-400 font-bold text-sm mb-1">🎉 ¡Estás en el Top 3!</p>
                  <p className="text-xs text-yellow-200/80">Sigue así para mantenerte en la cima</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
