'use client';

import { useState } from 'react';
import { Search, Key, Shield, User, Edit, Save, X, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA: USUARIOS EXISTENTES ---
const USUARIOS_INICIALES = [
  { id: 1, nombre: 'Admin Supremo', email: 'admin@frutos.com', rol: 'ADMIN', estado: 'ACTIVO' },
  { id: 2, nombre: 'Roberto Martínez', email: 'roberto@mentor.com', rol: 'MENTOR', estado: 'ACTIVO' },
  { id: 3, nombre: 'Ana Sofía', email: 'ana@lider.com', rol: 'LIDER', estado: 'ACTIVO' },
  { id: 4, nombre: 'Carlos Ruiz', email: 'carlos@lider.com', rol: 'LIDER', estado: 'INACTIVO' },
];

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  
  // ESTADOS DEL MODAL DE CONTRASEÑA
  const [userSeleccionado, setUserSeleccionado] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // FILTRADO
  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ABRIR MODAL
  const abrirModalReset = (user: any) => {
    setUserSeleccionado(user);
    setNewPassword('');
    setMensajeExito('');
    setShowPassword(false);
  };

  // GUARDAR NUEVA CONTRASEÑA
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // AQUÍ IRÍA LA LLAMADA AL BACKEND (API)
    // await fetch('/api/admin/reset-password', { method: 'POST', body: ... })

    // Simulación
    setTimeout(() => {
        setIsSaving(false);
        setMensajeExito(`Contraseña actualizada para ${userSeleccionado.nombre}`);
        // Cerramos el modal después de 2 segundos
        setTimeout(() => {
            setUserSeleccionado(null);
            setMensajeExito('');
        }, 2000);
    }, 1000);
  };

  const getRolColor = (rol: string) => {
      switch(rol) {
          case 'ADMIN': return 'text-red-400 bg-red-900/20 border-red-500/30';
          case 'MENTOR': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
          default: return 'text-slate-400 bg-slate-800 border-slate-700';
      }
  };

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

      {/* TABLA DE USUARIOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Seguridad</th>
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
                            <span className={`flex items-center gap-1.5 text-xs font-bold ${user.estado === 'ACTIVO' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${user.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                {user.estado}
                            </span>
                        </td>
                        <td className="p-4 text-right">
                            <button 
                                onClick={() => abrirModalReset(user)}
                                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors border border-slate-700 hover:border-blue-500"
                                title="Cambiar Contraseña"
                            >
                                <Key size={16} />
                                <span className="text-xs font-bold">Cambiar Pass</span>
                            </button>
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

      {/* --- MODAL DE RESET DE PASSWORD --- */}
      {userSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                
                <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key className="text-yellow-500" size={20} />
                        Restablecer Acceso
                    </h3>
                    <button onClick={() => setUserSeleccionado(null)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex items-start gap-3">
                        <User className="text-blue-400 mt-1" size={20} />
                        <div>
                            <p className="text-xs text-blue-300 font-bold uppercase">Usuario Seleccionado</p>
                            <p className="text-white font-bold text-lg">{userSeleccionado.nombre}</p>
                            <p className="text-slate-400 text-sm">{userSeleccionado.email}</p>
                        </div>
                    </div>

                    {!mensajeExito ? (
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
                                disabled={isSaving}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4"
                            >
                                {isSaving ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                                {!isSaving && <Save size={20} />}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h4 className="text-white font-bold text-xl mb-2">¡Cambio Exitoso!</h4>
                            <p className="text-slate-400">{mensajeExito}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
