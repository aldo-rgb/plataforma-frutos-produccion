'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users, GraduationCap, Shield, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RoleSwitcherProps {
  usuario: {
    id: number;
    nombre: string;
    rol: string;
    esMentor?: boolean;
    esEntrenador?: boolean;
    esCoordinador?: boolean;
    esLider?: boolean;
    esCoordinadorBasico?: boolean;
    esCoordinadorAvanzado?: boolean;
  };
}

interface RoleOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export function RoleSwitcher({ usuario }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Definir todos los roles disponibles
  const allRoles: RoleOption[] = [
    {
      key: 'PARTICIPANTE',
      label: 'Participante',
      icon: <User size={16} />,
      path: '/dashboard?view=participante',
      color: 'from-slate-500 to-slate-600'
    },
    {
      key: 'LIDER',
      label: 'Líder',
      icon: <Users size={16} />,
      path: '/dashboard/lider',
      color: 'from-green-500 to-emerald-600'
    },
    {
      key: 'MENTOR',
      label: 'Mentor',
      icon: <GraduationCap size={16} />,
      path: '/dashboard/mentor',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      key: 'TRAINER',
      label: 'Entrenador',
      icon: <Briefcase size={16} />,
      path: '/dashboard/trainer',
      color: 'from-orange-500 to-amber-600'
    },
    {
      key: 'COORDINADOR',
      label: 'Coordinador',
      icon: <Shield size={16} />,
      path: '/dashboard/coordinador',
      color: 'from-purple-500 to-violet-600'
    },
    {
      key: 'COORDINATOR_BASIC',
      label: 'Coord. Básico',
      icon: <Shield size={16} />,
      path: '/dashboard/coordinador-basico',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      key: 'COORDINATOR_ADVANCED',
      label: 'Coord. Avanzado',
      icon: <Shield size={16} />,
      path: '/dashboard/coordinador-avanzado',
      color: 'from-rose-500 to-pink-600'
    }
  ];

  // Determinar qué roles tiene el usuario
  const availableRoles = allRoles.filter(role => {
    // PARTICIPANTE siempre disponible para todos los usuarios con múltiples roles
    if (role.key === 'PARTICIPANTE') return true;
    
    // El rol principal siempre está disponible
    if (role.key === usuario.rol) return true;
    
    // Roles adicionales por flags
    if (role.key === 'MENTOR' && usuario.esMentor) return true;
    if (role.key === 'TRAINER' && usuario.esEntrenador) return true;
    if (role.key === 'COORDINADOR' && usuario.esCoordinador) return true;
    if (role.key === 'LIDER' && usuario.esLider) return true;
    if (role.key === 'COORDINATOR_BASIC' && usuario.esCoordinadorBasico) return true;
    if (role.key === 'COORDINATOR_ADVANCED' && usuario.esCoordinadorAvanzado) return true;
    
    return false;
  });

  // Si solo tiene un rol, no mostrar el switcher
  if (availableRoles.length <= 1) {
    return null;
  }

  // Cargar rol activo de localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem('activeRole');
    if (savedRole && availableRoles.some(r => r.key === savedRole)) {
      setActiveRole(savedRole);
    } else {
      setActiveRole(usuario.rol);
    }
  }, [usuario.rol, availableRoles]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (role: RoleOption) => {
    setActiveRole(role.key);
    localStorage.setItem('activeRole', role.key);
    
    // Disparar evento personalizado para que el Sidebar actualice
    window.dispatchEvent(new CustomEvent('roleChange', { detail: { role: role.key } }));
    
    setIsOpen(false);
    router.push(role.path);
  };

  const currentRole = availableRoles.find(r => r.key === activeRole) || availableRoles[0];

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${currentRole.color} hover:opacity-90 transition-all duration-200 shadow-lg`}
      >
        {currentRole.icon}
        <span className="font-medium text-white text-sm hidden sm:inline">
          {currentRole.label}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-white/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase font-bold px-2">Cambiar Vista</p>
          </div>
          <div className="p-1">
            {availableRoles.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleChange(role)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  activeRole === role.key
                    ? `bg-gradient-to-r ${role.color} text-white`
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <span className={activeRole === role.key ? 'text-white' : 'text-slate-400'}>
                  {role.icon}
                </span>
                <span className="font-medium text-sm">{role.label}</span>
                {activeRole === role.key && (
                  <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    Activo
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
