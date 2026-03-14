'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Users,
  Calendar,
  Mail,
  Phone,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
} from 'lucide-react';

interface EventRegistration {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  comoTeEnteraste: string | null;
  status: 'PENDING_PAYMENT' | 'REGISTERED' | 'CONFIRMED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';
  confirmedAt: string | null;
  attendedAt: string | null;
  createdAt: string;
  paymentStatus?: string | null;
  ticketCode?: string | null;
}

interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  startDate: string | null;
  location: string | null;
  maxCapacity: number | null;
  currentEnrollment: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_PAYMENT: { label: 'Pendiente de pago', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: CreditCard },
  REGISTERED: { label: 'Pagado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  CONFIRMED: { label: 'Confirmado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  ATTENDED: { label: 'Asistió', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: UserCheck },
  NO_SHOW: { label: 'No asistió', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: UserX },
  CANCELLED: { label: 'Cancelado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle },
};

export default function RegistrosProductoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [updating, setUpdating] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal de confirmación para eliminar
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; registrationId: number | null; registrationName: string }>({
    show: false,
    registrationId: null,
    registrationName: '',
  });

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN' && session?.user?.rol !== 'ADMINISTRADOR') {
      router.push('/dashboard');
    } else {
      fetchData();
    }
  }, [status, session, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/school-admin/products/${productId}/registrations`);
      const data = await res.json();

      if (data.success) {
        setProduct(data.product);
        setRegistrations(data.registrations);
      } else {
        showToast('error', data.error || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleUpdateStatus = async (registrationId: number, newStatus: string) => {
    try {
      setUpdating(registrationId);
      const res = await fetch(`/api/school-admin/products/${productId}/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setRegistrations(prev =>
          prev.map(r => (r.id === registrationId ? { ...r, status: newStatus as EventRegistration['status'] } : r))
        );
        showToast('success', 'Estado actualizado');
      } else {
        showToast('error', data.error || 'Error al actualizar');
      }
    } catch (error) {
      showToast('error', 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteRegistration = async (registrationId: number) => {
    try {
      setUpdating(registrationId);
      const res = await fetch(`/api/school-admin/products/${productId}/registrations/${registrationId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setRegistrations(prev => prev.filter(r => r.id !== registrationId));
        showToast('success', 'Registro eliminado');
      } else {
        showToast('error', data.error || 'Error al eliminar');
      }
    } catch (error) {
      showToast('error', 'Error al eliminar');
    } finally {
      setUpdating(null);
      setDeleteModal({ show: false, registrationId: null, registrationName: '' });
    }
  };

  const openDeleteModal = (registrationId: number, name: string) => {
    setDeleteModal({ show: true, registrationId, registrationName: name });
  };

  const copyEventLink = () => {
    const url = `${window.location.origin}/evento/${productId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('success', 'Enlace copiado');
  };

  // Filtrar registros
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.telefono && r.telefono.includes(searchTerm));

    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.status === 'CONFIRMED').length,
    attended: registrations.filter(r => r.status === 'ATTENDED').length,
    cancelled: registrations.filter(r => r.status === 'CANCELLED').length,
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/school-admin/productos')}
              className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                📋 Registros del Evento
              </h1>
              {product && (
                <p className="text-slate-400 mt-1">{product.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyEventLink}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a
              href={`/evento/${productId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Ver página
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Total registros</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.confirmed}</p>
                <p className="text-xs text-slate-400">Confirmados</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.attended}</p>
                <p className="text-xs text-slate-400">Asistieron</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.cancelled}</p>
                <p className="text-xs text-slate-400">Cancelados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="REGISTERED">Registrados</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="ATTENDED">Asistieron</option>
                <option value="NO_SHOW">No asistieron</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          {filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No hay registros</h3>
              <p className="text-slate-400">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'No se encontraron registros con los filtros aplicados'
                  : 'Aún no hay personas registradas en este evento'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Participante
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Quién invitó
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredRegistrations.map(registration => {
                    const statusInfo = statusConfig[registration.status];
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={registration.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold">
                              {registration.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-white">{registration.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {registration.email}
                            </div>
                            {registration.telefono && (
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Phone className="w-4 h-4" />
                                {registration.telefono}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {registration.comoTeEnteraste || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={registration.status}
                            onChange={e => handleUpdateStatus(registration.id, e.target.value)}
                            disabled={updating === registration.id}
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color} bg-transparent cursor-pointer focus:outline-none`}
                          >
                            <option value="REGISTERED">Registrado</option>
                            <option value="CONFIRMED">Confirmado</option>
                            <option value="ATTENDED">Asistió</option>
                            <option value="NO_SHOW">No asistió</option>
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(registration.createdAt).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openDeleteModal(registration.id, registration.nombre)}
                            disabled={updating === registration.id}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            {updating === registration.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-sm text-slate-400">
          Mostrando {filteredRegistrations.length} de {registrations.length} registros
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteModal({ show: false, registrationId: null, registrationName: '' })}
          />

          {/* Modal */}
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Eliminar registro
            </h3>

            {/* Mensaje */}
            <p className="text-slate-400 text-center mb-6">
              ¿Estás seguro de eliminar el registro de{' '}
              <span className="text-white font-medium">{deleteModal.registrationName}</span>?
              Esta acción no se puede deshacer.
            </p>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, registrationId: null, registrationName: '' })}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteModal.registrationId && handleDeleteRegistration(deleteModal.registrationId)}
                disabled={updating === deleteModal.registrationId}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updating === deleteModal.registrationId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
