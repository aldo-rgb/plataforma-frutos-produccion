'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
} from 'lucide-react';

interface Invoice {
  id: number;
  type: 'EVENT' | 'VISION';
  productId: number;
  productName: string;
  customerName: string;
  customerEmail: string;
  rfc: string | null;
  legalName: string | null;
  amount: number | null;
  invoiceId: string | null;
  invoiceStatus: string;
  invoicePdfUrl: string | null;
  invoiceXmlUrl: string | null;
  invoiceError: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Stats {
  pending: number;
  processing: number;
  completed: number;
  error: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Procesando',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: RefreshCw,
  },
  COMPLETED: {
    label: 'Completada',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  ERROR: {
    label: 'Error',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
};

export default function InvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, completed: 0, error: 0 });
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      fetchInvoices();
    }
  }, [status, session, filterStatus, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const statusParam = filterStatus !== 'ALL' ? `&status=${filterStatus}` : '';
      const res = await fetch(`/api/invoices/list?page=${page}&limit=20${statusParam}`);
      const data = await res.json();

      if (data.success) {
        setInvoices(data.data.invoices);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        showToast('error', data.error || 'Error al cargar facturas');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleRetry = async (invoiceId: number, type: 'EVENT' | 'VISION') => {
    try {
      setRetrying(invoiceId);
      const res = await fetch('/api/invoices/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          registrationId: type === 'EVENT' ? invoiceId : undefined,
          invoiceRequestId: type === 'VISION' ? invoiceId : undefined,
          type 
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', 'Factura generada exitosamente');
        fetchInvoices();
      } else {
        showToast('error', data.error || 'Error al generar factura');
      }
    } catch (error) {
      showToast('error', 'Error al reintentar factura');
    } finally {
      setRetrying(null);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchTerm === '' ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.productName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(amount));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            Gestión de Facturas
          </h1>
          <p className="mt-2 text-gray-600">
            Administra las facturas de los registros a eventos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
                <p className="text-sm text-gray-500">Procesando</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-sm text-gray-500">Completadas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
                <p className="text-sm text-gray-500">Con Error</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, RFC o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="PROCESSING">Procesando</option>
                <option value="COMPLETED">Completadas</option>
                <option value="ERROR">Con Error</option>
              </select>
            </div>
            <button
              onClick={fetchInvoices}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RFC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay facturas que mostrar</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const statusInfo = statusConfig[invoice.invoiceStatus] || statusConfig.PENDING;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {invoice.legalName || invoice.customerName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {invoice.customerEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-gray-700">
                            {invoice.rfc || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {invoice.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(invoice.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusInfo.label}
                          </span>
                          {invoice.invoiceError && (
                            <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{invoice.invoiceError}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.paidAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {invoice.invoiceStatus === 'COMPLETED' && invoice.invoiceId && (
                              <>
                                <a
                                  href={`/api/invoices/download?${invoice.type === 'EVENT' ? 'registrationId' : 'invoiceRequestId'}=${invoice.id}&type=pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
                                  title="Descargar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                  PDF
                                </a>
                                <a
                                  href={`/api/invoices/download?${invoice.type === 'EVENT' ? 'registrationId' : 'invoiceRequestId'}=${invoice.id}&type=xml`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                                  title="Descargar XML"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  XML
                                </a>
                              </>
                            )}
                            {(invoice.invoiceStatus === 'PENDING' ||
                              invoice.invoiceStatus === 'ERROR') && (
                              <button
                                onClick={() => handleRetry(invoice.id, invoice.type)}
                                disabled={retrying === invoice.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${retrying === invoice.id ? 'animate-spin' : ''}`}
                                />
                                {retrying === invoice.id ? 'Generando...' : 'Generar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast.show && (
          <div
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
