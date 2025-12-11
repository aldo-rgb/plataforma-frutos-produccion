'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, ScrollText, User, ShieldAlert, Filter } from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA: USUARIOS CON ASIGNACIÓN ---
// Nota los campos 'mentorId' y 'coordinadorId'
const PARTICIPANTES_MOCK = [
  { 
    id: 101, 
    nombre: 'Juan Pérez (Tuyo)', 
    email: 'juan@test.com', 
    estadoCarta: 'PENDIENTE', 
    mentorId: 10,      // Asignado al ID 10
    coordinadorId: 5 
  },
  { 
    id: 102, 
    nombre: 'Maria López (De otro)', 
    email: 'maria@test.com', 
    estadoCarta: 'PENDIENTE', 
    mentorId: 99,      // Asignado a OTRO mentor
    coordinadorId: 5 
  },
  { 
    id: 103, 
    nombre: 'Carlos Ruiz (Tuyo)', 
    email: 'carlos@test.com', 
    estadoCarta: 'AUTORIZADA', 
    mentorId: 10,      // Asignado al ID 10
    coordinadorId: 5 
  },
];

export default function StaffDashboardPage() {
  // 1. ESTADO DEL USUARIO ACTUAL (Simulamos que entra el Mentor con ID 10)
  const [currentUser, setCurrentUser] = useState<any>({ id: 0, rol: 'LIDER', nombre: '' });
  const [isLoading, setIsLoading] = useState(true);

  // 2. RECUPERAR USUARIO REAL
  useEffect(() => {
    // Simulamos obtener el usuario del login
    // EN PRODUCCIÓN: Esto viene de tu Auth real o Context
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      // Fallback para pruebas si no hay login: Simulamos ser el Mentor ID 10
      setCurrentUser({ id: 10, rol: 'MENTOR', nombre: 'Mentor Roberto' });
    }
    setIsLoading(false);
  }, []);

  const [participantes, setParticipantes] = useState(PARTICIPANTES_MOCK);
  const [filtroTexto, setFiltroTexto] = useState('');

  // --- LÓGICA DE FILTRADO JERÁRQUICO ---
  const getParticipantesFiltrados = () => {
    return participantes.filter(p => {
      // 1. Filtro de Texto (Buscador)
      const coincideTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
      
      // 2. Filtro de Jerarquía (Permisos)
      let tienePermiso = false;

      if (currentUser.rol === 'ADMIN') {
        tienePermiso = true; // Admin ve todo (Ojo de Dios)
      } else if (currentUser.rol === 'COORDINADOR') {
        tienePermiso = p.coordinadorId === currentUser.id;
      } else if (currentUser.rol === 'MENTOR') {
        tienePermiso = p.mentorId === currentUser.id;
      }

      return coincideTexto && tienePermiso;
    });
  };

  const listaVisible = getParticipantesFiltrados();

  // Acciones simuladas
  const autorizarCarta = (id: number) => {
    setParticipantes(prev => prev.map(p => p.id === id ? { ...p, estadoCarta: 'AUTORIZADA' } : p));
  };

  if (isLoading) return <div className="p-8 text-slate-400">Cargando permisos...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldAlert className="text-blue-500" size={32} />
          Autorización de Cartas
        </h1>
        <p className="text-slate-400">
          Viendo asignaciones para: <span className="text-white font-bold">{currentUser.nombre} ({currentUser.rol})</span>
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 flex items-center gap-3">
        <Search className="text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar entre MIS asignados..." 
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-slate-500"
        />
      </div>

      {/* Tabla de Resultados */}
      <div className="grid gap-4">
        {listaVisible.length > 0 ? (
          listaVisible.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 hover:border-blue-500/30 transition-all">
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{p.nombre}</h3>
                  <p className="text-sm text-slate-500">{p.email}</p>
                  
                  {/* Badge de Estado */}
                  <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                    p.estadoCarta === 'AUTORIZADA' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
                  }`}>
                     {p.estadoCarta === 'AUTORIZADA' ? 'Carta Sellada' : 'Pendiente de Revisión'}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                 <Link href={`/dashboard/lideres/${p.id}`} className="text-slate-400 hover:text-white px-4 py-2 text-sm font-medium">
                    Ver Carta Completa
                 </Link>

                 {p.estadoCarta !== 'AUTORIZADA' && (
                   <button 
                     onClick={() => autorizarCarta(p.id)}
                     className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                   >
                     <CheckCircle2 size={18} />
                     Sellar Carta
                   </button>
                 )}
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <Filter size={40} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-slate-400 font-bold">No tienes participantes pendientes.</h3>
            <p className="text-slate-600 text-sm mt-1">
              (O no hay nadie asignado a tu ID: {currentUser.id})
            </p>
          </div>
        )}
      </div>

    </div>
  );
}