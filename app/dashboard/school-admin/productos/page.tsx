'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  X,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Users,
  DollarSign,
  Upload,
  Package,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SchoolProduct {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  type: 'CORE_TRAINING' | 'EXTRA_WORKSHOP';
  levelType: 'BASIC' | 'ADVANCED' | 'PL' | 'NONE';
  basePrice: number;
  promoPrice: number | null;
  promoDeadline: string | null;
  startDate: string | null;
  endDate: string | null;
  maxCapacity: number | null;
  currentEnrollment: number;
  isActive: boolean;
  location: string | null;
  videoUrl: string | null;
  createdAt: string;
  Organization?: {
    logoUrl: string | null;
  };
}

export default function ProductosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<SchoolProduct[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SchoolProduct | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CORE_TRAINING' | 'EXTRA_WORKSHOP'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast notification state
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    type: 'EXTRA_WORKSHOP' as 'EXTRA_WORKSHOP',
    basePrice: 0,
    promoPrice: null as number | null,
    promoDeadline: '',
    startDate: '',
    endDate: '',
    maxCapacity: 30,
    location: '',
    videoUrl: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN' && session?.user?.rol !== 'ADMINISTRADOR') {
      router.push('/dashboard');
    } else {
      fetchProducts();
    }
  }, [status, session]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school-admin/products');
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('error', 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeCoreProducts = async () => {
    try {
      setSaving(true);
      const initRes = await fetch('/api/school-admin/products/initialize', {
        method: 'POST',
      });
      const initData = await initRes.json();
      
      if (initData.success) {
        setProducts(initData.products);
        showToast('success', '✅ Productos CORE inicializados correctamente');
      } else {
        showToast('error', initData.error || 'Error al inicializar productos');
      }
    } catch (error) {
      console.error('Error initializing products:', error);
      showToast('error', 'Error al inicializar productos CORE');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleOpenModal = (product?: SchoolProduct) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        type: product.type,
        basePrice: product.basePrice,
        promoPrice: product.promoPrice,
        promoDeadline: product.promoDeadline ? product.promoDeadline.split('T')[0] : '',
        startDate: product.startDate ? product.startDate.split('T')[0] : '',
        endDate: product.endDate ? product.endDate.split('T')[0] : '',
        maxCapacity: product.maxCapacity || 30,
        location: product.location || '',
        videoUrl: product.videoUrl || '',
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        imageUrl: '',
        type: 'EXTRA_WORKSHOP',
        basePrice: 0,
        promoPrice: null,
        promoDeadline: '',
        startDate: '',
        endDate: '',
        maxCapacity: 30,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      imageUrl: '',
      type: 'EXTRA_WORKSHOP',
      basePrice: 0,
      promoPrice: null,
      promoDeadline: '',
      startDate: '',
      endDate: '',
      maxCapacity: 30,
      location: '',
      videoUrl: '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setProductForm({ ...productForm, imageUrl: data.url });
        showToast('success', '✅ Imagen subida exitosamente');
      } else {
        showToast('error', data.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('error', 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    // Validaciones
    if (!productForm.name.trim()) {
      showToast('error', 'El nombre del producto es requerido');
      return;
    }

    if (productForm.basePrice <= 0) {
      showToast('error', 'El precio base debe ser mayor a 0');
      return;
    }

    if (productForm.promoPrice && productForm.promoPrice >= productForm.basePrice) {
      showToast('error', 'El precio promocional debe ser menor al precio base');
      return;
    }

    if (productForm.promoPrice && !productForm.promoDeadline) {
      showToast('error', 'Debes establecer una fecha límite para la promoción');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...productForm,
        promoPrice: productForm.promoPrice || null,
        promoDeadline: productForm.promoDeadline
          ? new Date(productForm.promoDeadline).toISOString()
          : null,
        startDate: productForm.startDate
          ? new Date(productForm.startDate).toISOString()
          : null,
        endDate: productForm.endDate
          ? new Date(productForm.endDate).toISOString()
          : null,
      };

      const url = editingProduct
        ? `/api/school-admin/products`
        : `/api/school-admin/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingProduct ? { ...payload, id: editingProduct.id } : payload
        ),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', editingProduct ? '✅ Producto actualizado' : '✅ Producto creado');
        handleCloseModal();
        fetchProducts();
      } else {
        showToast('error', data.error || 'Error al guardar el producto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('error', 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const res = await fetch(`/api/school-admin/products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', '✅ Producto eliminado');
        fetchProducts();
      } else {
        showToast('error', data.error || 'Error al eliminar el producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('error', 'Error al eliminar el producto');
    }
  };

  const handleToggleActive = async (product: SchoolProduct) => {
    try {
      const res = await fetch(`/api/school-admin/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          isActive: !product.isActive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', product.isActive ? '❌ Producto desactivado' : '✅ Producto activado');
        fetchProducts();
      } else {
        showToast('error', data.error || 'Error al actualizar el producto');
      }
    } catch (error) {
      console.error('Error toggling product:', error);
      showToast('error', 'Error al actualizar el producto');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'ALL' || product.type === filter;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const coreProducts = filteredProducts.filter(p => p.type === 'CORE_TRAINING');
  const extraProducts = filteredProducts.filter(p => p.type === 'EXTRA_WORKSHOP');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xl font-bold">Cargando productos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-xl border min-w-[280px] sm:min-w-[360px] max-w-md ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500/95 to-green-500/95 border-emerald-300/50 shadow-emerald-500/20' 
              : 'bg-gradient-to-r from-red-500/95 to-rose-500/95 border-red-300/50 shadow-red-500/20'
          }`}>
            {toast.type === 'success' ? (
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-xs sm:text-sm leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({show: false, message: '', type: 'success'})}
              className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-all active:scale-95"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <button
                onClick={() => router.push('/dashboard/school-admin')}
                className="text-blue-100 hover:text-white mb-3 sm:mb-4 flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Volver al Panel
              </button>
              <h1 className="text-2xl sm:text-4xl font-black text-white mb-2 flex items-center gap-2 sm:gap-3">
                <Package className="w-6 h-6 sm:w-10 sm:h-10" />
                <span>Gestión de Entrenamientos</span>
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Administra todos tus entrenamientos y talleres
              </p>
              
              {/* Botón de Precios Predeterminados */}
              <button
                onClick={() => router.push('/dashboard/school-admin/precios')}
                className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-lg text-sm font-semibold transition-all"
              >
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Configurar Precios Predeterminados</span>
                <span className="xs:hidden">Precios</span>
              </button>
            </div>
            <div className="text-center sm:text-right w-full sm:w-auto">
              <div className="text-blue-100 text-xs sm:text-sm mb-1">Total Productos</div>
              <div className="text-4xl sm:text-5xl font-black text-white">{products.length}</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full md:w-auto">
              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Buscar productos..."
                className="px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    filter === 'ALL'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilter('CORE_TRAINING')}
                  className={`px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    filter === 'CORE_TRAINING'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  🎓 CORE
                </button>
                <button
                  onClick={() => setFilter('EXTRA_WORKSHOP')}
                  className={`px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    filter === 'EXTRA_WORKSHOP'
                      ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  🎯 Talleres
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Vision Builder Button */}
              <button
                onClick={() => router.push('/dashboard/school-admin/visiones?openModal=vision-builder')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                🎯 Vision Builder
              </button>
              {/* Nuevo Liderato Button */}
              <button
                onClick={() => router.push('/dashboard/school-admin/visiones?openModal=liderato')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Nuevo Liderato
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Crear Taller
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-green-900/40 to-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-xs sm:text-sm font-medium mb-1">Entrenamientos CORE</p>
                <p className="text-2xl sm:text-3xl font-black text-white">{coreProducts.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">🎓</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-medium mb-1">Talleres Extras</p>
                <p className="text-3xl font-black text-white">{extraProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Productos Activos</p>
                <p className="text-3xl font-black text-white">
                  {products.filter(p => p.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos creados'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda' 
                : 'Puedes inicializar los 5 productos CORE (Básico, Avanzado, PL y Combos) o crear tus propios productos personalizados'
              }
            </p>
            {!searchTerm && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleInitializeCoreProducts}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Inicializando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Inicializar Productos CORE
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Crear Producto Personalizado
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* CORE Products */}
            {(filter === 'ALL' || filter === 'CORE_TRAINING') && coreProducts.length > 0 && (
              <div>
                <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                  <span>🎓</span> Entrenamientos CORE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coreProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={() => handleOpenModal(product)}
                      onDelete={() => handleDeleteProduct(product.id)}
                      onToggleActive={() => handleToggleActive(product)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* EXTRA Products */}
            {(filter === 'ALL' || filter === 'EXTRA_WORKSHOP') && extraProducts.length > 0 && (
              <div>
                <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                  <span>🎯</span> Talleres y Eventos Extras
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {extraProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={() => handleOpenModal(product)}
                      onDelete={() => handleDeleteProduct(product.id)}
                      onToggleActive={() => handleToggleActive(product)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-blue-500/30 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-6 border-b border-slate-700 flex items-center justify-between z-10">
              <h3 className="text-2xl font-black text-white">
                {editingProduct ? '✏️ Editar Producto' : '➕ Crear Producto'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="text-white font-bold block mb-2">Imagen del Producto</label>
                <div className="flex items-center gap-4">
                  {productForm.imageUrl && (
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-slate-600"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium cursor-pointer inline-flex items-center gap-2 transition-all ${
                        uploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Subir Imagen
                        </>
                      )}
                    </label>
                    <p className="text-slate-400 text-xs mt-2">Formato: JPG, PNG. Máximo 5MB</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-white font-bold block mb-2">Nombre del Producto *</label>
                <input
                  type="text"
                  placeholder="Ej: Taller de Meditación Avanzada"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-white font-bold block mb-2">Descripción</label>
                <textarea
                  placeholder="Describe el producto..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-bold block mb-2">Precio Base *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      value={productForm.basePrice || ''}
                      onChange={(e) => setProductForm({ ...productForm, basePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-bold block mb-2">Precio Promocional</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      value={productForm.promoPrice || ''}
                      onChange={(e) => setProductForm({ ...productForm, promoPrice: parseFloat(e.target.value) || null })}
                    />
                  </div>
                </div>
              </div>

              {/* Promo Deadline */}
              {productForm.promoPrice && (
                <div>
                  <label className="text-white font-bold block mb-2">Fecha Límite de Promoción</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    value={productForm.promoDeadline}
                    onChange={(e) => setProductForm({ ...productForm, promoDeadline: e.target.value })}
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-bold block mb-2">Fecha de Inicio</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    value={productForm.startDate}
                    onChange={(e) => setProductForm({ ...productForm, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-white font-bold block mb-2">Fecha de Fin</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    value={productForm.endDate}
                    onChange={(e) => setProductForm({ ...productForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="text-white font-bold block mb-2">Capacidad Máxima</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    placeholder="30"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    value={productForm.maxCapacity || ''}
                    onChange={(e) => setProductForm({ ...productForm, maxCapacity: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              {/* Location (Address) */}
              <div>
                <label className="text-white font-bold block mb-2">Dirección del Evento</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Revolucíon 1234, Col. Centro, Monterrey, NL"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  value={productForm.location}
                  onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                />
              </div>

              {/* Video URL */}
              <div>
                <label className="text-white font-bold block mb-2">URL del Video</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  value={productForm.videoUrl}
                  onChange={(e) => setProductForm({ ...productForm, videoUrl: e.target.value })}
                />
                <p className="text-slate-400 text-xs mt-2">URL del video promocional o informativo del taller</p>
              </div>

              {/* Warning for CORE products */}
              {editingProduct?.type === 'CORE_TRAINING' && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-bold text-sm">Producto CORE</p>
                    <p className="text-yellow-400/80 text-xs mt-1">
                      Los productos CORE no pueden ser eliminados, solo editados o desactivados.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all inline-flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {editingProduct ? 'Actualizar' : 'Crear Producto'}
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

// Product Card Component
function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  product: SchoolProduct;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const isCoreProduct = product.type === 'CORE_TRAINING';
  const hasPromo = product.promoPrice && product.promoDeadline && new Date(product.promoDeadline) > new Date();

  return (
    <div className={`bg-gradient-to-br rounded-xl border-2 overflow-hidden shadow-xl transition-all hover:scale-[1.02] ${
      isCoreProduct 
        ? 'from-green-900/30 to-slate-900/50 border-green-500/30' 
        : 'from-orange-900/30 to-slate-900/50 border-orange-500/30'
    } ${!product.isActive ? 'opacity-60' : ''}`}>
      {/* Image */}
      <div className="relative h-32 bg-slate-900/50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : product.Organization?.logoUrl ? (
          <img
            src={product.Organization.logoUrl}
            alt="Logo de organización"
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {isCoreProduct ? '🎓' : '🎯'}
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            isCoreProduct 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 text-white'
          }`}>
            {isCoreProduct ? '🎓 CORE' : '🎯 TALLER'}
          </span>
          {!product.isActive && (
            <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs font-bold">
              ❌ Inactivo
            </span>
          )}
          {hasPromo && (
            <span className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs font-bold">
              🔥 PROMO
            </span>
          )}
        </div>

        {/* Level Badge */}
        {product.levelType !== 'NONE' && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 bg-purple-500 text-white rounded text-xs font-bold">
              {product.levelType === 'BASIC' && '🌱 Básico'}
              {product.levelType === 'ADVANCED' && '🔥 Avanzado'}
              {product.levelType === 'PL' && '👑 PL'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="text-lg font-black text-white line-clamp-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-slate-400 text-xs line-clamp-1">
            {product.description}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-center gap-1.5">
          {hasPromo ? (
            <>
              <span className="text-lg font-black text-green-400">
                ${product.promoPrice?.toFixed(2)}
              </span>
              <span className="text-sm text-slate-500 line-through">
                ${product.basePrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-lg font-black text-white">
              ${product.basePrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Dates */}
        {product.startDate && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(product.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              {product.endDate && ` - ${new Date(product.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}
            </span>
          </div>
        )}

        {/* Capacity */}
        {product.maxCapacity && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Users className="w-3 h-3" />
            <span>
              {product.currentEnrollment} / {product.maxCapacity} participantes
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t border-slate-700">
          <button
            onClick={onToggleActive}
            className={`flex-1 px-2 py-1.5 rounded font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              product.isActive
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {product.isActive ? (
              <>
                <EyeOff className="w-3 h-3" />
                <span className="hidden sm:inline">Desactivar</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Activar</span>
              </>
            )}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-all"
          >
            <Edit className="w-3 h-3" />
          </button>
          {!isCoreProduct && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
