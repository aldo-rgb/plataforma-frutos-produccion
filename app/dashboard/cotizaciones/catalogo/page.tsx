'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  GripVertical,
  DollarSign,
  Clock,
  ArrowLeftRight,
  Users2,
  X,
  Check,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Tag
} from 'lucide-react';
import Link from 'next/link';

// Tipos
interface CatalogItem {
  id: string;
  name: string;
  description: string;
  priceType: 'fixed' | 'hourly' | 'range' | 'multiplier';
  price: number;
  priceMax?: number;
  unit?: string;
  photo?: string;
  icon: string;
  category: string;
  isActive: boolean;
  order: number;
}

// Configuración de tipos de precio
const PRICE_TYPES = {
  fixed: { 
    label: 'Precio Fijo', 
    icon: DollarSign, 
    description: 'Un precio exacto por el servicio',
    example: 'Ej: Diseño de Logo - $5,000'
  },
  hourly: { 
    label: 'Por Hora', 
    icon: Clock, 
    description: 'Tarifa por cada hora de trabajo',
    example: 'Ej: Consultoría - $1,500/hr'
  },
  range: { 
    label: 'Rango de Precio', 
    icon: ArrowLeftRight, 
    description: 'Precio mínimo y máximo',
    example: 'Ej: Desarrollo Web - $15,000 a $25,000'
  },
  multiplier: { 
    label: 'Con Multiplicador', 
    icon: Users2, 
    description: 'Precio base × cantidad variable',
    example: 'Ej: Licencias - $500 × usuarios'
  }
};

// Emojis sugeridos
const SUGGESTED_ICONS = ['📦', '💼', '🎨', '💻', '📱', '🎯', '✨', '🚀', '📝', '🔧', '📊', '🎬', '📸', '🎤', '💡', '🏠', '🚗', '✈️', '🍳', '💪'];

// Categorías
const CATEGORIES = [
  'general',
  'diseño',
  'desarrollo',
  'marketing',
  'consultoría',
  'educación',
  'salud',
  'legal',
  'finanzas',
  'otro'
];

export default function CatalogoPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceType: 'fixed' as 'fixed' | 'hourly' | 'range' | 'multiplier',
    price: '',
    priceMax: '',
    unit: '',
    icon: '📦',
    category: 'general'
  });

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quotes/catalog', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      priceType: 'fixed',
      price: '',
      priceMax: '',
      unit: '',
      icon: '📦',
      category: 'general'
    });
    setShowModal(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      priceType: item.priceType,
      price: item.price.toString(),
      priceMax: item.priceMax?.toString() || '',
      unit: item.unit || '',
      icon: item.icon,
      category: item.category
    });
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!formData.name || !formData.price) {
      alert('Nombre y precio son requeridos');
      return;
    }

    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name,
        description: formData.description,
        priceType: formData.priceType,
        price: parseFloat(formData.price),
        icon: formData.icon,
        category: formData.category
      };

      if (formData.priceType === 'range' && formData.priceMax) {
        body.priceMax = parseFloat(formData.priceMax);
      }
      if ((formData.priceType === 'hourly' || formData.priceType === 'multiplier') && formData.unit) {
        body.unit = formData.unit;
      }
      if (editingItem) {
        body.id = editingItem.id;
      }

      const res = await fetch('/api/quotes/catalog', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        loadCatalog();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este servicio del catálogo?')) return;

    try {
      await fetch(`/api/quotes/catalog?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      loadCatalog();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const formatPrice = (item: CatalogItem) => {
    const formatter = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });

    switch (item.priceType) {
      case 'fixed':
        return formatter.format(item.price);
      case 'hourly':
        return `${formatter.format(item.price)}/${item.unit || 'hr'}`;
      case 'range':
        return `${formatter.format(item.price)} - ${formatter.format(item.priceMax || item.price)}`;
      case 'multiplier':
        return `${formatter.format(item.price)} × ${item.unit || 'unidad'}`;
      default:
        return formatter.format(item.price);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/cotizaciones"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-400" />
              Catálogo de Servicios
            </h1>
            <p className="text-slate-400 mt-1">
              Define los "ladrillos" de tu negocio para crear cotizaciones rápidas
            </p>
          </div>
          
          <button
            onClick={openNewModal}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-5 h-5" />
            Agregar Servicio
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-purple-500 transition"
          />
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            Cargando catálogo...
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50"
          >
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Catálogo vacío</h3>
            <p className="text-slate-400 mb-6">Agrega tus servicios para empezar a cotizar</p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition"
            >
              <Plus className="w-5 h-5" />
              Agregar primer servicio
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/30 transition group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                      {item.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-white">{item.name}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${
                            item.priceType === 'fixed' ? 'bg-green-500/20 text-green-400' :
                            item.priceType === 'hourly' ? 'bg-blue-500/20 text-blue-400' :
                            item.priceType === 'range' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {PRICE_TYPES[item.priceType].label}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                      )}
                      
                      <p className="text-lg font-bold text-purple-400 mt-2">
                        {formatPrice(item)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">
                    {editingItem ? 'Editar Servicio' : 'Nuevo Servicio'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Icon Selector */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">Icono</label>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_ICONS.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition ${
                            formData.icon === icon 
                              ? 'bg-purple-600 ring-2 ring-purple-400' 
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">
                      Nombre del Servicio *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Diseño de Logo"
                      className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">
                      Descripción (Qué incluye)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ej: Incluye 3 propuestas de diseño, archivo en alta resolución..."
                      rows={3}
                      className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition resize-none"
                    />
                  </div>

                  {/* Price Type */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">
                      Tipo de Precio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PRICE_TYPES).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, priceType: key as any }))}
                            className={`p-3 rounded-xl border text-left transition ${
                              formData.priceType === key
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 text-purple-400" />
                              <span className="font-medium text-white text-sm">{config.label}</span>
                            </div>
                            <p className="text-xs text-slate-400">{config.example}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Input(s) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2 font-medium">
                        {formData.priceType === 'range' ? 'Precio Mínimo *' : 'Precio *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {formData.priceType === 'range' && (
                      <div>
                        <label className="block text-sm text-slate-300 mb-2 font-medium">
                          Precio Máximo
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                          <input
                            type="number"
                            value={formData.priceMax}
                            onChange={(e) => setFormData(prev => ({ ...prev, priceMax: e.target.value }))}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                          />
                        </div>
                      </div>
                    )}

                    {(formData.priceType === 'hourly' || formData.priceType === 'multiplier') && (
                      <div>
                        <label className="block text-sm text-slate-300 mb-2 font-medium">
                          Unidad
                        </label>
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder={formData.priceType === 'hourly' ? 'hora' : 'usuario'}
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white focus:border-purple-500 transition"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Modal Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-700">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveItem}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>Guardando...</>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingItem ? 'Guardar Cambios' : 'Agregar'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
