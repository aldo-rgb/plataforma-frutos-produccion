'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Users, Calendar, Plus, Eye, Edit, X, Check, AlertTriangle, Database } from 'lucide-react';

type TabType = 'visiones' | 'usuarios' | 'search';

interface Vision {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  _count?: {
    usuarios: number;
  };
}

interface User {
  id: number;
  nombre: string;
  email: string;
  visionId: number | null;
  vision?: {
    name: string;
  } | null;
  ProgramEnrollment?: Array<{
    cycleType: string;
    cycleStartDate: string;
    cycleEndDate: string;
    status: string;
  }>;
}

export default function AdminCycleManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('visiones');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Estados para Visiones
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loadingVisiones, setLoadingVisiones] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);
  const [newVision, setNewVision] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  
  // Estados para Usuarios
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [filterCycleType, setFilterCycleType] = useState<'ALL' | 'SOLO' | 'VISION'>('ALL');
  
  // Estados para selector de usuarios en visión
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<User[]>([]);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<number[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);

  useEffect(() => {
    if (activeTab === 'visiones') {
      loadVisiones();
    } else if (activeTab === 'usuarios') {
      loadUsuarios();
    }
  }, [activeTab]);

  // Cargar usuarios disponibles cuando se abre el modal
  useEffect(() => {
    if (showCreateModal) {
      loadUsuariosDisponibles();
    } else {
      // Limpiar selección al cerrar modal
      setUsuariosSeleccionados([]);
    }
  }, [showCreateModal]);

  // ========== BÚSQUEDA INDIVIDUAL ==========
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setError('Ingresa un ID de usuario');
      return;
    }

    setSearching(true);
    setError('');
    setUserData(null);

    try {
      const res = await fetch(`/api/admin/user/${searchTerm}`);
      const data = await res.json();

      if (res.ok) {
        setUserData(data);
      } else {
        setError(data.error || 'Usuario no encontrado');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al buscar usuario');
    } finally {
      setSearching(false);
    }
  };

  // ========== VISIONES ==========
  const loadVisiones = async () => {
    setLoadingVisiones(true);
    try {
      const res = await fetch('/api/admin/visiones');
      const data = await res.json();
      
      if (res.ok) {
        setVisiones(data.visiones || []);
        if (data.message) {
          setShowMigrationWarning(true);
        }
      }
    } catch (err) {
      console.error('Error loading visiones:', err);
    } finally {
      setLoadingVisiones(false);
    }
  };

  const loadUsuariosDisponibles = async () => {
    setLoadingDisponibles(true);
    try {
      const res = await fetch('/api/admin/usuarios-disponibles');
      const data = await res.json();
      if (res.ok) {
        setUsuariosDisponibles(data.usuarios || []);
      }
    } catch (err) {
      console.error('Error loading usuarios disponibles:', err);
    } finally {
      setLoadingDisponibles(false);
    }
  };

  const handleCreateVision = async () => {
    if (!newVision.name || !newVision.startDate || !newVision.endDate) {
      alert('Completa todos los campos obligatorios');
      return;
    }

    if (usuariosSeleccionados.length === 0) {
      alert('Selecciona al menos un usuario para la visión');
      return;
    }

    try {
      const res = await fetch('/api/admin/visiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVision,
          usuarioIds: usuariosSeleccionados
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateModal(false);
        setNewVision({ name: '', description: '', startDate: '', endDate: '' });
        setUsuariosSeleccionados([]);
        
        // Mostrar mensaje de éxito
        if (data.message) {
          alert(`✅ ${data.message}`);
        }
        
        loadVisiones();
        
        // Si estamos en la pestaña de usuarios, recargar también
        if (activeTab === 'usuarios') {
          loadUsuarios();
        }
      } else {
        if (data.migracionRequerida) {
          setShowMigrationWarning(true);
        }
        alert(data.error || 'Error al crear visión');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al crear visión');
    }
  };

  // ========== USUARIOS ==========
  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const res = await fetch(`/api/admin/usuarios-ciclos?type=${filterCycleType}`);
      const data = await res.json();
      if (res.ok) {
        setUsuarios(data.usuarios || []);
        if (data.message && filterCycleType !== 'ALL') {
          setShowMigrationWarning(true);
        }
      }
    } catch (err) {
      console.error('Error loading usuarios:', err);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'usuarios') {
      loadUsuarios();
    }
  }, [filterCycleType, activeTab]);

  return (
    <div className="min-h-screen bg-[#0f1015] p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Administración de Ciclos</h1>
          <p className="text-gray-400">Sistema Híbrido: Ciclos Personales vs Visiones Grupales</p>
        </div>

        {/* ALERTA DE MIGRACIÓN */}
        {showMigrationWarning && (
          <div className="mb-6 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Database className="text-amber-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-400 mb-2">⚠️ Migración Pendiente</h3>
                <p className="text-gray-300 text-sm mb-3">
                  El sistema de ciclos híbridos requiere ejecutar la migración de base de datos antes de estar completamente funcional.
                </p>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 mb-3">
                  <p className="text-xs text-gray-400 mb-2 font-mono">Ejecuta en la terminal:</p>
                  <code className="text-xs text-purple-400 font-mono">
                    npx prisma migrate deploy --name 20251218_ciclos_hibridos
                  </code>
                </div>
                <p className="text-xs text-gray-500">
                  📄 Ver documentación completa en: <span className="text-purple-400">SISTEMA-CICLOS-HIBRIDOS.md</span>
                </p>
              </div>
              <button 
                onClick={() => setShowMigrationWarning(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('visiones')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'visiones'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Calendar className="inline mr-2" size={18} />
            Visiones Grupales
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'usuarios'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Users className="inline mr-2" size={18} />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 font-bold transition-all ${
              activeTab === 'search'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Search className="inline mr-2" size={18} />
            Búsqueda Individual
          </button>
        </div>

        {/* ========== TAB: VISIONES ========== */}
        {activeTab === 'visiones' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Visiones / Generaciones</h2>
                <p className="text-sm text-gray-500 mt-1">Grupos con ciclos compartidos y fechas fin configurables</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <Plus size={18} />
                Nueva Visión
              </button>
            </div>

            {loadingVisiones ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : visiones.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-bold mb-2">No hay visiones creadas</p>
                <p className="text-sm text-gray-500">Las visiones son grupos con ciclos compartidos (ej: "Generación Alpha 2025")</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all"
                >
                  Crear Primera Visión
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {visiones.map((vision) => {
                  const start = new Date(vision.startDate);
                  const end = new Date(vision.endDate);
                  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={vision.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-purple-500/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{vision.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              vision.status === 'ACTIVE' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {vision.status}
                            </span>
                          </div>
                          {vision.description && (
                            <p className="text-gray-400 text-sm mb-3">{vision.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Inicio:</span>
                              <span className="text-white ml-2">{start.toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Fin:</span>
                              <span className="text-white ml-2">{end.toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Duración:</span>
                              <span className="text-purple-400 ml-2 font-bold">{totalDays} días</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Usuarios:</span>
                              <span className="text-cyan-400 ml-2 font-bold">{vision._count?.usuarios || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all">
                            <Eye size={18} />
                          </button>
                          <button className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all">
                            <Edit size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: USUARIOS ========== */}
        {activeTab === 'usuarios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Usuarios por Tipo de Ciclo</h2>
                <p className="text-sm text-gray-500 mt-1">🐺 Ciclo Personal (100 días) vs 🌟 Visión Grupal (fecha variable)</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterCycleType('ALL')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    filterCycleType === 'ALL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterCycleType('SOLO')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    filterCycleType === 'SOLO'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  🐺 Personal
                </button>
                <button
                  onClick={() => setFilterCycleType('VISION')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    filterCycleType === 'VISION'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  🌟 Visión
                </button>
              </div>
            </div>

            {loadingUsuarios ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : usuarios.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-bold mb-2">No hay usuarios con este tipo de ciclo</p>
                <p className="text-sm text-gray-500">Prueba cambiando el filtro o ejecuta la migración para ver datos de ciclos</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {usuarios.map((user) => {
                  const enrollment = user.ProgramEnrollment?.[0];
                  const hasVision = user.visionId !== null;
                  
                  return (
                    <div key={user.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-purple-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{user.nombre}</h3>
                            <span className="text-sm text-gray-500">#{user.id}</span>
                            {enrollment ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                enrollment.cycleType === 'SOLO'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {enrollment.cycleType === 'SOLO' ? '🐺 Personal (100d)' : '🌟 Visión'}
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-400">
                                Sin ciclo activo
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{user.email}</p>
                          {user.vision && (
                            <p className="text-sm mb-2">
                              <span className="text-gray-500">Visión:</span>
                              <span className="text-purple-400 ml-2 font-bold">{user.vision.name}</span>
                            </p>
                          )}
                          {enrollment && (
                            <div className="flex gap-4 text-xs text-gray-500 mt-2">
                              <span>📅 {new Date(enrollment.cycleStartDate).toLocaleDateString()}</span>
                              <span>→</span>
                              <span>📅 {new Date(enrollment.cycleEndDate).toLocaleDateString()}</span>
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                enrollment.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'text-gray-400'
                              }`}>
                                {enrollment.status}
                              </span>
                            </div>
                          )}
                        </div>
                        <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all">
                          Gestionar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: BÚSQUEDA INDIVIDUAL ========== */}
        {activeTab === 'search' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Búsqueda Individual</h2>
              <p className="text-sm text-gray-500">Busca un usuario específico por su ID</p>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ID de usuario..."
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {searching ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Search size={20} />
                  )}
                  Buscar
                </button>
              </div>
            </form>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-4">
                {error}
              </div>
            )}

            {userData && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{userData.nombre}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="text-white font-mono">{userData.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="text-white font-mono">#{userData.id}</p>
                  </div>
                  {userData.enrollment && (
                    <>
                      <div>
                        <span className="text-gray-500">Tipo de Ciclo:</span>
                        <p className="text-purple-400 font-bold">{userData.enrollment.cycleType}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Estado:</span>
                        <p className="text-green-400 font-bold">{userData.enrollment.status}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== MODAL: CREAR VISIÓN ========== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Crear Nueva Visión</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={newVision.name}
                  onChange={(e) => setNewVision({ ...newVision, name: e.target.value })}
                  placeholder="Ej: Generación Alpha 2025"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Descripción</label>
                <textarea
                  value={newVision.description}
                  onChange={(e) => setNewVision({ ...newVision, description: e.target.value })}
                  placeholder="Descripción opcional..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={newVision.startDate}
                    onChange={(e) => setNewVision({ ...newVision, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">Fecha Fin *</label>
                  <input
                    type="date"
                    value={newVision.endDate}
                    onChange={(e) => setNewVision({ ...newVision, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-400">
                    Usuarios * {usuariosSeleccionados.length > 0 && (
                      <span className="text-purple-400">({usuariosSeleccionados.length} seleccionados)</span>
                    )}
                  </label>
                  {usuariosDisponibles.length > 0 && (
                    <button
                      onClick={() => {
                        if (usuariosSeleccionados.length === usuariosDisponibles.length) {
                          setUsuariosSeleccionados([]);
                        } else {
                          setUsuariosSeleccionados(usuariosDisponibles.map(u => u.id));
                        }
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {usuariosSeleccionados.length === usuariosDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
                
                {loadingDisponibles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-purple-500" size={24} />
                  </div>
                ) : usuariosDisponibles.length === 0 ? (
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">No hay usuarios disponibles sin ciclo activo</p>
                    <p className="text-xs text-gray-500 mt-1">Los usuarios deben completar su carta primero</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                    {usuariosDisponibles.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-750 cursor-pointer border-b border-gray-700 last:border-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={usuariosSeleccionados.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUsuariosSeleccionados([...usuariosSeleccionados, user.id]);
                            } else {
                              setUsuariosSeleccionados(usuariosSeleccionados.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{user.nombre}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-xs text-purple-300">
                  💡 Los usuarios asignados a esta visión compartirán el mismo ciclo hasta la fecha fin configurada
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateVision}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Check size={18} />
                Crear Visión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
