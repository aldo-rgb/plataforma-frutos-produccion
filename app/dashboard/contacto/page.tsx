'use client';

import { ArrowLeft, Phone, Mail, User, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ContactoPage() {
  
  // --- DATOS MOCK (Simulando respuesta de BD) ---
  const proximaLlamada = {
    fecha: 'Jueves, 12 Octubre',
    hora: '8:00 PM',
    mentor: 'Roberto Martínez',
    tema: 'Revisión de Metas Financieras'
  };

  const historialLlamadas = [
    { id: 1, fecha: '05 Oct', tipo: 'Mentoría 1:1', status: 'COMPLETADA', con: 'Roberto Martínez' },
    { id: 2, fecha: '28 Sep', tipo: 'Check-in Semanal', status: 'PERDIDA', con: 'Ana Sofía Guerra' }, // ¡Ojo aquí!
    { id: 3, fecha: '21 Sep', tipo: 'Bienvenida', status: 'COMPLETADA', con: 'Staff Impacto' },
  ];

  const equipo = [
    {
      rol: 'MI MENTOR',
      nombre: 'Roberto Martínez',
      telefono: '+52 55 1234 5678',
      email: 'roberto@impacto.com',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30'
    },
    {
      rol: 'GAME CHANGER',
      nombre: 'Ana Sofía Guerra',
      telefono: '+52 81 8765 4321',
      email: 'ana.guerra@impacto.com',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30'
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Botón Volver */}
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Volver al Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: CONTACTOS */}
        <div className="w-full md:w-1/2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tu Equipo</h1>
            <p className="text-slate-400">Soporte directo para tu transformación.</p>
          </div>

          <div className="space-y-4">
            {equipo.map((aliado, idx) => (
              <div key={idx} className={`rounded-xl border p-6 ${aliado.bg}`}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                      <User size={24} className="text-slate-400" />
                    </div>
                    <div>
                        <h2 className={`text-xs font-bold tracking-wider ${aliado.color}`}>{aliado.rol}</h2>
                        <h3 className="text-lg font-bold text-white">{aliado.nombre}</h3>
                    </div>
                </div>

                <div className="space-y-3 pl-16">
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-slate-400" />
                    <span className="text-slate-200 text-sm">{aliado.telefono}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-slate-200 text-sm">{aliado.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: STATUS DE LLAMADAS */}
        <div className="w-full md:w-1/2 space-y-6">
            
            {/* Tarjeta de Próxima Llamada */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Calendar size={100} className="text-emerald-400" />
                </div>
                <h3 className="text-emerald-400 font-bold tracking-wider text-sm mb-4 flex items-center gap-2">
                    <Clock size={16} /> PRÓXIMA SESIÓN
                </h3>
                <div className="mb-2">
                    <p className="text-4xl font-bold text-white">{proximaLlamada.fecha}</p>
                    <p className="text-2xl text-emerald-200 mt-1">{proximaLlamada.hora}</p>
                </div>
                <p className="text-slate-400 mt-4 text-sm border-t border-emerald-500/20 pt-4">
                    Tema: <span className="text-white">{proximaLlamada.tema}</span>
                </p>
                <p className="text-slate-500 text-xs mt-1">Con: {proximaLlamada.mentor}</p>
            </div>

            {/* Historial de Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Phone size={18} className="text-blue-500" />
                    Historial de Llamadas
                </h3>
                <div className="space-y-4">
                    {historialLlamadas.map((llamada) => (
                        <div key={llamada.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                {llamada.status === 'COMPLETADA' ? (
                                    <CheckCircle size={20} className="text-green-500" />
                                ) : (
                                    <XCircle size={20} className="text-red-500" />
                                )}
                                <div>
                                    <p className="text-white font-medium text-sm">{llamada.tipo}</p>
                                    <p className="text-slate-500 text-xs">{llamada.fecha} • {llamada.con}</p>
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                llamada.status === 'COMPLETADA' 
                                ? 'bg-green-500/10 text-green-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                                {llamada.status}
                            </span>
                        </div>
                    ))}
                </div>
                
                {/* Alerta si hay llamadas perdidas */}
                {historialLlamadas.some(l => l.status === 'PERDIDA') && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                        <p className="text-xs text-red-300">
                            Tienes llamadas perdidas. Recuerda que la asistencia es vital para tu puntaje. 
                        </p>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
