'use client';

import { useState, useEffect } from 'react';
import { Search, Key, Shield, User, Edit, Save, X, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  isActive: boolean;
  assignedMentorId?: number;
}

interface Mentor {
  id: number;
  nombre: string;
  email: string;
}

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADOS DEL MODAL DE CONTRASEÑA
  const [userPasswordModal, setUserPasswordModal] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [mensajeExitoPassword, setMensajeExitoPassword] = useState('');

  // ESTADOS DEL MODAL DE EDICIÓN
  const [userEditModal, setUserEditModal] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [mensajeExitoEdit, setMensajeExitoEdit] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ESTADOS DEL MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{userId: number, userName: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ESTADOS DEL MODAL DE ÉXITO
  const [successModal, setSuccessModal] = useState<{show: boolean, message: string}>({show: false, message: ''});

  // ESTADOS DEL MODAL DE CAMBIO DE MENTOR
  const [changeMentorModal, setChangeMentorModal] = useState<{userId: number, userName: string, currentMentorId?: number} | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [isChangingMentor, setIsChangingMentor] = useState(false);
  const [changeMentorWarning, setChangeMentorWarning] = useState<{sesionesCompletadas: number, sesionesCanceladas: number} | null>(null);

  // CARGAR USUARIOS REALES
  useEffect(() => {
    cargarUsuarios();
    cargarMentores();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      // El API retorna { usuarios: [...] }
      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setUsuarios([]); // Asegurar que siempre sea array
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMentores = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error('Error al cargar mentores');
      const data = await response.json();
      // Filtrar solo mentores activos
      const mentoresActivos = (data.usuarios || []).filter((u: Usuario) => 
        u.rol === 'MENTOR' && u.isActive
      );
      setMentores(mentoresActivos);
    } catch (error) {
      console.error('Error al cargar mentores:', error);
      setMentores([]);
    }
  };

  // FILTRADO
  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ABRIR MODAL DE CONTRASEÑA
  const abrirModalReset = (user: Usuario) => {
    setUserPasswordModal(user);
    setNewPassword('');
    setMensajeExitoPassword('');
    setShowPassword(false);
  };

  // ABRIR MODAL DE EDICIÓN
  const abrirModalEditar = (user: Usuario) => {
    setUserEditModal(user);
    setEditNombre(user.nombre);
    setEditEmail(user.email);
    setEditRol(user.rol);
    setEditIsActive(user.isActive);
    setMensajeExitoEdit('');
    setErrorMessage(null);
  };

  // GUARDAR NUEVA CONTRASEÑA
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPasswordModal) return;
    
    setIsSavingPassword(true);

    try {
      const response = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userPasswordModal.id,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña');
      }

      setMensajeExitoPassword(data.message || `Contraseña actualizada para ${userPasswordModal.nombre}`);
      
      // Cerramos el modal después de 2 segundos
      setTimeout(() => {
        setUserPasswordModal(null);
        setMensajeExitoPassword('');
        setNewPassword('');
      }, 2000);

    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al actualizar contraseña');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // GUARDAR EDICIÓN DE USUARIO (NOMBRE, EMAIL, ROL Y ESTADO)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEditModal) return;

    // Limpiar mensaje de error previo
    setErrorMessage(null);

    // Validación de email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }
    
    setIsSavingEdit(true);

    try {
      const response = await fetch(`/api/usuarios/${userEditModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editNombre.trim(),
          email: editEmail.trim().toLowerCase(),
          rol: editRol,
          isActive: editIsActive
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejo específico de error 409 (email duplicado)
        if (response.status === 409) {
          setErrorMessage('Este correo ya está registrado por otro usuario. Por favor usa uno diferente.');
          return;
        }
        // Manejo de error 400 (rol inválido u otro error de validación)
        if (response.status === 400) {
          setErrorMessage(data.error || 'Datos inválidos. Verifica que el rol seleccionado sea válido.');
          return;
        }
        // Manejo de error 403 (no autorizado)
        if (response.status === 403) {
          setErrorMessage('No tienes permisos para realizar esta acción.');
          return;
        }
        // Error genérico
        setErrorMessage(data.error || 'No se pudo guardar. Intenta nuevamente.');
        return;
      }

      setMensajeExitoEdit('Usuario actualizado exitosamente');
      
      // Recargar usuarios
      await cargarUsuarios();
      
      // Cerramos el modal después de 1.5 segundos
      setTimeout(() => {
        setUserEditModal(null);
        setMensajeExitoEdit('');
        setErrorMessage(null);
      }, 1500);

    } catch (error: any) {
      console.error('Error update:', error);
      setErrorMessage('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // CAMBIAR MENTOR
  const abrirModalCambioMentor = (user: Usuario) => {
    setChangeMentorModal({
      userId: user.id,
      userName: user.nombre,
      currentMentorId: user.assignedMentorId
    });
    setSelectedMentorId(user.assignedMentorId || null);
    setChangeMentorWarning(null);
  };

  const handleCambiarMentor = async () => {
    if (!changeMentorModal || !selectedMentorId) return;

    setIsChangingMentor(true);

    try {
      const response = await fetch('/api/usuarios/cambiar-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: changeMentorModal.userId,
          nuevoMentorId: selectedMentorId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al cambiar mentor');
        return;
      }

      // Mostrar resumen del cambio
      setChangeMentorWarning({
        sesionesCompletadas: data.detalles.sesionesCompletadas,
        sesionesCanceladas: data.detalles.sesionesCanceladas
      });

      // Recargar usuarios
      await cargarUsuarios();

      // Mostrar mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccessModal({
          show: true,
          message: `Mentor cambiado exitosamente. ${data.detalles.requiereReagendar ? 'El estudiante deberá re-agendar sus sesiones.' : ''}`
        });
        setChangeMentorModal(null);
        setChangeMentorWarning(null);
      }, 2000);

    } catch (error) {
      console.error('Error al cambiar mentor:', error);
      alert('Error de conexión al cambiar mentor');
    } finally {
      setIsChangingMentor(false);
    }
  };

  // ELIMINAR USUARIO
  const handleDelete = async (userId: number, userName: string) => {
    setDeleteConfirmModal({userId, userName});
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal) return;

    const {userId, userName} = deleteConfirmModal;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/usuarios/${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();

      if (response.ok) {
        setDeleteConfirmModal(null);
        setSuccessModal({show: true, message: `Usuario "${userName}" eliminado exitosamente`});
        // Recargar la lista de usuarios
        await cargarUsuarios();
      } else {
        alert(data.error || "Error al eliminar usuario");
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert("Error de conexión al eliminar usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  const getRolColor = (rol: string) => {
      switch(rol) {
          case 'ADMIN': return 'text-red-400 bg-red-900/20 border-red-500/30';
          case 'MENTOR': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
          case 'STAFF': return 'text-purple-400 bg-purple-900/20 border-purple-500/30';
          case 'LIDER': return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
          default: return 'text-slate-400 bg-slate-800 border-slate-700';
      }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-emerald-500" size={32} />
                Gestión de Accesos
            </h1>
            <p className="text-slate-400">Administra roles y restablece credenciales de seguridad.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* BOTÓN NUEVO USUARIO */}
          <Link
            href="/dashboard/staff/alta-usuarios"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Nuevo Usuario
          </Link>

          {/* BUSCADOR */}
          <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                  type="text" 
                  placeholder="Buscar por nombre o correo..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 text-white focus:border-emerald-500 focus:outline-none"
              />
          </div>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {usuariosFiltrados.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                            <div className="font-bold text-white">{user.nombre}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getRolColor(user.rol)}`}>
                                {user.rol}
                            </span>
                        </td>
                        <td className="p-4">
                            <span className={`flex items-center gap-1.5 text-xs font-bold ${user.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                {/* Botón Editar Usuario */}
                                <button 
                                    onClick={() => abrirModalEditar(user)}
                                    className="inline-flex items-center gap-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 px-3 py-2 rounded-lg transition-colors border border-blue-500/30 hover:border-blue-500"
                                    title="Editar Usuario"
                                >
                                    <Edit size={16} />
                                    <span className="text-xs font-bold">Editar</span>
                                </button>

                                {/* Botón Cambiar Mentor (solo para PARTICIPANTE) */}
                                {user.rol === 'PARTICIPANTE' && (
                                  <button 
                                      onClick={() => abrirModalCambioMentor(user)}
                                      className="inline-flex items-center gap-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 hover:text-purple-300 px-3 py-2 rounded-lg transition-colors border border-purple-500/30 hover:border-purple-500"
                                      title="Cambiar Mentor"
                                  >
                                      <User size={16} />
                                      <span className="text-xs font-bold">Mentor</span>
                                  </button>
                                )}

                                {/* Botón Cambiar Contraseña */}
                                <button 
                                    onClick={() => abrirModalReset(user)}
                                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors border border-slate-700 hover:border-yellow-500"
                                    title="Cambiar Contraseña"
                                >
                                    <Key size={16} />
                                    <span className="text-xs font-bold">Password</span>
                                </button>

                                {/* Botón Eliminar Usuario */}
                                <button 
                                    onClick={() => handleDelete(user.id, user.nombre)}
                                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg transition-all border border-slate-700 hover:border-red-500/50"
                                    title="Eliminar Usuario permanentemente"
                                >
                                    <Trash2 size={16} />
                                    <span className="text-xs font-bold">Eliminar</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {usuariosFiltrados.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                No se encontraron usuarios con ese criterio.
            </div>
        )}
      </div>

      {/* --- MODAL DE EDICIÓN DE USUARIO --- */}
      {userEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-8">
                
                <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-purple-900/40 to-blue-900/40 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <Edit className="text-white" size={18} />
                        </div>
                        Editar Perfil de Usuario
                    </h3>
                    <button onClick={() => setUserEditModal(null)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"><X size={24}/></button>
                </div>

                <div className="p-6">
                    {/* Bloque de Error Visual Premium */}
                    {errorMessage && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 animate-pulse">
                        <div className="text-red-400 text-xl">⚠️</div>
                        <p className="text-sm text-red-200">{errorMessage}</p>
                      </div>
                    )}

                    {!mensajeExitoEdit ? (
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            
                            {/* SECCIÓN 1: DATOS PERSONALES */}
                            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
                                <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase mb-4 flex items-center gap-2">
                                    <User className="text-purple-400" size={16} />
                                    1. Datos Personales
                                </h4>
                                
                                {/* Nombre Completo */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={editNombre}
                                        onChange={(e) => setEditNombre(e.target.value)}
                                        required
                                        minLength={3}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                {/* Correo Electrónico */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                    <div className="mt-2 flex items-start gap-2 text-orange-400">
                                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                        <p className="text-[10px] leading-relaxed">
                                            Si cambias esto, el usuario deberá usar el nuevo correo para entrar
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: PERMISOS Y ACCESO */}
                            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
                                <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400 uppercase mb-4 flex items-center gap-2">
                                    <Shield className="text-emerald-400" size={16} />
                                    2. Permisos y Acceso
                                </h4>

                                {/* Selector de Rol */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                                        Rol en Sistema
                                    </label>
                                    <select
                                        value={editRol}
                                        onChange={(e) => setEditRol(e.target.value)}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="PARTICIPANTE">Participante</option>
                                        <option value="MENTOR">Mentor</option>
                                        <option value="COORDINADOR">Coordinador</option>
                                        <option value="GAMECHANGER">Game Changer</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                    <div className="mt-2 flex items-start gap-2 text-blue-400">
                                        <span className="text-sm flex-shrink-0">💡</span>
                                        <p className="text-[10px] leading-relaxed">
                                            Al cambiar a "Mentor", aparecerá automáticamente en Gestión de Talentos
                                        </p>
                                    </div>
                                </div>

                                {/* Switch de Estado */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                                        Estado de Cuenta
                                    </label>
                                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            {editIsActive ? (
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                    <CheckCircle2 className="text-emerald-400" size={20} />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                                    <X className="text-red-400" size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white font-bold text-sm">
                                                    {editIsActive ? '✅ ACTIVO' : '⛔ INACTIVO'}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {editIsActive ? 'Usuario puede iniciar sesión' : 'Acceso bloqueado'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditIsActive(!editIsActive)}
                                            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                                                editIsActive ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-700'
                                            }`}
                                        >
                                            <div
                                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                                                    editIsActive ? 'translate-x-7' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    {!editIsActive && (
                                        <div className="mt-2 flex items-start gap-2 text-orange-400">
                                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                            <p className="text-[10px] leading-relaxed">
                                                El usuario no podrá iniciar sesión, pero sus datos se conservan
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTONES */}
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setUserEditModal(null)}
                                    disabled={isSavingEdit}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 border border-slate-700 hover:border-slate-600"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg px-6 py-3 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                                >
                                    {isSavingEdit ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-2">¡Cambio Exitoso!</h4>
                            <p className="text-slate-400">{mensajeExitoEdit}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE RESET DE PASSWORD --- */}
      {userPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                
                <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key className="text-yellow-500" size={20} />
                        Restablecer Acceso
                    </h3>
                    <button onClick={() => setUserPasswordModal(null)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex items-start gap-3">
                        <User className="text-blue-400 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-blue-300 font-bold uppercase">Usuario Seleccionado</p>
                            <p className="text-white font-bold text-lg">{userPasswordModal.nombre}</p>
                            <p className="text-slate-400 text-sm">{userPasswordModal.email}</p>
                        </div>
                    </div>

                    {!mensajeExitoPassword ? (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nueva Contraseña</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-4 pr-12 text-white focus:border-yellow-500 focus:outline-none"
                                        placeholder="Escribe la nueva clave..."
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                    <AlertTriangle size={12} className="text-yellow-500" />
                                    Esta acción invalidará la contraseña anterior inmediatamente.
                                </p>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSavingPassword}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4"
                            >
                                {isSavingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                                {!isSavingPassword && <Save size={20} />}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-2">¡Cambio Exitoso!</h4>
                            <p className="text-slate-400">{mensajeExitoPassword}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border-2 border-red-500/30 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header con fondo rojo */}
                <div className="bg-gradient-to-r from-red-900/40 to-red-800/40 p-6 border-b border-red-500/30">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="text-red-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">¿ESTÁS SEGURO?</h3>
                            <p className="text-sm text-red-300">Esta acción es permanente</p>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <p className="text-slate-300 text-sm mb-2">Vas a eliminar permanentemente a:</p>
                        <p className="text-white font-bold text-lg">{deleteConfirmModal.userName}</p>
                    </div>

                    <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-300 text-xs flex items-start gap-2">
                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>Esta acción <strong>no se puede deshacer</strong>. Todos los datos asociados a este usuario serán eliminados permanentemente.</span>
                        </p>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 p-6 bg-slate-950/50 border-t border-slate-700">
                    <button 
                        onClick={() => setDeleteConfirmModal(null)}
                        disabled={isDeleting}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 size={18} />
                                Eliminar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE CAMBIO DE MENTOR */}
      {changeMentorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border-2 border-purple-500/30 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/40 p-6 border-b border-purple-500/30">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <User className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Cambiar Mentor</h3>
                            <p className="text-sm text-purple-300">{changeMentorModal.userName}</p>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4">
                    {!changeMentorWarning ? (
                      <>
                        {/* Selector de Mentor */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Seleccionar Nuevo Mentor
                            </label>
                            <select
                                value={selectedMentorId || ''}
                                onChange={(e) => setSelectedMentorId(parseInt(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">-- Seleccionar Mentor --</option>
                                {mentores.map(mentor => (
                                    <option 
                                        key={mentor.id} 
                                        value={mentor.id}
                                        disabled={mentor.id === changeMentorModal.currentMentorId}
                                    >
                                        {mentor.nombre} {mentor.id === changeMentorModal.currentMentorId ? '(Actual)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Advertencia */}
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                                <div className="text-sm text-yellow-200">
                                    <p className="font-semibold mb-2">⚠️ Acción Importante</p>
                                    <p>Si el participante tiene un programa intensivo activo:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                        <li>Se cancelarán todas las sesiones futuras</li>
                                        <li>Las sesiones completadas se mantendrán</li>
                                        <li>El estudiante deberá re-agendar con el nuevo mentor</li>
                                        <li>Solo se agendarán las semanas restantes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                      </>
                    ) : (
                      /* Resumen del cambio */
                      <div className="space-y-3">
                          <div className="text-center py-4">
                              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <CheckCircle2 className="text-green-500" size={32} />
                              </div>
                              <h4 className="text-white font-bold text-xl mb-2">¡Cambio Realizado!</h4>
                          </div>

                          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">Sesiones completadas:</span>
                                  <span className="text-green-400 font-bold">{changeMentorWarning.sesionesCompletadas}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">Sesiones canceladas:</span>
                                  <span className="text-orange-400 font-bold">{changeMentorWarning.sesionesCanceladas}</span>
                              </div>
                          </div>

                          {changeMentorWarning.sesionesCanceladas > 0 && (
                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                  <p className="text-blue-300 text-xs flex items-start gap-2">
                                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                      <span>El estudiante recibirá una notificación para re-agendar sus sesiones restantes con el nuevo mentor.</span>
                                  </p>
                              </div>
                          )}
                      </div>
                    )}
                </div>

                {/* Botones */}
                {!changeMentorWarning && (
                  <div className="flex gap-3 p-6 bg-slate-950/50 border-t border-slate-700">
                      <button 
                          onClick={() => setChangeMentorModal(null)}
                          disabled={isChangingMentor}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleCambiarMentor}
                          disabled={isChangingMentor || !selectedMentorId}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {isChangingMentor ? (
                              <>
                                  <Loader2 className="animate-spin" size={18} />
                                  Procesando...
                              </>
                          ) : (
                              <>
                                  <User size={18} />
                                  Cambiar Mentor
                              </>
                          )}
                      </button>
                  </div>
                )}
            </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {successModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border-2 border-green-500/30 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                        <CheckCircle2 className="text-green-400" size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">¡Éxito!</h3>
                    <p className="text-slate-300 mb-6">{successModal.message}</p>
                    <button 
                        onClick={() => setSuccessModal({show: false, message: ''})}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
