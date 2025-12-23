'use client';

import React, { useState, useEffect } from 'react';
import { MENU_ITEMS, ROLES } from '@/config/menuPermissions';

export default function PermissionsPanel() {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // 1. CARGAR PERMISOS AL INICIAR
  // =====================================================
  useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch('/api/admin/permisos');
        const data = await res.json();
        
        // Transformamos el array de la BD a un objeto fácil de usar
        // Formato: { MENTOR: ['finanzas', 'ranking'], COORDINADOR: [...] }
        const mappedPerms: Record<string, string[]> = {};
        
        // Inicializar todos los roles con arrays vacíos
        ROLES.forEach(role => {
          mappedPerms[role] = [];
        });
        
        // Agregar permisos habilitados
        data.forEach((p: any) => {
          if (p.isEnabled) {
            if (!mappedPerms[p.role]) mappedPerms[p.role] = [];
            mappedPerms[p.role].push(p.menuKey);
          }
        });
        
        // ADMINISTRADOR siempre tiene todo
        mappedPerms['ADMINISTRADOR'] = MENU_ITEMS.map(i => i.id);
        
        setPermissions(mappedPerms);
      } catch (error) {
        console.error("Error cargando permisos", error);
      } finally {
        setLoading(false);
      }
    }
    loadPermissions();
  }, []);

  // =====================================================
  // 2. MANEJAR CLICS EN CHECKBOX
  // =====================================================
  const togglePermission = (role: string, menuKey: string) => {
    setPermissions(prev => {
      const rolePerms = prev[role] || [];
      const hasPerm = rolePerms.includes(menuKey);
      
      let newRolePerms;
      if (hasPerm) {
        newRolePerms = rolePerms.filter(k => k !== menuKey); // Quitar
      } else {
        newRolePerms = [...rolePerms, menuKey]; // Poner
      }
      
      return { ...prev, [role]: newRolePerms };
    });
  };

  // =====================================================
  // 3. GUARDAR CAMBIOS EN LA BD
  // =====================================================
  const handleSave = async () => {
    setSaving(true);
    const payload: Array<{ role: string; menuKey: string; isEnabled: boolean }> = [];
    
    // Convertimos el estado visual al formato que espera la BD
    ROLES.forEach(role => {
      MENU_ITEMS.forEach(item => {
        const isEnabled = permissions[role]?.includes(item.id) || false;
        payload.push({ role, menuKey: item.id, isEnabled });
      });
    });

    try {
      const res = await fetch('/api/admin/permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("✅ Permisos actualizados correctamente");
      } else {
        alert("❌ Error al guardar");
      }
      
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando configuración de permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">🛡️ Gestión de Permisos</h1>
          <p className="text-slate-400">Define qué ve cada rol en el menú lateral.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="p-4 border-b border-slate-700">Módulo del Menú</th>
              {ROLES.map(role => (
                <th key={role} className="p-4 border-b border-slate-700 text-center text-xs font-black tracking-wider text-purple-400">
                  {role.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {MENU_ITEMS.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  {/* Aquí podrías poner el Icono dinámico */}
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <span className="text-xs text-slate-500 border border-slate-600 px-2 rounded-full">
                    {item.section}
                  </span>
                </td>
                {ROLES.map(role => {
                  const isChecked = permissions[role]?.includes(item.id);
                  const isAdmin = role === 'ADMINISTRADOR';
                  
                  return (
                    <td key={role} className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={isAdmin ? true : isChecked} // Admin siempre tiene todo
                        disabled={isAdmin} // Admin siempre tiene todo, no se puede quitar
                        onChange={() => togglePermission(role, item.id)}
                        className="w-5 h-5 accent-purple-500 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
