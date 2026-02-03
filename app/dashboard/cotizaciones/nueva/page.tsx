'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  Package,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  Calendar,
  DollarSign,
  Percent,
  MessageSquare,
  Send,
  Link as LinkIcon,
  Copy,
  Sparkles,
  Wand2,
  Clock,
  ArrowLeftRight,
  Users2,
  ChevronDown,
  Save
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Tipos
interface CatalogItem {
  id: string;
  name: string;
  description: string;
  priceType: 'fixed' | 'hourly' | 'range' | 'multiplier';
  price: number;
  priceMax?: number;
  unit?: string;
  icon: string;
}

interface QuoteItem {
  id: string;
  catalogItemId?: string;
  name: string;
  description?: string;
  priceType: 'fixed' | 'hourly' | 'range' | 'multiplier';
  unitPrice: number;
  quantity: number;
  total: number;
  isOptional?: boolean;
}

interface Client {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [step, setStep] = useState<'client' | 'items' | 'options' | 'preview'>('client');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);

  // Form State
  const [client, setClient] = useState<Client>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    company: ''
  });
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [optionalItems, setOptionalItems] = useState<QuoteItem[]>([]);
  
  const [options, setOptions] = useState({
    validDays: 15,
    notes: '',
    requiresDeposit: false,
    depositPercent: 50,
    discount: 0,
    discountType: 'percentage' as 'percentage' | 'fixed',
    tax: 0
  });

  // Custom item form
  const [customItem, setCustomItem] = useState({
    name: '',
    description: '',
    price: '',
    quantity: 1
  });

  // Result after creating
  const [createdQuote, setCreatedQuote] = useState<{
    id: string;
    shortCode: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/quotes/catalog', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setCatalog(data.items);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFromCatalog = (catalogItem: CatalogItem) => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      catalogItemId: catalogItem.id,
      name: catalogItem.name,
      description: catalogItem.description,
      priceType: catalogItem.priceType,
      unitPrice: catalogItem.price,
      quantity: 1,
      total: catalogItem.price
    };
    setItems(prev => [...prev, newItem]);
    setShowCatalogModal(false);
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) return;
    
    const price = parseFloat(customItem.price);
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      name: customItem.name,
      description: customItem.description,
      priceType: 'fixed',
      unitPrice: price,
      quantity: customItem.quantity,
      total: price * customItem.quantity
    };
    setItems(prev => [...prev, newItem]);
    setCustomItem({ name: '', description: '', price: '', quantity: 1 });
    setShowCustomItemModal(false);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity, total: item.unitPrice * quantity };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const toggleOptional = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      setOptionalItems(prev => [...prev, { ...item, isOptional: true }]);
    }
  };

  const moveToRequired = (itemId: string) => {
    const item = optionalItems.find(i => i.id === itemId);
    if (item) {
      setOptionalItems(prev => prev.filter(i => i.id !== itemId));
      setItems(prev => [...prev, { ...item, isOptional: false }]);
    }
  };

  // Cálculos
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = options.discountType === 'percentage' 
    ? subtotal * (options.discount / 100)
    : options.discount;
  const subtotalWithDiscount = subtotal - discountAmount;
  const taxAmount = subtotalWithDiscount * (options.tax / 100);
  const total = subtotalWithDiscount + taxAmount;
  const depositAmount = options.requiresDeposit ? total * (options.depositPercent / 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const canProceed = () => {
    switch (step) {
      case 'client':
        return client.name.trim().length > 0;
      case 'items':
        return items.length > 0;
      case 'options':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (step === 'client') setStep('items');
    else if (step === 'items') setStep('options');
    else if (step === 'options') setStep('preview');
  };

  const prevStep = () => {
    if (step === 'items') setStep('client');
    else if (step === 'options') setStep('items');
    else if (step === 'preview') setStep('options');
  };

  const createQuote = async (sendNow = false) => {
    setSaving(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify({
          client,
          items,
          optionalItems,
          discount: options.discount,
          discountType: options.discountType,
          tax: options.tax,
          validDays: options.validDays,
          notes: options.notes,
          requiresDeposit: options.requiresDeposit,
          depositPercent: options.depositPercent,
          sendNow
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setCreatedQuote({
          id: data.quote.id,
          shortCode: data.quote.shortCode,
          url: data.quoteUrl
        });
      } else {
        alert(data.error || 'Error al crear cotización');
      }
    } catch (error) {
      console.error('Error creating quote:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (createdQuote) {
      navigator.clipboard.writeText(createdQuote.url);
      alert('Enlace copiado');
    }
  };

  // Step indicators
  const steps = [
    { id: 'client', label: 'Cliente', icon: User },
    { id: 'items', label: 'Servicios', icon: Package },
    { id: 'options', label: 'Opciones', icon: MessageSquare },
    { id: 'preview', label: 'Vista Previa', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/cotizaciones"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-white">Nueva Cotización</h1>
            <p className="text-slate-400 text-sm">Constructor de propuestas profesionales</p>
          </div>
        </div>

        {/* Success State */}
        {createdQuote ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Cotización Creada!</h2>
            <p className="text-slate-400 mb-8">Tu propuesta está lista para compartir</p>
            
            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
              <p className="text-sm text-slate-400 mb-2">Enlace mágico:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={createdQuote.url}
                  readOnly
                  className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm"
                />
                <button
                  onClick={copyLink}
                  className="p-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard/cotizaciones"
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
              >
                Ver Mis Cotizaciones
              </Link>
              <Link
                href={`/propuesta/${createdQuote.shortCode}`}
                target="_blank"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition flex items-center gap-2"
              >
                Ver Propuesta
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = s.id === step;
                const isPast = steps.findIndex(st => st.id === step) > i;
                
                return (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className={`flex items-center gap-2 ${isActive ? 'text-purple-400' : isPast ? 'text-green-400' : 'text-slate-500'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                        isActive ? 'bg-purple-500/20 border-2 border-purple-500' :
                        isPast ? 'bg-green-500/20 border-2 border-green-500' :
                        'bg-slate-800 border-2 border-slate-600'
                      }`}>
                        {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className="text-sm font-medium hidden md:block">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition ${isPast ? 'bg-green-500' : 'bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {step === 'client' && (
                <motion.div
                  key="client"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-400" />
                      Datos del Cliente
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Nombre *</label>
                        <input
                          type="text"
                          value={client.name}
                          onChange={(e) => setClient(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nombre del cliente"
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Empresa</label>
                        <input
                          type="text"
                          value={client.company}
                          onChange={(e) => setClient(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Nombre de la empresa"
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Email</label>
                        <input
                          type="email"
                          value={client.email}
                          onChange={(e) => setClient(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="cliente@empresa.com"
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">WhatsApp</label>
                        <input
                          type="tel"
                          value={client.whatsapp}
                          onChange={(e) => setClient(prev => ({ ...prev, whatsapp: e.target.value }))}
                          placeholder="+52 33 1234 5678"
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'items' && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Add Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCatalogModal(true)}
                      className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition flex items-center justify-center gap-2 text-white"
                    >
                      <Package className="w-5 h-5 text-purple-400" />
                      Agregar del Catálogo
                    </button>
                    <button
                      onClick={() => setShowCustomItemModal(true)}
                      className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition flex items-center justify-center gap-2 text-white"
                    >
                      <Plus className="w-5 h-5 text-purple-400" />
                      Item Personalizado
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">Servicios a Cotizar</h3>
                    
                    {items.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">
                        Agrega servicios de tu catálogo o crea items personalizados
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-slate-400">{item.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-16 p-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-center"
                              />
                              <span className="text-slate-400">×</span>
                              <span className="text-white w-24 text-right">{formatCurrency(item.unitPrice)}</span>
                              <span className="text-slate-400">=</span>
                              <span className="text-purple-400 font-bold w-28 text-right">{formatCurrency(item.total)}</span>
                            </div>
                            
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleOptional(item.id)}
                                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                                title="Marcar como opcional"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Items */}
                    {optionalItems.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-700">
                        <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Opcionales (Upselling)
                        </h4>
                        <div className="space-y-2">
                          {optionalItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <span className="text-white flex-1">{item.name}</span>
                              <span className="text-amber-400">{formatCurrency(item.total)}</span>
                              <button
                                onClick={() => moveToRequired(item.id)}
                                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs"
                              >
                                Mover a requeridos
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subtotal */}
                    {items.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-700 flex justify-end">
                        <div className="text-right">
                          <span className="text-slate-400">Subtotal: </span>
                          <span className="text-2xl font-bold text-white">{formatCurrency(subtotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'options' && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Vigencia */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      Vigencia
                    </h3>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-slate-300">Válida por</span>
                      <select
                        value={options.validDays}
                        onChange={(e) => setOptions(prev => ({ ...prev, validDays: parseInt(e.target.value) }))}
                        className="p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white"
                      >
                        <option value={7}>7 días</option>
                        <option value={15}>15 días</option>
                        <option value={30}>30 días</option>
                        <option value={60}>60 días</option>
                      </select>
                    </div>
                  </div>

                  {/* Descuento e IVA */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-purple-400" />
                      Descuento e Impuestos
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Descuento</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={options.discount}
                            onChange={(e) => setOptions(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                            className="flex-1 p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white"
                          />
                          <select
                            value={options.discountType}
                            onChange={(e) => setOptions(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed' }))}
                            className="p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">$</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">IVA (%)</label>
                        <input
                          type="number"
                          min="0"
                          value={options.tax}
                          onChange={(e) => setOptions(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                          placeholder="16"
                          className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Anticipo */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Percent className="w-5 h-5 text-purple-400" />
                        Anticipo
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.requiresDeposit}
                          onChange={(e) => setOptions(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                          className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-purple-500"
                        />
                        <span className="text-slate-300">Requiere anticipo</span>
                      </label>
                    </div>
                    
                    {options.requiresDeposit && (
                      <div className="flex items-center gap-4">
                        <span className="text-slate-300">Porcentaje:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={options.depositPercent}
                          onChange={(e) => setOptions(prev => ({ ...prev, depositPercent: parseInt(e.target.value) || 50 }))}
                          className="w-20 p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white text-center"
                        />
                        <span className="text-slate-400">%</span>
                        <span className="text-purple-400 font-bold">= {formatCurrency(total * options.depositPercent / 100)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                      Notas y Condiciones
                    </h3>
                    
                    <textarea
                      value={options.notes}
                      onChange={(e) => setOptions(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Ej: Requiere 50% de anticipo. Tiempo de entrega: 2 semanas..."
                      rows={4}
                      className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {step === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Preview Card */}
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-6">Vista Previa de la Propuesta</h3>
                    
                    {/* Client */}
                    <div className="mb-6 pb-6 border-b border-slate-700">
                      <p className="text-slate-400 text-sm">Cliente:</p>
                      <p className="text-xl font-bold text-white">{client.name}</p>
                      {client.company && <p className="text-slate-400">{client.company}</p>}
                    </div>
                    
                    {/* Items */}
                    <div className="mb-6">
                      <p className="text-slate-400 text-sm mb-3">Servicios:</p>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between text-white">
                            <span>{item.quantity}× {item.name}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Totals */}
                    <div className="pt-6 border-t border-slate-700 space-y-2">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {options.discount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Descuento ({options.discountType === 'percentage' ? `${options.discount}%` : 'fijo'})</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      {options.tax > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>IVA ({options.tax}%)</span>
                          <span>+{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-2xl font-bold text-purple-400 pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      {options.requiresDeposit && (
                        <div className="flex justify-between text-amber-400 text-sm">
                          <span>Anticipo requerido ({options.depositPercent}%)</span>
                          <span>{formatCurrency(depositAmount)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Notes */}
                    {options.notes && (
                      <div className="mt-6 pt-6 border-t border-slate-700">
                        <p className="text-slate-400 text-sm">Notas:</p>
                        <p className="text-white mt-1">{options.notes}</p>
                      </div>
                    )}
                    
                    {/* Validity */}
                    <div className="mt-4 text-sm text-slate-500">
                      ⏰ Válida por {options.validDays} días
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                disabled={step === 'client'}
                className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Anterior
              </button>
              
              {step === 'preview' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => createQuote(false)}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Guardar Borrador
                  </button>
                  <button
                    onClick={() => createQuote(true)}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? 'Creando...' : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Generar Enlace Mágico
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Siguiente
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Catalog Modal */}
        <AnimatePresence>
          {showCatalogModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCatalogModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Seleccionar del Catálogo</h2>
                  <button
                    onClick={() => setShowCatalogModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  {catalog.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Tu catálogo está vacío</p>
                      <Link
                        href="/dashboard/cotizaciones/catalogo"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        Agregar servicios al catálogo
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {catalog.map(item => (
                        <button
                          key={item.id}
                          onClick={() => addFromCatalog(item)}
                          className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-purple-500/50 transition text-left flex items-center gap-4"
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-slate-400 line-clamp-1">{item.description}</p>
                            )}
                          </div>
                          <span className="text-purple-400 font-bold">
                            {formatCurrency(item.price)}
                            {item.priceType === 'hourly' && `/${item.unit || 'hr'}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Item Modal */}
        <AnimatePresence>
          {showCustomItemModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCustomItemModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">Item Personalizado</h2>
                  <button
                    onClick={() => setShowCustomItemModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Nombre *</label>
                    <input
                      type="text"
                      value={customItem.name}
                      onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del servicio"
                      className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Descripción</label>
                    <input
                      type="text"
                      value={customItem.description}
                      onChange={(e) => setCustomItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción breve"
                      className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Precio *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          value={customItem.price}
                          onChange={(e) => setCustomItem(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={customItem.quantity}
                        onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full p-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 p-6 border-t border-slate-700">
                  <button
                    onClick={() => setShowCustomItemModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={addCustomItem}
                    disabled={!customItem.name || !customItem.price}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    Agregar
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
