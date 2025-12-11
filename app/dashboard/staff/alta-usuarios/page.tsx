'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, Mail, User, Save, AlertCircle } from 'lucide-react';

export default function AltaUsuariosPage() {
  const [currentUserRole, setCurrentUserRole] = useState<string>('LIDER');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'LIDER', // Default
  });

  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);

  // Obtener el rol del usuario actual desde localStorage
  useEffect(() => {
    const rol = localStorage.getItem('userRol');
    if (rol) {
      setCurrentUserRole(rol);
    }
  }, []);

  // --- LÓGICA DE NEGOCIO: FILTRADO DE ROLES ---
  const getRolesDisponibles = () => {
    const rolesBasicos = [
      { value: 'PARTICIPANTE', label: 'Participante' },
      { value: 'GAMECHANGER', label: 'Game Changer' },
      { value: 'MENTOR', label: 'Mentor' },
    ];

    if (currentUserRole === 'ADMINISTRADOR') {
      // El Admin puede crear todo, incluyendo Coordinadores y otros Admins
      return [
        { value: 'ADMINISTRADOR', label: 'Administrador (Acceso Total)' },
        { value: 'COORDINADOR', label: 'Coordinador' },
        ...rolesBasicos
      ];
    } else if (currentUserRole === 'COORDINADOR') {
      // El Coordinador solo ve básicos + puede crear Coordinadores
      return [
        { value: 'COORDINADOR', label: 'Coordinador' },
        ...rolesBasicos
      ];
    }
    
    return []; // Por seguridad
  };

  const rolesDisponibles = getRolesDisponibles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje(null);

    try {
      const response = await fetch('/api/usuarios/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al crear usuario' });
        setIsLoading(false);
        return;
      }

      setMensaje({ 
        tipo: 'exito', 
        texto: `Usuario ${formData.nombre} creado como ${formData.rol} correctamente.` 
      });
      setFormData({ nombre: '', email: '', password: '', rol: 'PARTICIPANTE' }); // Reset form
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al crear usuario' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <UserPlus className="text-blue-500" size={32} />
          Alta de Usuarios
        </h1>
        <p className="text-slate-400 mt-2">
          Panel de registro. Actuando como: <span className="text-blue-400 font-bold">{currentUserRole}</span>
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Nombre */}
          <div>
            <label className="block text-slate-400 mb-2 text-sm font-medium">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="text" 
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-400 mb-2 text-sm font-medium">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="Ej. juan@impacto.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 mb-2 text-sm font-medium">Contraseña</label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>

          {/* Selector de Rol (Dinámico) */}
          <div>
            <label className="block text-slate-400 mb-2 text-sm font-medium">Asignar Rol</label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 text-slate-500" size={20} />
              <select 
                value={formData.rol}
                onChange={(e) => setFormData({...formData, rol: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {rolesDisponibles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              Solo puedes asignar roles inferiores o iguales a tu nivel de permisos.
            </p>
          </div>

          {/* Botón Submit */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registrando...' : 'Dar de Alta Usuario'}
            {!isLoading && <Save size={20} />}
          </button>

        </form>

        {/* Mensaje de Feedback */}
        {mensaje && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${mensaje.tipo === 'exito' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300'}`}>
             {mensaje.tipo === 'exito' ? <UserPlus size={20}/> : <AlertCircle size={20}/>}
             <span>{mensaje.texto}</span>
          </div>
        )}
      </div>
    </div>
  );
}
