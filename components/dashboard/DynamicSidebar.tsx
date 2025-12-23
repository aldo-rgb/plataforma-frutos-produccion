'use client';

import React from 'react';
import Link from 'next/link';
import { useAllowedMenu } from '@/hooks/useAllowedMenu';
import * as Icons from 'lucide-react';

interface DynamicSidebarProps {
  usuario: {
    rol: string;
    nombre: string;
    [key: string]: any;
  };
}

/**
 * Sidebar dinámico basado en permisos de la BD
 * Este es un ejemplo de implementación usando el hook useAllowedMenu
 * 
 * Para usar este componente en lugar del Sidebar actual:
 * 1. Renombra el Sidebar actual a Sidebar.backup.tsx
 * 2. Renombra este archivo a Sidebar.tsx
 * 3. Ajusta las rutas en routeMapping según tus necesidades
 */
export function DynamicSidebar({ usuario }: DynamicSidebarProps) {
  // Hook que filtra el menú según permisos en BD
  const { menuItems, loading } = useAllowedMenu({ user: usuario });

  if (loading) {
    return (
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 text-slate-500 flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </aside>
    );
  }

  // Agrupamos por sección para mantener el diseño ordenado
  const generalItems = menuItems.filter(i => i.section === 'General');
  const panelItems = menuItems.filter(i => i.section === 'Panel Maestro');

  // Mapeo de IDs a rutas
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

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      {/* Logo y Encabezado */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          IMPACTO <span className="text-blue-400">VIA</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">{usuario.nombre}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        
        {/* GRUPO 1: GENERAL (Visible para casi todos) */}
        {generalItems.length > 0 && (
          <div>
             <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-2">
               General
             </h3>
             <ul className="space-y-1">
               {generalItems.map(item => (
                 <SidebarItem 
                   key={item.id} 
                   item={item} 
                   routeMapping={routeMapping}
                 />
               ))}
             </ul>
          </div>
        )}

        {/* GRUPO 2: PANEL MAESTRO (Altamente restringido) */}
        {panelItems.length > 0 && (
          <div>
             <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-2">
               Panel Maestro
             </h3>
             <ul className="space-y-1">
               {panelItems.map(item => (
                 <SidebarItem 
                   key={item.id} 
                   item={item}
                   routeMapping={routeMapping}
                 />
               ))}
             </ul>
          </div>
        )}

        {/* Mensaje si no hay permisos */}
        {menuItems.length === 0 && (
          <div className="p-4 text-center text-slate-500">
            <p className="text-sm">No tienes permisos asignados</p>
          </div>
        )}

      </nav>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => {/* Lógica de logout */}}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Icons.LogOut className="w-4 h-4" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

// =====================================================
// Subcomponente para renderizar cada botón limpio
// =====================================================
interface SidebarItemProps {
  item: {
    id: string;
    label: string;
    icon: string;
    section: string;
  };
  routeMapping: Record<string, string>;
}

function SidebarItem({ item, routeMapping }: SidebarItemProps) {
  // Truco para renderizar el icono por nombre string
  const IconComponent = (Icons as any)[item.icon] || Icons.Circle;
  
  // Obtener la ruta desde el mapping o construir una por defecto
  const href = routeMapping[item.id] || `/dashboard/${item.id}`;

  return (
    <li>
      <Link 
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
      >
        <IconComponent className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
    </li>
  );
}
