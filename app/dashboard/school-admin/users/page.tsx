'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Filter, ArrowLeft, Trophy, Flame, Star,
  TrendingUp, Calendar, Award, Shield, Zap, Target,
  CreditCard, AlertTriangle, CheckCircle, Clock, FileText
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
          }));
          
          setUsers(userList);
          setFilteredUsers(userList);
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

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, paymentFilter, users]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/school-admin"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="text-cyan-400" />
                Mis Participantes
              </h1>
              <p className="text-slate-400 mt-2">
                Participantes, Game Changers, Coordinadores y Mentores activos
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">{filteredUsers.length}</p>
              <p className="text-sm text-slate-400">Total usuarios</p>
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 mb-6">
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
                className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  {/* Información del Usuario */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Ranking */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold text-lg">
                      {index + 1}
                    </div>

                    {/* Detalles */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{user.nombre}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.rol)}`}>
                          {getRoleName(user.rol)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTierBadgeColor(user.tier)}`}>
                          {user.tier}
                        </span>
                        {getPaymentBadge(user.paymentStatus)}
                      </div>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="flex items-center gap-6">
                    {/* XP */}
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="text-yellow-400" size={20} />
                        <p className="text-2xl font-black text-white">{user.experienciaXP}</p>
                      </div>
                      <p className="text-xs text-slate-400">XP Total</p>
                    </div>

                    {/* Estado */}
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <p className="text-xs text-slate-400">{user.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>

                    {/* Botón TOP FILE */}
                    <button
                      onClick={() => openTopFile(user.id, user.nombre)}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                      <FileText size={16} />
                      TOP FILE
                    </button>

                    {/* Ver Detalles */}
                    <Link
                      href={`/dashboard/school-admin/users/${user.id}`}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                      Ver Detalles
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
