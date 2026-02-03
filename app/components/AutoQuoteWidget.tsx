'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  Loader2,
  Sparkles,
  DollarSign,
  Send,
  CheckCircle2,
  Package
} from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: string;
}

interface WidgetConfig {
  userId: number;
  title: string;
  subtitle: string;
  buttonText: string;
  primaryColor: string;
  showPrices: boolean;
  requireContactForPrices: boolean;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  successMessage: string;
}

interface AutoQuoteWidgetProps {
  userId: number;
  config?: Partial<WidgetConfig>;
}

export default function AutoQuoteWidget({ userId, config }: AutoQuoteWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'contact' | 'success'>('select');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [contact, setContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  
  const [quoteResult, setQuoteResult] = useState<{
    shortCode: string;
    total: number;
  } | null>(null);

  const defaultConfig: WidgetConfig = {
    userId,
    title: '💰 Cotiza tu proyecto',
    subtitle: 'Selecciona los servicios que necesitas',
    buttonText: 'Cotizar Ahora',
    primaryColor: '#8B5CF6',
    showPrices: true,
    requireContactForPrices: true,
    requireName: true,
    requireEmail: false,
    requirePhone: true,
    successMessage: '¡Listo! Te enviaremos tu cotización por WhatsApp'
  };

  const widgetConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen, userId]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      // Cargar catálogo público del usuario
      const res = await fetch(`/api/quotes/public/catalog/${userId}`);
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

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, itemId) => {
      const item = items.find(i => i.id === itemId);
      return sum + (item?.price || 0);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const canProceedToContact = () => selectedItems.length > 0;

  const canSubmit = () => {
    if (widgetConfig.requireName && !contact.name) return false;
    if (widgetConfig.requireEmail && !contact.email) return false;
    if (widgetConfig.requirePhone && !contact.phone) return false;
    return true;
  };

  const submitQuote = async () => {
    setSubmitting(true);
    try {
      const selectedItemsData = items
        .filter(i => selectedItems.includes(i.id))
        .map(item => ({
          catalogItemId: item.id,
          name: item.name,
          description: item.description,
          priceType: 'fixed',
          unitPrice: item.price,
          quantity: 1,
          total: item.price
        }));

      const res = await fetch('/api/quotes/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          client: contact,
          items: selectedItemsData,
          leadSource: 'auto-quoter-widget'
        })
      });

      const data = await res.json();

      if (data.success) {
        setQuoteResult({
          shortCode: data.quote.shortCode,
          total: data.quote.total
        });
        setStep('success');
      } else {
        alert(data.error || 'Error al enviar cotización');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('select');
    setSelectedItems([]);
    setContact({ name: '', email: '', phone: '', company: '' });
    setQuoteResult(null);
    setIsOpen(false);
  };

  // Categorías únicas de los items
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-6 py-4 rounded-2xl text-white font-bold shadow-2xl flex items-center gap-2"
        style={{ backgroundColor: widgetConfig.primaryColor }}
      >
        <Calculator className="w-5 h-5" />
        {widgetConfig.buttonText}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="p-6 text-white"
                style={{ backgroundColor: widgetConfig.primaryColor }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{widgetConfig.title}</h2>
                    <p className="text-white/80">{widgetConfig.subtitle}</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Step indicator */}
                <div className="flex gap-2 mt-4">
                  {['select', 'contact', 'success'].map((s, i) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition ${
                        step === s ? 'bg-white' :
                        ['select', 'contact', 'success'].indexOf(step) > i ? 'bg-white/60' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                      <p className="text-slate-400 mt-2">Cargando servicios...</p>
                    </div>
                  ) : step === 'select' ? (
                    <motion.div
                      key="select"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">No hay servicios disponibles</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {categories.map(category => (
                            <div key={category}>
                              <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                                {category}
                              </h4>
                              <div className="space-y-2">
                                {items
                                  .filter(item => item.category === category)
                                  .map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => toggleItem(item.id)}
                                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition ${
                                        selectedItems.includes(item.id)
                                          ? 'border-purple-500 bg-purple-500/10'
                                          : 'border-slate-700/50 hover:border-purple-500/50 bg-slate-900/50'
                                      }`}
                                    >
                                      {/* Checkbox */}
                                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${
                                        selectedItems.includes(item.id)
                                          ? 'border-purple-500 bg-purple-500'
                                          : 'border-slate-500'
                                      }`}>
                                        {selectedItems.includes(item.id) && (
                                          <Check className="w-4 h-4 text-white" />
                                        )}
                                      </div>
                                      
                                      {/* Icon */}
                                      <span className="text-2xl">{item.icon}</span>
                                      
                                      {/* Content */}
                                      <div className="flex-1 text-left">
                                        <h4 className="font-semibold text-white">{item.name}</h4>
                                        {item.description && (
                                          <p className="text-sm text-slate-400 line-clamp-1">{item.description}</p>
                                        )}
                                      </div>
                                      
                                      {/* Price */}
                                      {widgetConfig.showPrices && !widgetConfig.requireContactForPrices && (
                                        <span className="font-bold text-purple-400">
                                          {formatCurrency(item.price)}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : step === 'contact' ? (
                    <motion.div
                      key="contact"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300">
                            {selectedItems.length} servicio{selectedItems.length > 1 ? 's' : ''} seleccionado{selectedItems.length > 1 ? 's' : ''}
                          </span>
                          {widgetConfig.showPrices && (
                            <span className="text-xl font-bold text-purple-400">
                              {formatCurrency(calculateTotal())}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm mb-4">
                        Déjanos tus datos para enviarte la cotización completa
                      </p>

                      {/* Name */}
                      {widgetConfig.requireName && (
                        <div>
                          <label className="block text-sm text-slate-300 mb-2">Nombre *</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => setContact(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Tu nombre"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                            />
                          </div>
                        </div>
                      )}

                      {/* Company */}
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Empresa</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            value={contact.company}
                            onChange={(e) => setContact(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="Nombre de tu empresa"
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      {widgetConfig.requirePhone && (
                        <div>
                          <label className="block text-sm text-slate-300 mb-2">WhatsApp *</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              type="tel"
                              value={contact.phone}
                              onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+52 33 1234 5678"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                            />
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      {widgetConfig.requireEmail && (
                        <div>
                          <label className="block text-sm text-slate-300 mb-2">Email *</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="tu@email.com"
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">¡Cotización Enviada!</h3>
                      <p className="text-slate-400 mb-4">{widgetConfig.successMessage}</p>
                      
                      {quoteResult && (
                        <div className="p-4 rounded-xl bg-slate-900/50 inline-block">
                          <p className="text-slate-400 text-sm">Total estimado:</p>
                          <p className="text-3xl font-bold text-purple-400">
                            {formatCurrency(quoteResult.total)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {step !== 'success' && (
                <div className="p-6 border-t border-slate-700">
                  {step === 'select' ? (
                    <div className="flex items-center justify-between">
                      {selectedItems.length > 0 && widgetConfig.showPrices && !widgetConfig.requireContactForPrices && (
                        <div className="text-left">
                          <p className="text-sm text-slate-400">Total estimado:</p>
                          <p className="text-2xl font-bold text-purple-400">{formatCurrency(calculateTotal())}</p>
                        </div>
                      )}
                      <button
                        onClick={() => setStep('contact')}
                        disabled={!canProceedToContact()}
                        className="ml-auto px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{ backgroundColor: widgetConfig.primaryColor }}
                      >
                        Continuar
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('select')}
                        className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Atrás
                      </button>
                      <button
                        onClick={submitQuote}
                        disabled={!canSubmit() || submitting}
                        className="flex-[2] py-3 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: widgetConfig.primaryColor }}
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Enviar Cotización
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {step === 'success' && (
                <div className="p-6 border-t border-slate-700">
                  <button
                    onClick={reset}
                    className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
