'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, ArrowLeft, Save, Shield, GraduationCap,
  Briefcase, UserCheck, X, Check, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  esMentor: boolean;
  esEntrenador: boolean;
  esCoordinador: boolean;
  esLider: boolean;
  esCoordinadorBasico: boolean;
  esCoordinadorAvanzado: boolean;
}

export default function RolesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/school-admin/users-roles');
        const data = await res.json();
        
        if (data.success && data.users) {
          setUsers(data.users);
          setFilteredUsers(data.users);
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
    if (searchTerm) {
      const filtered = users.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const toggleRole = (userId: number, field: keyof User) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, [field]: !u[field] };
      }
      return u;
    }));
    setFilteredUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, [field]: !u[field] };
      }
      return u;
    }));
  };

  const saveUserRoles = async (user: User) => {
    setSaving(user.id);
    try {
      const res = await fetch('/api/school-admin/users-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          esMentor: user.esMentor,
          esEntrenador: user.esEntrenador,
          esCoordinador: user.esCoordinador,
          esLider: user.esLider,
          esCoordinadorBasico: user.esCoordinadorBasico,
          esCoordinadorAvanzado: user.esCoordinadorAvanzado,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setNotification({ type: 'success', message: `Roles de ${user.nombre} actualizados` });
      } else {
        setNotification({ type: 'error', message: data.error || 'Error al guardar' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSaving(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={48} />
      </div>
    );
  }

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'PARTICIPANTE': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'COORDINADOR': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'MENTOR': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'LIDER': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'GAMECHANGER': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
          notification.type === 'success' 
            ? 'bg-green-500/90 text-white border border-green-400' 
            : 'bg-red-500/90 text-white border border-red-400'
        }`}>
          {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
          {notification.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
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
                <Shield className="text-purple-400" />
                Gestión de Roles Múltiples
              </h1>
              <p className="text-slate-400 mt-2">
                Asigna roles adicionales a coordinadores, líderes y entrenadores
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 mb-6">
          <p className="text-sm text-slate-400 mb-3 font-medium">Roles Adicionales Disponibles:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                <GraduationCap size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Mentor</span>
              <span className="text-[10px] text-amber-400">(Solo vía Alta de Mentores)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center">
                <Briefcase size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Entrenador</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Coordinador</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <UserCheck size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Líder</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Coord. Básico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-300">Coord. Avanzado</span>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-12 text-center">
              <Users className="mx-auto text-slate-600 mb-4" size={64} />
              <p className="text-slate-400 text-lg">No se encontraron usuarios</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-slate-900/50 border border-slate-700 rounded-2xl p-5 hover:border-purple-500/50 transition-all"
              >
                <div className="flex flex-col gap-4">
                  {/* Info Usuario - Primera línea */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {user.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">{user.nombre}</h3>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${getRoleBadgeColor(user.rol)}`}>
                      {user.rol}
                    </span>
                  </div>

                  {/* Checkboxes de Roles - Segunda línea */}
                  <div className="flex flex-wrap items-center gap-3 pl-16">
                    {/* Mentor - Deshabilitado, solo via alta de mentores */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-not-allowed ${
                      user.esMentor 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : 'bg-slate-800 border-slate-700 opacity-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esMentor}
                        disabled
                        className="w-4 h-4 rounded"
                      />
                      <GraduationCap size={16} className={user.esMentor ? 'text-blue-400' : 'text-slate-500'} />
                      <span className={`text-sm ${user.esMentor ? 'text-blue-300' : 'text-slate-500'}`}>
                        Mentor
                      </span>
                    </label>

                    {/* Entrenador */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      user.esEntrenador 
                        ? 'bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30' 
                        : 'bg-slate-800 border-slate-700 hover:border-orange-500/30'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esEntrenador}
                        onChange={() => toggleRole(user.id, 'esEntrenador')}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                      <Briefcase size={16} className={user.esEntrenador ? 'text-orange-400' : 'text-slate-400'} />
                      <span className={`text-sm ${user.esEntrenador ? 'text-orange-300' : 'text-slate-300'}`}>
                        Entrenador
                      </span>
                    </label>

                    {/* Coordinador */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      user.esCoordinador 
                        ? 'bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30' 
                        : 'bg-slate-800 border-slate-700 hover:border-purple-500/30'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esCoordinador}
                        onChange={() => toggleRole(user.id, 'esCoordinador')}
                        className="w-4 h-4 rounded accent-purple-500"
                      />
                      <Shield size={16} className={user.esCoordinador ? 'text-purple-400' : 'text-slate-400'} />
                      <span className={`text-sm ${user.esCoordinador ? 'text-purple-300' : 'text-slate-300'}`}>
                        Coordinador
                      </span>
                    </label>

                    {/* Líder */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      user.esLider 
                        ? 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30' 
                        : 'bg-slate-800 border-slate-700 hover:border-green-500/30'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esLider}
                        onChange={() => toggleRole(user.id, 'esLider')}
                        className="w-4 h-4 rounded accent-green-500"
                      />
                      <UserCheck size={16} className={user.esLider ? 'text-green-400' : 'text-slate-400'} />
                      <span className={`text-sm ${user.esLider ? 'text-green-300' : 'text-slate-300'}`}>
                        Líder
                      </span>
                    </label>

                    {/* Coordinador Básico */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      user.esCoordinadorBasico 
                        ? 'bg-teal-500/20 border-teal-500/50 hover:bg-teal-500/30' 
                        : 'bg-slate-800 border-slate-700 hover:border-teal-500/30'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esCoordinadorBasico}
                        onChange={() => toggleRole(user.id, 'esCoordinadorBasico')}
                        className="w-4 h-4 rounded accent-teal-500"
                      />
                      <Shield size={16} className={user.esCoordinadorBasico ? 'text-teal-400' : 'text-slate-400'} />
                      <span className={`text-sm ${user.esCoordinadorBasico ? 'text-teal-300' : 'text-slate-300'}`}>
                        Coord. Básico
                      </span>
                    </label>

                    {/* Coordinador Avanzado */}
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      user.esCoordinadorAvanzado 
                        ? 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30' 
                        : 'bg-slate-800 border-slate-700 hover:border-rose-500/30'
                    }`}>
                      <input
                        type="checkbox"
                        checked={user.esCoordinadorAvanzado}
                        onChange={() => toggleRole(user.id, 'esCoordinadorAvanzado')}
                        className="w-4 h-4 rounded accent-rose-500"
                      />
                      <Shield size={16} className={user.esCoordinadorAvanzado ? 'text-rose-400' : 'text-slate-400'} />
                      <span className={`text-sm ${user.esCoordinadorAvanzado ? 'text-rose-300' : 'text-slate-300'}`}>
                        Coord. Avanzado
                      </span>
                    </label>

                    {/* Botón Guardar */}
                    <button
                      onClick={() => saveUserRoles(user)}
                      disabled={saving === user.id}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                    >
                      {saving === user.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
