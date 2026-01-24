'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Upload,
  DollarSign,
  Building,
  AlertCircle,
  Check,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

export default function NewExpensePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    concept: '',
    description: '',
    amount: '',
    providerName: '',
    providerRFC: '',
    providerBank: '',
    providerClabe: ''
  });

  const [quotationUrl, setQuotationUrl] = useState<string>('');
  const [invoiceUrl, setInvoiceUrl] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'quotation' | 'invoice' | 'evidence' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'quotation' | 'invoice' | 'evidence') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadType(type);

    try {
      // Subir a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'frutos_uploads');
      formData.append('folder', `legacy-builder/expenses/${campaignId}`);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await res.json();

      if (data.secure_url) {
        switch (type) {
          case 'quotation':
            setQuotationUrl(data.secure_url);
            break;
          case 'invoice':
            setInvoiceUrl(data.secure_url);
            break;
          case 'evidence':
            setEvidenceUrls(prev => [...prev, data.secure_url]);
            break;
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error subiendo archivo');
    } finally {
      setUploading(false);
      setUploadType(null);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.concept.trim()) {
      setError('El concepto es requerido');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!invoiceUrl && !quotationUrl) {
      setError('Debes adjuntar al menos una cotización o factura');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/legacy-builder/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: parseInt(campaignId),
          concept: formData.concept.trim(),
          description: formData.description.trim() || null,
          amount: parseFloat(formData.amount),
          providerName: formData.providerName.trim() || null,
          providerRFC: formData.providerRFC.trim() || null,
          providerBank: formData.providerBank.trim() || null,
          providerClabe: formData.providerClabe.trim() || null,
          quotationUrl: quotationUrl || null,
          invoiceUrl: invoiceUrl || null,
          evidenceUrls: evidenceUrls
        })
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/dashboard/legacy-builder/${campaignId}?tab=expenses`);
      } else {
        setError(data.error || 'Error creando solicitud');
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      setError('Error enviando solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/dashboard/legacy-builder/${campaignId}`}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Nueva Solicitud de Gasto</h1>
            <p className="text-slate-400 text-sm">Completa el formulario para solicitar fondos</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del gasto */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Información del Gasto
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Concepto *
                </label>
                <input
                  type="text"
                  name="concept"
                  value={formData.concept}
                  onChange={handleInputChange}
                  placeholder="Ej: 50 bultos de cemento"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Detalla para qué se usará este recurso..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monto (MXN) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Proveedor */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" />
              Datos del Proveedor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del Proveedor
                </label>
                <input
                  type="text"
                  name="providerName"
                  value={formData.providerName}
                  onChange={handleInputChange}
                  placeholder="Ej: Materiales El Constructor"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  RFC (opcional)
                </label>
                <input
                  type="text"
                  name="providerRFC"
                  value={formData.providerRFC}
                  onChange={handleInputChange}
                  placeholder="ABC123456ABC"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Banco (para transferencia)
                </label>
                <input
                  type="text"
                  name="providerBank"
                  value={formData.providerBank}
                  onChange={handleInputChange}
                  placeholder="Ej: BBVA, Banamex"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  CLABE Interbancaria
                </label>
                <input
                  type="text"
                  name="providerClabe"
                  value={formData.providerClabe}
                  onChange={handleInputChange}
                  placeholder="18 dígitos"
                  maxLength={18}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Comprobantes */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Comprobantes
            </h3>

            <div className="space-y-4">
              {/* Cotización */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cotización (PDF/Imagen)
                </label>
                {quotationUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 text-sm flex-1 truncate">Cotización subida</span>
                    <button
                      type="button"
                      onClick={() => setQuotationUrl('')}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'quotation')}
                      className="hidden"
                    />
                    {uploading && uploadType === 'quotation' ? (
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-slate-400 text-sm">Click para subir cotización</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Factura */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Factura (PDF/Imagen) *
                </label>
                {invoiceUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 text-sm flex-1 truncate">Factura subida</span>
                    <button
                      type="button"
                      onClick={() => setInvoiceUrl('')}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'invoice')}
                      className="hidden"
                    />
                    {uploading && uploadType === 'invoice' ? (
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-slate-400 text-sm">Click para subir factura</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Evidencia adicional */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fotos de Evidencia (opcional)
                </label>
                
                {evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {evidenceUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Evidencia ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeEvidence(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, 'evidence')}
                    className="hidden"
                  />
                  {uploading && uploadType === 'evidence' ? (
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-500 mb-1" />
                      <span className="text-slate-400 text-xs">Agregar foto</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <Link
              href={`/dashboard/legacy-builder/${campaignId}`}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Enviar a Auditoría
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
