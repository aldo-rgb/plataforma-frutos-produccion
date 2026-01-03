'use client';

import { useState, useEffect } from 'react';
import { Package, Users, Calendar, DollarSign, Filter, Download, Search, Loader2, Eye } from 'lucide-react';

interface PaqueteData {
  id: string;
  usuario: {
    nombre: string;
    email: string;
  };
  mentor: {
    nombre: string;
    email: string;
  };
  plan: string;
  frecuencia: string;
  cantidadSesiones: number;
  sesionesUsadas: number;
  sesionesRestantes: number;
  precioTotal: number;
  status: string;
  metodoPago: string;
  fechaCompra: string;
  expiresAt: string | null;
}

export default function PaquetesContratadosAdmin() {
  const [paquetes, setPaquetes] = useState<PaqueteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    plan: '',
    frecuencia: '',
    status: '',
    mentor: '',
    busqueda: '',
  });

  useEffect(() => {
    cargarPaquetes();
  }, []);

  const cargarPaquetes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/paquetes-lobo-solitario');
      
      if (!res.ok) {
        throw new Error('Error al cargar paquetes');
      }

      const data = await res.json();
      setPaquetes(data.paquetes || []);
    } catch (error) {
      console.error('Error al cargar paquetes:', error);
    } finally {
      setLoading(false);
    }
  };

  const paquetesFiltrados = paquetes.filter((paquete) => {
    if (filtros.plan && paquete.plan !== filtros.plan) return false;
    if (filtros.frecuencia && paquete.frecuencia !== filtros.frecuencia) return false;
    if (filtros.status && paquete.status !== filtros.status) return false;
    if (filtros.mentor && !paquete.mentor.nombre.toLowerCase().includes(filtros.mentor.toLowerCase())) return false;
    if (
      filtros.busqueda &&
      !paquete.usuario.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
      !paquete.usuario.email.toLowerCase().includes(filtros.busqueda.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const exportarCSV = () => {
    const headers = [
      'ID',
      'Usuario',
      'Email Usuario',
      'Mentor',
      'Email Mentor',
      'Plan',
      'Frecuencia',
      'Sesiones Total',
      'Sesiones Usadas',
      'Sesiones Restantes',
      'Precio Total',
      'Método Pago',
      'Status',
      'Fecha Compra',
      'Fecha Expiración',
    ];

    const rows = paquetesFiltrados.map((p) => [
      p.id,
      p.usuario.nombre,
      p.usuario.email,
      p.mentor.nombre,
      p.mentor.email,
      p.plan,
      p.frecuencia,
      p.cantidadSesiones,
      p.sesionesUsadas,
      p.sesionesRestantes,
      p.precioTotal,
      p.metodoPago,
      p.status,
      p.fechaCompra,
      p.expiresAt || 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paquetes-lobos-solitarios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paquetes Lobos Solitarios</h1>
        <p className="text-gray-600">Administra y consulta todos los paquetes contratados por usuarios individuales</p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total Paquetes</p>
              <p className="text-2xl font-bold">{paquetes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold">
                {paquetes.filter((p) => p.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Sesiones Totales</p>
              <p className="text-2xl font-bold">
                {paquetes.reduce((sum, p) => sum + p.cantidadSesiones, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold">
                ${paquetes.reduce((sum, p) => sum + p.precioTotal, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Buscar Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Usuario</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre o email..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={filtros.plan}
              onChange={(e) => setFiltros({ ...filtros, plan: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos</option>
              <option value="STANDARD">STANDARD</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </div>

          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
            <select
              value={filtros.frecuencia}
              onChange={(e) => setFiltros({ ...filtros, frecuencia: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              <option value="BIMESTRAL">BIMESTRAL</option>
              <option value="ANUAL">ANUAL</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos</option>
              <option value="COMPLETED">COMPLETADO</option>
              <option value="PENDING">PENDIENTE</option>
              <option value="FAILED">FALLIDO</option>
            </select>
          </div>

          {/* Exportar */}
          <div className="flex items-end">
            <button
              onClick={exportarCSV}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Botón Limpiar Filtros */}
        {(filtros.plan || filtros.frecuencia || filtros.status || filtros.busqueda || filtros.mentor) && (
          <button
            onClick={() => setFiltros({ plan: '', frecuencia: '', status: '', mentor: '', busqueda: '' })}
            className="mt-4 text-sm text-purple-600 hover:text-purple-800"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mentor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sesiones
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paquetesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron paquetes
                  </td>
                </tr>
              ) : (
                paquetesFiltrados.map((paquete) => (
                  <tr key={paquete.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{paquete.usuario.nombre}</p>
                        <p className="text-sm text-gray-500">{paquete.usuario.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{paquete.mentor.nombre}</p>
                        <p className="text-sm text-gray-500">{paquete.mentor.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium">{paquete.plan}</p>
                        <p className="text-sm text-gray-500">{paquete.frecuencia}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium">{paquete.cantidadSesiones} total</p>
                        <p className="text-sm text-gray-500">
                          {paquete.sesionesUsadas} usadas • {paquete.sesionesRestantes} restantes
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-green-600">${paquete.precioTotal.toLocaleString()} MXN</p>
                      <p className="text-xs text-gray-500">{paquete.metodoPago}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(paquete.status)}`}>
                        {paquete.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm">{new Date(paquete.fechaCompra).toLocaleDateString('es-MX')}</p>
                      {paquete.expiresAt && (
                        <p className="text-xs text-gray-500">
                          Exp: {new Date(paquete.expiresAt).toLocaleDateString('es-MX')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => window.location.href = `/dashboard/admin/paquetes/${paquete.id}`}
                        className="text-purple-600 hover:text-purple-800"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen Filtrado */}
      {paquetesFiltrados.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {paquetesFiltrados.length} de {paquetes.length} paquetes
        </div>
      )}
    </div>
  );
}
