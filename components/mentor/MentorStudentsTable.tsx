'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Heart, 
  Phone, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Skull,
  Eye,
  RefreshCw
} from 'lucide-react';

interface Alumno {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  vidasRestantes: number;
  missedCallsCount: number;
  llamadasSemana: {
    completadas: number;
    total: number;
    meta: number;
  };
  evidencias: {
    pendientes: number;
    status: string;
  };
  status: {
    color: 'green' | 'yellow' | 'orange' | 'red';
    text: string;
  };
  isActive: boolean;
  suscripcion: string;
}

interface ResumenData {
  total: number;
  enRiesgo: number;
  eliminados: number;
  alDia: number;
}

export default function MentorStudentsTable() {
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrandoFalta, setRegistrandoFalta] = useState<number | null>(null);

  useEffect(() => {
    cargarAlumnos();
  }, []);

  const cargarAlumnos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mentor/mis-alumnos');
      const data = await res.json();
      
      if (data.success) {
        setAlumnos(data.alumnos);
        setResumen(data.resumen);
      } else {
        console.error('Error al cargar alumnos:', data.error);
      }
    } catch (error) {
      console.error('Error en fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMissedCall = async (studentId: number, studentName: string) => {
    const confirmed = confirm(
      `⚠️ ¿Marcar falta de asistencia para ${studentName}?\n\n` +
      `Esto restará 1 vida al alumno.\n` +
      `Si llega a 3 faltas, será ELIMINADO del programa.`
    );

    if (!confirmed) return;

    try {
      setRegistrandoFalta(studentId);
      
      const res = await fetch('/api/mentor/registrar-falta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId,
          reason: 'Falta registrada manualmente por el mentor'
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        
        // Recargar lista de alumnos
        await cargarAlumnos();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error al registrar falta:', error);
      alert('Error al registrar la falta. Intenta de nuevo.');
    } finally {
      setRegistrandoFalta(null);
    }
  };

  const renderCorazones = (vidasRestantes: number) => {
    if (vidasRestantes <= 0) {
      return (
        <span className="text-red-500 font-bold flex items-center gap-1">
          <Skull className="w-5 h-5" />
          ELIMINADO
        </span>
      );
    }

    const corazones = Array(vidasRestantes).fill('❤️');
    const corazonesVacios = Array(3 - vidasRestantes).fill('🖤');
    
    return (
      <div className="flex gap-1 items-center justify-center">
        {corazones.map((_, i) => (
          <Heart key={`full-${i}`} className="w-5 h-5 fill-red-500 text-red-500" />
        ))}
        {corazonesVacios.map((_, i) => (
          <Heart key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
        ))}
        <span className="text-sm text-gray-600 ml-1">({vidasRestantes}/3)</span>
      </div>
    );
  };

  const renderLlamadasSemana = (llamadas: Alumno['llamadasSemana']) => {
    const percentage = (llamadas.completadas / llamadas.meta) * 100;
    const cumplido = llamadas.completadas >= llamadas.meta;

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`text-lg font-bold ${cumplido ? 'text-green-600' : 'text-orange-600'}`}>
          {llamadas.completadas}/{llamadas.meta}
        </span>
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-[80px]">
          <div 
            className={`h-2 rounded-full transition-all ${
              cumplido ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {cumplido ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-orange-600" />
        )}
      </div>
    );
  };

  const getStatusBadge = (status: Alumno['status']) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      red: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[status.color]}`}>
        {status.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Cargando alumnos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Alumnos</p>
                <p className="text-2xl font-bold text-blue-600">{resumen.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Al Día</p>
                <p className="text-2xl font-bold text-green-600">{resumen.alDia}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">En Riesgo</p>
                <p className="text-2xl font-bold text-yellow-600">{resumen.enRiesgo}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Skull className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Eliminados</p>
                <p className="text-2xl font-bold text-red-600">{resumen.eliminados}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Alumnos */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Alumno
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Vidas Restantes
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Llamadas Semana
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Estatus Evidencias
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alumnos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg">No tienes alumnos asignados</p>
                  </td>
                </tr>
              ) : (
                alumnos.map((alumno) => (
                  <tr 
                    key={alumno.id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      !alumno.isActive ? 'opacity-50 bg-red-50' : ''
                    }`}
                  >
                    {/* Columna Alumno */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {alumno.imagen ? (
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={alumno.imagen} 
                              alt={alumno.nombre} 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {alumno.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {alumno.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {alumno.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Columna Vidas */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderCorazones(alumno.vidasRestantes)}
                    </td>

                    {/* Columna Llamadas */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderLlamadasSemana(alumno.llamadasSemana)}
                    </td>

                    {/* Columna Evidencias */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        <FileText className={`w-5 h-5 ${
                          alumno.evidencias.pendientes === 0 ? 'text-green-600' : 'text-orange-600'
                        }`} />
                        <span className={`text-sm font-medium ${
                          alumno.evidencias.pendientes === 0 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {alumno.evidencias.status}
                        </span>
                      </div>
                    </td>

                    {/* Columna Estado */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(alumno.status)}
                    </td>

                    {/* Columna Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => router.push(`/dashboard/mentor/revision-evidencias?alumno=${alumno.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Perfil
                        </button>
                        
                        {alumno.vidasRestantes > 0 && (
                          <button
                            onClick={() => handleMarkMissedCall(alumno.id, alumno.nombre)}
                            disabled={registrandoFalta === alumno.id}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            {registrandoFalta === alumno.id ? 'Procesando...' : 'Registrar Falta'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Leyenda:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            <span><strong>Vidas:</strong> 3 máximo. Al perder las 3, el alumno es eliminado.</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-600" />
            <span><strong>Meta:</strong> 2 llamadas por semana (obligatorio).</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <span><strong>Evidencias:</strong> Tareas/cartas pendientes de revisión.</span>
          </div>
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-600" />
            <span><strong>Eliminado:</strong> 3 strikes acumulados. Fuera del programa.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
