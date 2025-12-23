"use client";
import React, { useState, useEffect } from 'react';
import { UserPlus, Users, ArrowRight, Trash2, RefreshCw, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  _count: { assignedStudents: number };
}

interface Student {
  id: number;
  nombre: string;
  email: string;
  assignedMentorId: number | null;
  assignedMentor: { nombre: string } | null;
}

interface ModalState {
  show: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

export default function AssignMentorPage() {
  const router = useRouter();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [modal, setModal] = useState<ModalState>({ show: false, type: 'success', title: '', message: '' });

  // Formulario
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedMentor, setSelectedMentor] = useState("");

  // Verificar permisos de acceso
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) {
          router.push('/dashboard');
          return;
        }
        const data = await res.json();
        const allowedRoles = ['ADMINISTRADOR', 'COORDINADOR', 'GAMECHANGER'];
        
        if (!allowedRoles.includes(data.user?.rol)) {
          router.push('/dashboard');
          return;
        }
        
        setHasAccess(true);
      } catch (error) {
        console.error('Error verificando acceso:', error);
        router.push('/dashboard');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAccess();
  }, [router]);

  // Cargar datos al inicio
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/assign-mentor');
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setMentors(data.mentors || []);
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  // Guardar asignación
  const handleAssign = async () => {
    if (!selectedStudent || !selectedMentor) {
      setModal({
        show: true,
        type: 'warning',
        title: '⚠️ Datos Incompletos',
        message: 'Por favor selecciona un participante y un mentor antes de continuar.'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/assign-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: Number(selectedStudent), 
          mentorId: Number(selectedMentor) 
        })
      });

      const data = await res.json();

      if (res.ok) {
        const studentName = students.find(s => s.id === Number(selectedStudent))?.nombre;
        const mentorName = mentors.find(m => m.id === Number(selectedMentor))?.nombre;
        
        setModal({
          show: true,
          type: 'success',
          title: '✅ Asignación Exitosa',
          message: `${studentName} ha sido asignado a ${mentorName}`
        });
        
        setSelectedStudent("");
        setSelectedMentor("");
        await loadData(); // Recargar tabla
      } else {
        setModal({
          show: true,
          type: 'error',
          title: '❌ Error al Asignar',
          message: data.error || 'No se pudo completar la asignación'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setModal({
        show: true,
        type: 'error',
        title: '❌ Error de Conexión',
        message: 'No se pudo conectar con el servidor. Intenta nuevamente.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Desvincular mentor
  const handleUnassign = async (studentId: number, studentName: string) => {
    if (!confirm(`¿Desvincular a ${studentName} de su mentor actual?`)) return;

    try {
      const res = await fetch('/api/admin/assign-mentor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });

      if (res.ok) {
        setModal({
          show: true,
          type: 'success',
          title: '✅ Mentor Desvinculado',
          message: `${studentName} ya no tiene mentor asignado`
        });
        await loadData();
      } else {
        const data = await res.json();
        setModal({
          show: true,
          type: 'error',
          title: '❌ Error',
          message: data.error || 'No se pudo desvincular el mentor'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setModal({
        show: true,
        type: 'error',
        title: '❌ Error de Conexión',
        message: 'No se pudo conectar con el servidor'
      });
    }
  };

  // Estadísticas
  const studentsWithMentor = students.filter(s => s.assignedMentorId).length;
  const studentsWithoutMentor = students.length - studentsWithMentor;

  // Mostrar estado de verificación de permisos
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no tiene acceso, mostrar mensaje de restricción
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-900/20 border border-red-700 p-8 rounded-2xl text-center max-w-md">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">⛔ Acceso Restringido</h2>
          <p className="text-slate-400 mb-4">
            No tienes permisos para acceder a esta sección. Solo ADMINISTRADORES, COORDINADORES y GAME CHANGERS pueden asignar mentores.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🤝 Asignación de Mentores</h1>
        <p className="text-slate-400">Vincula a cada participante con su mentor oficial.</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-xl">
          <p className="text-blue-400 text-sm font-medium">Total Mentores</p>
          <p className="text-3xl font-bold text-white">{mentors.length}</p>
        </div>
        <div className="bg-green-900/20 border border-green-700 p-4 rounded-xl">
          <p className="text-green-400 text-sm font-medium">Alumnos Asignados</p>
          <p className="text-3xl font-bold text-white">{studentsWithMentor}</p>
        </div>
        <div className="bg-red-900/20 border border-red-700 p-4 rounded-xl">
          <p className="text-red-400 text-sm font-medium">Sin Asignar</p>
          <p className="text-3xl font-bold text-white">{studentsWithoutMentor}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: FORMULARIO DE ASIGNACIÓN */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-purple-400">
            <UserPlus className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Nueva Asignación</h2>
          </div>

          <div className="space-y-6">
            {/* 1. Selector de Alumno */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">1. Selecciona Participante</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={loading || saving}
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
              >
                <option value="">-- Buscar Alumno --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.assignedMentor ? `(Actual: ${s.assignedMentor.nombre})` : '(Sin Mentor)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="text-slate-500 transform rotate-90 lg:rotate-0" />
            </div>

            {/* 2. Selector de Mentor */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">2. Asignar al Mentor</label>
              <select
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
                disabled={loading || saving}
                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
              >
                <option value="">-- Seleccionar Mentor --</option>
                {mentors.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m._count.assignedStudents} alumnos)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAssign}
              disabled={!selectedStudent || !selectedMentor || saving || loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Confirmar Vínculo'
              )}
            </button>
          </div>
        </div>

        {/* COLUMNA 2 y 3: TABLA DE RESUMEN */}
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Listado Actual</h2>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0">
                <tr>
                  <th className="p-4">Participante</th>
                  <th className="p-4">Mentor Asignado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Cargando datos...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      No hay participantes activos
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{s.nombre}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </td>
                      <td className="p-4">
                        {s.assignedMentor ? (
                          <span className="flex items-center gap-2 text-green-400 font-medium bg-green-900/20 px-3 py-1 rounded-lg w-fit">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {s.assignedMentor.nombre}
                          </span>
                        ) : (
                          <span className="text-red-400 bg-red-900/20 px-3 py-1 rounded-lg text-sm font-medium">
                            Sin Asignar
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {s.assignedMentorId && (
                          <button
                            onClick={() => handleUnassign(s.id, s.nombre)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                            title="Desvincular mentor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal de Confirmación */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className={`bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 border-2 shadow-2xl ${
            modal.type === 'success' ? 'border-green-500' : 
            modal.type === 'error' ? 'border-red-500' : 
            'border-yellow-500'
          }`}>
            <div className="text-center">
              {/* Icono según tipo */}
              {modal.type === 'success' && (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
              )}
              {modal.type === 'error' && (
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              )}
              {modal.type === 'warning' && (
                <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              )}
              
              {/* Título y Mensaje */}
              <h3 className="text-2xl font-bold text-white mb-2">{modal.title}</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">{modal.message}</p>
              
              {/* Botón de Aceptar */}
              <button 
                onClick={() => setModal({ ...modal, show: false })}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 hover:scale-105 active:scale-95"
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
