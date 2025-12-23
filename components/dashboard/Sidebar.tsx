'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Trophy, Target, BarChart3, User, LogOut, 
  UserPlus, DollarSign, Package, Shield, 
  CreditCard, Gift, Compass, Bot, CheckCircle2, Lock, ClipboardCheck, Users, Calendar, ShieldAlert, CalendarCheck, Zap, Camera
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
    permissions?: string[]; // Array de IDs de permisos permitidos
  };
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const [cartaStatus, setCartaStatus] = useState<string | null>(null);

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

  // Lógica de bloqueo visual
  const esStaff = ['ADMINISTRADOR', 'COORDINADOR', 'MENTOR', 'GAMECHANGER'].includes(usuario.rol);
  const esUsuarioInactivo = !esStaff && usuario.suscripcion === 'INACTIVO';

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
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Target className="text-white" size={20} />
        </div>
        <span className="font-bold text-xl text-white tracking-wider">
          IMPACTO <span className="text-blue-500">VIA</span>
        </span>
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
              : esUsuarioInactivo 
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => esUsuarioInactivo && e.preventDefault()}
        >
          <CalendarCheck size={20} className="text-blue-400" />
          <span>HOY</span>
          {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        {/* THE VAULT - Quantum Archive */}
        <Link 
          href="/dashboard/vault" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            pathname === '/dashboard/vault' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
              : esUsuarioInactivo 
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-blue-900/50 hover:text-white'
          }`}
          onClick={(e) => esUsuarioInactivo && e.preventDefault()}
        >
          <Camera size={20} className="text-purple-400 group-hover:text-purple-300" />
          <span className="font-semibold">The Vault</span>
          {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        <Link 
          href="/dashboard/ciclos/guia" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/ciclos/guia' 
              ? 'bg-blue-600 text-white' 
              : esUsuarioInactivo 
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => esUsuarioInactivo && e.preventDefault()}
        >
          <Compass size={20} className="text-pink-500" />
          <span>Guía de Inicio</span>
          {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
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
              : esUsuarioInactivo 
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => esUsuarioInactivo && e.preventDefault()}
        >
          <Target size={20} className="text-purple-500" />
          <span>Carta F.R.U.T.O.S.</span>
          {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        <Link 
          href="/dashboard/mentor-ia" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/mentor-ia' 
              ? 'bg-blue-600 text-white' 
              : esUsuarioInactivo 
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => esUsuarioInactivo && e.preventDefault()}
        >
          <Bot size={20} className="text-indigo-400" />
          <span>Mentor IA</span>
          {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        {/* Solicitar Mentoría - Solo PARTICIPANTE */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link 
            href="/dashboard/mentorias" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard/mentorias' 
                ? 'bg-purple-600 text-white' 
                : esUsuarioInactivo 
                  ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={(e) => esUsuarioInactivo && e.preventDefault()}
          >
            <Users size={20} className="text-purple-400" />
            <span>Solicitar Mentoría</span>
            {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
          </Link>
        )}

        {/* Mis Sesiones - Solo PARTICIPANTE */}
        {usuario.rol === 'PARTICIPANTE' && (
          <Link 
            href="/dashboard/student/mis-sesiones" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard/student/mis-sesiones' 
                ? 'bg-blue-600 text-white' 
                : esUsuarioInactivo 
                  ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={(e) => esUsuarioInactivo && e.preventDefault()}
          >
            <CheckCircle2 size={20} className="text-blue-400" />
            <span>Mis Sesiones</span>
            {esUsuarioInactivo && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
          </Link>
        )}

        <Link 
          href="/dashboard/ranking" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/ranking' 
              ? 'bg-blue-600 text-white' 
              : esUsuarioInactivo || !canAccess('ranking')
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => (esUsuarioInactivo || !canAccess('ranking')) && e.preventDefault()}
        >
          <Trophy size={20} />
          <span>Ranking Global</span>
          {(esUsuarioInactivo || !canAccess('ranking')) && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        <Link 
          href="/dashboard/canjear" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/canjear' 
              ? 'bg-blue-600 text-white' 
              : esUsuarioInactivo || !canAccess('tienda')
                ? 'text-slate-600 opacity-50 cursor-not-allowed' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => (esUsuarioInactivo || !canAccess('tienda')) && e.preventDefault()}
        >
          <Package size={20} />
          <span>Tienda / Canje</span>
          {(esUsuarioInactivo || !canAccess('tienda')) && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        <Link 
          href="/dashboard/suscripcion" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname === '/dashboard/suscripcion' 
              ? 'bg-blue-600 text-white' 
              : !canAccess('membresia')
                ? 'text-slate-600 opacity-50 cursor-not-allowed'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          onClick={(e) => !canAccess('membresia') && e.preventDefault()}
        >
          <CreditCard size={20} />
          <span>Membresía</span>
          {!canAccess('membresia') && <Lock className="w-3 h-3 ml-auto text-slate-500" />}
        </Link>

        {/* Panel de Mentor/Coordinador */}
        {(usuario.rol === 'MENTOR' || usuario.rol === 'COORDINADOR' || usuario.rol === 'GAME_CHANGER') && (
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
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
