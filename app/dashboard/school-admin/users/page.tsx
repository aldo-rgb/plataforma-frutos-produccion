'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Filter, ArrowLeft, Trophy, Flame, Star,
  TrendingUp, Calendar, Award, Shield, Zap, Target,
  CreditCard, AlertTriangle, CheckCircle, Clock, FileText,
  Heart, ClipboardCheck, Briefcase, ScrollText, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import TopFileModal from '@/components/el-cruce/TopFileModal';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  tier: string;
  experienciaXP: number;
  isActive: boolean;
  createdAt: string;
  paymentStatus: string;
  ticketsCount: number;
  // Nuevos campos de filtros
  levels: string[];
  visionIds: number[];
  visiones: { id: number; nombre: string }[];
  // Combinaciones vision_level para filtrado preciso
  visionLevelCombos: string[];
  // Campos de cuestionarios
  quizMedico: boolean;
  quizAvanzado: boolean;
  cartaFrutos: string | null;
  tieneNegocio: boolean;
  negocioStatus: string | null;
  invitadosEnrolados: number;
}

interface VisionOption {
  id: number;
  nombre: string;
}

export default function UsersListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [visionFilter, setVisionFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [visionOptions, setVisionOptions] = useState<VisionOption[]>([]);
  
  // Estado para TOP FILE modal
  const [topFileModal, setTopFileModal] = useState<{ isOpen: boolean; userId: number; userName: string }>({
    isOpen: false,
    userId: 0,
    userName: ''
  });

  const openTopFile = (userId: number, userName: string) => {
    setTopFileModal({ isOpen: true, userId, userName });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/school-admin/users');
        const data = await res.json();
        
        console.log('API Response:', data);
        
        if (data.error) {
          console.error('API Error:', data.error);
        }
        
        if (data.success && data.users) {
          const userList = data.users.map((u: any) => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol,
            tier: u.tier || 'BASIC',
            experienciaXP: u.experienciaXP || 0,
            isActive: u.isActive,
            createdAt: u.createdAt,
            paymentStatus: u.paymentStatus || 'NO_TICKET',
            ticketsCount: u.ticketsCount || 0,
            levels: u.levels || [],
            visionIds: u.visionIds || [],
            visiones: u.visiones || [],
            visionLevelCombos: u.visionLevelCombos || [],
            quizMedico: u.quizMedico || false,
            quizAvanzado: u.quizAvanzado || false,
            cartaFrutos: u.cartaFrutos || null,
            tieneNegocio: u.tieneNegocio || false,
            negocioStatus: u.negocioStatus || null,
            invitadosEnrolados: u.invitadosEnrolados || 0,
          }));
          
          setUsers(userList);
          setFilteredUsers(userList);
          
          // Guardar opciones de visiones para el filtro
          if (data.visiones) {
            setVisionOptions(data.visiones);
          }
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status]);

  useEffect(() => {
    let filtered = users;

    // Filtrar por rol
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.rol === roleFilter);
    }

    // Filtrar por estado de pago
    if (paymentFilter !== 'ALL') {
      filtered = filtered.filter(u => u.paymentStatus === paymentFilter);
    }

    // Filtrar por visión
    if (visionFilter !== 'ALL') {
      const visionId = parseInt(visionFilter);
      // Si también hay filtro de nivel, usar combinación precisa
      if (levelFilter !== 'ALL') {
        const combo = `${visionId}_${levelFilter}`;
        filtered = filtered.filter(u => u.visionLevelCombos.includes(combo));
      } else {
        filtered = filtered.filter(u => u.visionIds.includes(visionId));
      }
    } else if (levelFilter !== 'ALL') {
      // Solo filtro de nivel sin visión específica
      filtered = filtered.filter(u => u.levels.includes(levelFilter));
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, paymentFilter, visionFilter, levelFilter, users]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'PARTICIPANTE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'GAMECHANGER':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'COORDINADOR':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'MENTOR':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'PREMIUM':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'FREE':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white';
      default:
        return 'bg-slate-600 text-slate-200';
    }
  };

  const getRoleName = (rol: string) => {
    switch (rol) {
      case 'PARTICIPANTE':
        return 'Participante';
      case 'GAMECHANGER':
        return 'Game Changer';
      case 'COORDINADOR':
        return 'Coordinador';
      case 'MENTOR':
        return 'Mentor';
      default:
        return rol;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle size={12} />
            Pagado
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock size={12} />
            Parcial
          </span>
        );
      case 'UNPAID':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle size={12} />
            Sin Pago
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/dashboard/school-admin"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                <Users className="text-cyan-400 w-6 h-6 sm:w-auto sm:h-auto" />
                Mis Participantes
              </h1>
              <p className="text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Participantes, Game Changers, Coordinadores y Mentores activos
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl sm:text-3xl font-black text-white">{filteredUsers.length}</p>
              <p className="text-xs sm:text-sm text-slate-400">Total usuarios</p>
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Filtro por Rol */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Todos los roles</option>
                <option value="PARTICIPANTE">Participantes</option>
                <option value="GAMECHANGER">Game Changers</option>
                <option value="COORDINADOR">Coordinadores</option>
                <option value="MENTOR">Mentores</option>
              </select>
            </div>

            {/* Filtro por Estado de Pago */}
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Todos los pagos</option>
                <option value="PAID">✅ Pagado</option>
                <option value="PARTIAL">⏳ Pago Parcial</option>
                <option value="UNPAID">⚠️ Sin Pagar</option>
                <option value="NO_TICKET">📭 Sin Ticket</option>
              </select>
            </div>
          </div>
          
          {/* Segunda fila de filtros: Visión y Nivel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Filtro por Visión */}
            <div className="relative">
              <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={visionFilter}
                onChange={(e) => setVisionFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer"
              >
                <option value="ALL">🎯 Todas las visiones</option>
                {visionOptions.map((vision) => (
                  <option key={vision.id} value={vision.id.toString()}>
                    {vision.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Nivel */}
            <div className="relative">
              <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer"
              >
                <option value="ALL">🏆 Todos los niveles</option>
                <option value="BASIC">📘 Básico</option>
                <option value="ADVANCED">📗 Avanzado</option>
                <option value="PL">📕 Liderato (PL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-12 text-center">
              <Users className="mx-auto text-slate-600 mb-4" size={64} />
              <p className="text-slate-400 text-lg">No se encontraron usuarios</p>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Información del Usuario */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    {/* Ranking */}
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold text-base sm:text-lg">
                      {index + 1}
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                        <h3 className="text-base sm:text-xl font-bold text-white truncate">{user.nombre}</h3>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${getRoleBadgeColor(user.rol)}`}>
                          {getRoleName(user.rol)}
                        </span>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${getTierBadgeColor(user.tier)}`}>
                          {user.tier}
                        </span>
                        {getPaymentBadge(user.paymentStatus)}
                      </div>
                      <p className="text-slate-400 text-xs sm:text-sm truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Indicadores de Cuestionarios - Grid en móvil */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                    {/* Quiz Médico */}
                    <div className="relative group/tooltip">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${user.quizMedico ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <Heart size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                        Quiz Médico {user.quizMedico ? '✓' : '✗'}
                      </span>
                    </div>
                    
                    {/* Quiz Avanzado */}
                    <div className="relative group/tooltip">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${user.quizAvanzado ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <ClipboardCheck size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                        Quiz Avanzado {user.quizAvanzado ? '✓' : '✗'}
                      </span>
                    </div>
                    
                    {/* Negocio */}
                    <div className="relative group/tooltip">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${user.tieneNegocio ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <Briefcase size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                        Negocio {user.tieneNegocio ? (user.negocioStatus === 'APPROVED' ? '✓ Aprobado' : `(${user.negocioStatus})`) : '✗'}
                      </span>
                    </div>
                    
                    {/* Carta de Frutos */}
                    <div className="relative group/tooltip">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${user.cartaFrutos === 'APROBADA' ? 'bg-emerald-500/20 text-emerald-400' : user.cartaFrutos ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <ScrollText size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                        Carta {user.cartaFrutos || 'Sin carta'}
                      </span>
                    </div>
                    
                    {/* Invitados Enrolados */}
                    <div className="relative group/tooltip">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${user.invitadosEnrolados > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <UserPlus size={14} className="sm:w-4 sm:h-4" />
                      </div>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                        {user.invitadosEnrolados} Enrolados
                      </span>
                    </div>
                  </div>

                  {/* Estadísticas y Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-700/50">
                    {/* XP */}
                    <div className="text-center">
                      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                        <Trophy className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
                        <p className="text-lg sm:text-2xl font-black text-white">{user.experienciaXP}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400">XP Total</p>
                    </div>

                    {/* Estado */}
                    <div className="text-center hidden sm:block">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <p className="text-xs text-slate-400">{user.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>

                    {/* Botón TOP FILE */}
                    <button
                      onClick={() => openTopFile(user.id, user.nombre)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1 sm:gap-2"
                    >
                      <FileText size={14} className="sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">TOP FILE</span>
                      <span className="sm:hidden">TOP</span>
                    </button>

                    {/* Ver Detalles */}
                    <Link
                      href={`/dashboard/school-admin/users/${user.id}`}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                    >
                      <span className="hidden sm:inline">Ver Detalles</span>
                      <span className="sm:hidden">Ver</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen de Estadísticas por Rol */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.rol === 'PARTICIPANTE').length}
                </p>
                <p className="text-sm text-slate-400">Participantes</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Zap className="text-purple-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.rol === 'GAMECHANGER').length}
                </p>
                <p className="text-sm text-slate-400">Game Changers</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Target className="text-emerald-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.rol === 'COORDINADOR').length}
                </p>
                <p className="text-sm text-slate-400">Coordinadores</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Award className="text-orange-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.rol === 'MENTOR').length}
                </p>
                <p className="text-sm text-slate-400">Mentores Activos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Estadísticas por Pago */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.paymentStatus === 'PAID').length}
                </p>
                <p className="text-sm text-slate-400">Pagados</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.paymentStatus === 'PARTIAL').length}
                </p>
                <p className="text-sm text-slate-400">Pago Parcial</p>
              </div>
            </div>
          </div>

          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.paymentStatus === 'UNPAID').length}
                </p>
                <p className="text-sm text-slate-400">Sin Pagar</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-600/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="text-slate-400" size={24} />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => !u.paymentStatus || u.paymentStatus === 'NO_TICKET').length}
                </p>
                <p className="text-sm text-slate-400">Sin Ticket</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP FILE Modal */}
      <TopFileModal
        userId={topFileModal.userId}
        userName={topFileModal.userName}
        isOpen={topFileModal.isOpen}
        onClose={() => setTopFileModal({ isOpen: false, userId: 0, userName: '' })}
      />
    </div>
  );
}
