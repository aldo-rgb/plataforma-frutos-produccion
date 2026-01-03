'use client';

import { useState } from 'react';
import { ArrowLeft, DollarSign, Percent, Save, TrendingUp, Users, Wallet, Calendar, Edit3, UserCog } from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA: CONFIGURACIÓN DE MENTORES ---
// Aquí defines cuánto te quedas TÚ (Plataforma) de cada uno.
const MENTORES_DATA = [
  { id: 1, nombre: 'Roberto Martínez', nivel: 'Senior', comisionPlataforma: 15 }, // Negoció mejor trato (tú ganas 15%)
  { id: 2, nombre: 'Ana Sofía Guerra', nivel: 'Master', comisionPlataforma: 10 }, // Estrella (tú ganas 10%)
  { id: 3, nombre: 'Carlos Rueda', nivel: 'Junior', comisionPlataforma: 30 },     // Estándar (tú ganas 30%)
];

// --- MOCK DATA: HISTORIAL ---
// Cada transacción está ligada a un mentor por su ID
const TRANSACCIONES_INICIALES = [
  { id: 'TX-001', fecha: '2025-10-12', cliente: 'Juan Pérez', mentorId: 1, total: 1000, metodo: 'STRIPE' },
  { id: 'TX-002', fecha: '2025-10-12', cliente: 'Maria Lopez', mentorId: 2, total: 900, metodo: 'PAYPAL' },
  { id: 'TX-003', fecha: '2025-10-11', cliente: 'Carlos Ruiz', mentorId: 1, total: 1000, metodo: 'MERCADO PAGO' },
  { id: 'TX-004', fecha: '2025-10-10', cliente: 'Luisa Fernanda', mentorId: 3, total: 800, metodo: 'STRIPE' },
];

export default function AdminPagosPage() {
  
  // Estado para editar las comisiones en tiempo real
  const [mentoresConfig, setMentoresConfig] = useState(MENTORES_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // Formateador de moneda
  const formatoMXN = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  };

  // Función para actualizar el % de un mentor específico
  const handleUpdateComision = (id: number, nuevoValor: number) => {
    setMentoresConfig(prev => prev.map(m => 
        m.id === id ? { ...m, comisionPlataforma: Number(nuevoValor) } : m
    ));
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    // Aquí guardaríamos en la BD real
    setTimeout(() => setIsSaving(false), 800);
  };

  // CÁLCULOS DINÁMICOS
  const calcularSplit = (total: number, mentorId: number) => {
    // Buscamos la comisión específica de ESTE mentor
    const mentor = mentoresConfig.find(m => m.id === mentorId);
    const porcentajeAdmin = mentor ? mentor.comisionPlataforma : 20; // Default 20% si no se encuentra
    
    const utilidadAdmin = total * (porcentajeAdmin / 100);
    const pagoMentor = total - utilidadAdmin;
    
    return { utilidadAdmin, pagoMentor, porcentajeAdmin };
  };

  // Totales Generales (Sumando las utilidades individuales)
  const resumenFinanciero = TRANSACCIONES_INICIALES.reduce((acc, tx) => {
    const { utilidadAdmin, pagoMentor } = calcularSplit(tx.total, tx.mentorId);
    return {
        ventas: acc.ventas + tx.total,
        admin: acc.admin + utilidadAdmin,
        mentores: acc.mentores + pagoMentor
    };
  }, { ventas: 0, admin: 0, mentores: 0 });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Wallet className="text-emerald-500" size={32} />
          Gestión de Revenue Share
        </h1>
        <p className="text-slate-400">Configura porcentajes personalizados por cada socio.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* --- COLUMNA IZQUIERDA: CONFIGURADOR DE MENTORES --- */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                    <UserCog className="text-blue-500" size={24} />
                    <h2 className="font-bold text-white">Acuerdos Comerciales</h2>
                </div>
                
                <div className="space-y-6">
                    {mentoresConfig.map((mentor) => (
                        <div key={mentor.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-white">{mentor.nombre}</p>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                        {mentor.nivel}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Tu Comisión</p>
                                    <div className="flex items-center justify-end gap-1">
                                        <input 
                                            type="number" 
                                            value={mentor.comisionPlataforma}
                                            onChange={(e) => handleUpdateComision(mentor.id, Number(e.target.value))}
                                            className="w-12 bg-slate-800 text-right text-white font-bold border-b border-blue-500 focus:outline-none"
                                        />
                                        <span className="text-blue-500 font-bold">%</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Barra visual del split */}
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex mt-2">
                                <div 
                                    className="h-full bg-blue-500" 
                                    style={{ width: `${mentor.comisionPlataforma}%` }} 
                                    title={`Tú: ${mentor.comisionPlataforma}%`}
                                />
                                <div 
                                    className="h-full bg-purple-500" 
                                    style={{ width: `${100 - mentor.comisionPlataforma}%` }} 
                                    title={`Mentor: ${100 - mentor.comisionPlataforma}%`}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                <span>Tú: {mentor.comisionPlataforma}%</span>
                                <span>Mentor: {100 - mentor.comisionPlataforma}%</span>
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleSaveConfig}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                    {isSaving ? 'Guardando Cambios...' : 'Actualizar Acuerdos'}
                    {!isSaving && <Save size={18} />}
                </button>
            </div>

            {/* KPI Rápido */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-6 rounded-xl">
                <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-1">Tu Utilidad Neta</h3>
                <p className="text-3xl font-bold text-white">{formatoMXN(resumenFinanciero.admin)}</p>
                <p className="text-xs text-slate-400 mt-2">Calculada según las tasas individuales.</p>
            </div>
        </div>

        {/* --- COLUMNA DERECHA: TABLA DE TRANSACCIONES --- */}
        <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-full">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <TrendingUp className="text-purple-500" size={20} />
                        Desglose de Operaciones
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Mentor / Fecha</th>
                                <th className="p-4 font-medium text-right">Monto Total</th>
                                <th className="p-4 font-medium text-right text-blue-400">Tu Parte</th>
                                <th className="p-4 font-medium text-right text-purple-400">Al Mentor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {TRANSACCIONES_INICIALES.map((tx) => {
                                const { utilidadAdmin, pagoMentor, porcentajeAdmin } = calcularSplit(tx.total, tx.mentorId);
                                const nombreMentor = mentoresConfig.find(m => m.id === tx.mentorId)?.nombre || 'Desconocido';
                                
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="text-white font-bold text-sm">{nombreMentor}</div>
                                            <div className="text-slate-500 text-xs flex items-center gap-2 mt-1">
                                                <span>{tx.fecha}</span>
                                                <span className="bg-slate-800 px-1.5 rounded text-[10px]">{tx.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-white">{formatoMXN(tx.total)}</div>
                                            <div className="text-[10px] text-slate-500">{tx.metodo}</div>
                                        </td>
                                        <td className="p-4 text-right bg-blue-900/5">
                                            <div className="font-bold text-blue-400">+{formatoMXN(utilidadAdmin)}</div>
                                            <div className="text-[10px] text-blue-300/60">Tasa: {porcentajeAdmin}%</div>
                                        </td>
                                        <td className="p-4 text-right bg-purple-900/5">
                                            <div className="font-bold text-purple-400">{formatoMXN(pagoMentor)}</div>
                                            <div className="text-[10px] text-purple-300/60">Tasa: {100 - porcentajeAdmin}%</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
