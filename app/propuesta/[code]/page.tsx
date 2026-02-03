'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Check,
  X,
  MessageSquare,
  Download,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  PenLine,
  Trash2,
  Send,
  CreditCard,
  Sparkles,
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useParams } from 'next/navigation';

interface Quote {
  id: string;
  shortCode: string;
  client: {
    name: string;
    email?: string;
    company?: string;
  };
  items: {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  optionalItems: {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  tax: number;
  total: number;
  currency: string;
  validDays: number;
  expiresAt: string;
  notes?: string;
  requiresDeposit: boolean;
  depositPercent: number;
  status: string;
  createdAt: string;
  isApproved: boolean;
  signedAt?: string;
}

interface Provider {
  id: number;
  name: string;
  email?: string;
  whatsapp?: string;
  avatar?: string;
  address?: string;
}

export default function PropuestaPage() {
  const params = useParams();
  const code = params.code as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  
  // Estado de interacción
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<'approved' | 'rejected' | null>(null);
  
  // Firma digital
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [code]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/public/${code}`);
      const data = await res.json();
      
      if (data.success) {
        setQuote(data.quote);
        setProvider(data.provider);
      } else {
        setError(data.error || 'Propuesta no encontrada');
      }
    } catch (err) {
      setError('Error al cargar la propuesta');
    } finally {
      setLoading(false);
    }
  };

  // Funciones de firma
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    initCanvas();
    setHasSignature(false);
  };

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  // Calcular total con opcionales
  const calculateTotal = () => {
    if (!quote) return 0;
    
    let total = quote.total;
    selectedOptionals.forEach(optId => {
      const opt = quote.optionalItems.find(o => o.id === optId);
      if (opt) total += opt.total;
    });
    
    return total;
  };

  // Acciones
  const approveQuote = async () => {
    if (!hasSignature) {
      alert('Por favor firma para continuar');
      return;
    }
    
    const signature = getSignatureData();
    if (!signature) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/quotes/public/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          signature,
          selectedOptionals,
          clientName: quote?.client.name
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess('approved');
        setShowSignModal(false);
      } else {
        alert(data.error || 'Error al aprobar');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const rejectQuote = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/quotes/public/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          comment: rejectComment
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess('rejected');
        setShowRejectModal(false);
      } else {
        alert(data.error || 'Error al rechazar');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const toggleOptional = (optId: string) => {
    setSelectedOptionals(prev => 
      prev.includes(optId) 
        ? prev.filter(id => id !== optId)
        : [...prev, optId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: quote?.currency || 'MXN'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const daysRemaining = () => {
    if (!quote) return 0;
    const expires = new Date(quote.expiresAt);
    const now = new Date();
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Propuesta no disponible</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          {success === 'approved' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">¡Propuesta Aceptada!</h1>
              <p className="text-slate-400 mb-6">
                Tu firma ha sido registrada. {provider?.name} se pondrá en contacto contigo pronto.
              </p>
              {quote?.requiresDeposit && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
                  <p className="text-amber-300">
                    💳 Anticipo requerido: {formatCurrency(calculateTotal() * (quote.depositPercent / 100))}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-slate-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Propuesta Rechazada</h1>
              <p className="text-slate-400">
                Hemos notificado a {provider?.name}. Gracias por tu respuesta.
              </p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // Already processed
  if (quote?.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Propuesta Aprobada</h1>
          <p className="text-slate-400">Esta propuesta fue aprobada el {formatDate(quote.signedAt || quote.createdAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {provider?.avatar ? (
              <img 
                src={provider.avatar} 
                alt={provider.name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                {provider?.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{provider?.name}</h1>
              <p className="text-slate-400 text-sm">Te envió una propuesta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Hola, {quote?.client.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-400">Aquí está tu propuesta personalizada</p>
        </motion.div>

        {/* Urgency Banner */}
        {daysRemaining() <= 3 && daysRemaining() > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3"
          >
            <Clock className="w-5 h-5 text-amber-400" />
            <p className="text-amber-300">
              ⏰ Esta propuesta vence en <strong>{daysRemaining()} días</strong>
            </p>
          </motion.div>
        )}

        {/* Quote Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden mb-6"
        >
          {/* Items */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Detalle de Servicios
            </h3>
            
            <div className="space-y-3">
              {quote?.items.map(item => (
                <div key={item.id} className="flex items-start justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div>
                    <h4 className="font-semibold text-white">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Upsells */}
          {quote?.optionalItems && quote.optionalItems.length > 0 && (
            <div className="p-6 bg-purple-500/5 border-t border-purple-500/20">
              <h4 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Adicionales Opcionales
              </h4>
              
              <div className="space-y-3">
                {quote.optionalItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleOptional(item.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${
                      selectedOptionals.includes(item.id)
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        selectedOptionals.includes(item.id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-500'
                      }`}>
                        {selectedOptionals.includes(item.id) && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-white">{item.name}</span>
                        {item.description && (
                          <p className="text-sm text-slate-400">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-purple-400">+{formatCurrency(item.total)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="p-6 bg-slate-900/50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(quote?.subtotal || 0)}</span>
              </div>
              
              {quote?.discount && quote.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Descuento</span>
                  <span>-{formatCurrency(
                    quote.discountType === 'percentage' 
                      ? (quote.subtotal * quote.discount / 100)
                      : quote.discount
                  )}</span>
                </div>
              )}
              
              {quote?.tax && quote.tax > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>IVA ({quote.tax}%)</span>
                  <span>+{formatCurrency(quote.total * quote.tax / 100)}</span>
                </div>
              )}
              
              {selectedOptionals.length > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>Opcionales seleccionados</span>
                  <span>+{formatCurrency(
                    selectedOptionals.reduce((sum, optId) => {
                      const opt = quote?.optionalItems.find(o => o.id === optId);
                      return sum + (opt?.total || 0);
                    }, 0)
                  )}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <span className="text-xl text-white">Total</span>
              <span className="text-3xl font-bold text-purple-400">{formatCurrency(calculateTotal())}</span>
            </div>
            
            {quote?.requiresDeposit && (
              <div className="mt-2 flex justify-between text-sm text-amber-400">
                <span>Anticipo requerido ({quote.depositPercent}%)</span>
                <span>{formatCurrency(calculateTotal() * quote.depositPercent / 100)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        {quote?.notes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 mb-6"
          >
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Notas y Condiciones
            </h4>
            <p className="text-slate-300 whitespace-pre-wrap">{quote.notes}</p>
          </motion.div>
        )}

        {/* Validity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-slate-500 text-sm mb-8"
        >
          📅 Válida hasta el {formatDate(quote?.expiresAt || '')}
        </motion.div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex-1 py-4 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Rechazar
          </button>
          <button
            onClick={() => {
              setShowSignModal(true);
              setTimeout(initCanvas, 100);
            }}
            className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Aceptar y Firmar
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full md:max-w-md bg-slate-800 rounded-t-2xl md:rounded-2xl border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">¿Rechazar propuesta?</h3>
                <p className="text-slate-400 mb-4">
                  Si tienes comentarios o quieres negociar, déjalos aquí:
                </p>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Comentarios opcionales..."
                  rows={3}
                  className="w-full p-4 rounded-xl bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-purple-500 transition resize-none"
                />
              </div>
              
              <div className="flex gap-3 p-6 border-t border-slate-700">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={rejectQuote}
                  disabled={processing}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Rechazo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign Modal */}
      <AnimatePresence>
        {showSignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
            onClick={() => setShowSignModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full md:max-w-lg bg-slate-800 rounded-t-2xl md:rounded-2xl border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <PenLine className="w-6 h-6 text-green-400" />
                  Firma Digital
                </h3>
                <p className="text-slate-400 mb-4">
                  Firma aquí para aceptar la propuesta por {formatCurrency(calculateTotal())}
                </p>
                
                {/* Signature Pad */}
                <div className="relative mb-4">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full rounded-xl border-2 border-dashed border-slate-600 bg-white cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400">Firma con el dedo o mouse aquí</p>
                    </div>
                  )}
                  
                  {hasSignature && (
                    <button
                      onClick={clearSignature}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Legal text */}
                <div className="p-3 rounded-lg bg-slate-900/50 mb-4">
                  <p className="text-xs text-slate-500 flex items-start gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Al firmar, aceptas los términos de esta propuesta y autorizas el inicio del servicio.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 p-6 border-t border-slate-700">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={approveQuote}
                  disabled={processing || !hasSignature}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
