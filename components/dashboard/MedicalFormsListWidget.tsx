'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, AlertTriangle, CheckCircle, User, Phone, ChevronDown, ChevronUp, Eye, X, QrCode, Copy, Check, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface MedicalFormSummary {
  id: number;
  userId: number;
  hasAlerts: boolean;
  createdAt: string;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    profileImage: string | null;
  };
  Vision?: {
    id: number;
    nombre: string;
  } | null;
}

interface MedicalFormDetail {
  id: number;
  userId: number;
  hasAlerts: boolean;
  createdAt: string;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
  };
  // Condiciones
  hasCurrentIllness: boolean;
  currentIllnessDetails: string | null;
  hasCurrentTreatment: boolean;
  currentTreatmentDetails: string | null;
  takesMedication: boolean;
  medicationDetails: string | null;
  hasAllergies: boolean;
  allergyDetails: string | null;
  hadSurgery: boolean;
  surgeryDetails: string | null;
  wasHospitalized: boolean;
  hospitalizationDetails: string | null;
  hasChronicIllness: boolean;
  chronicIllnessDetails: string | null;
  hasPhysicalInjury: boolean;
  physicalInjuryDetails: string | null;
  hasActivityRestrictions: boolean;
  activityRestrictionDetails: string | null;
  hasPsychologicalCondition: boolean;
  psychologicalConditionDetails: string | null;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

export default function MedicalFormsListWidget() {
  const [forms, setForms] = useState<MedicalFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'alerts' | 'normal'>('all');
  const [selectedForm, setSelectedForm] = useState<MedicalFormDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/medical-forms/list');
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
        // Guardar el organizationId
        if (data.organizationId) {
          setOrgId(data.organizationId);
        }
      }
    } catch (error) {
      console.error('Error fetching medical forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormDetail = async (formId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/medical-forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedForm(data.form);
      }
    } catch (error) {
      console.error('Error fetching form detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const generateQR = async () => {
    if (!orgId) {
      console.error('No se pudo obtener el ID de la organización');
      alert('Error: No se pudo obtener la organización. Por favor recarga la página.');
      return;
    }
    
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/formulario-medico?org=${orgId}`;
    setFormUrl(url);
    
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Error al generar el código QR');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = 'formulario-medico-qr.png';
    link.href = qrCodeUrl;
    link.click();
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.Usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.Usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'alerts') return matchesSearch && form.hasAlerts;
    if (filter === 'normal') return matchesSearch && !form.hasAlerts;
    return matchesSearch;
  });

  const alertCount = forms.filter(f => f.hasAlerts).length;

  const getConditions = (form: MedicalFormDetail) => {
    const conditions = [];
    if (form.hasCurrentIllness) conditions.push({ label: 'Enfermedad actual', details: form.currentIllnessDetails });
    if (form.hasCurrentTreatment) conditions.push({ label: 'Tratamiento médico', details: form.currentTreatmentDetails });
    if (form.takesMedication) conditions.push({ label: 'Medicamentos', details: form.medicationDetails });
    if (form.hasAllergies) conditions.push({ label: 'Alergias', details: form.allergyDetails });
    if (form.hadSurgery) conditions.push({ label: 'Cirugías previas', details: form.surgeryDetails });
    if (form.wasHospitalized) conditions.push({ label: 'Hospitalizaciones', details: form.hospitalizationDetails });
    if (form.hasChronicIllness) conditions.push({ label: 'Enfermedad crónica', details: form.chronicIllnessDetails });
    if (form.hasPhysicalInjury) conditions.push({ label: 'Lesión física', details: form.physicalInjuryDetails });
    if (form.hasActivityRestrictions) conditions.push({ label: 'Restricciones de actividad', details: form.activityRestrictionDetails });
    if (form.hasPsychologicalCondition) conditions.push({ label: 'Condición psicológica', details: form.psychologicalConditionDetails });
    return conditions;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FileText className="text-blue-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Formularios Médicos</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Formularios Médicos</h2>
              <p className="text-sm text-slate-400">
                {forms.length} participantes • {alertCount > 0 && (
                  <span className="text-red-400">{alertCount} con alertas</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón QR */}
            <button
              onClick={generateQR}
              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors group"
              title="Generar QR para registro rápido"
            >
              <QrCode className="text-purple-400 group-hover:text-purple-300" size={20} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="text-slate-400" size={20} />
              ) : (
                <ChevronDown className="text-slate-400" size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div 
            onClick={() => setFilter('all')}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
              filter === 'all' 
                ? 'bg-blue-500/20 border-2 border-blue-500/50' 
                : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-white">{forms.length}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div 
            onClick={() => setFilter('alerts')}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
              filter === 'alerts' 
                ? 'bg-red-500/20 border-2 border-red-500/50' 
                : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-red-400">{alertCount}</p>
            <p className="text-xs text-slate-400">Con alertas</p>
          </div>
          <div 
            onClick={() => setFilter('normal')}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
              filter === 'normal' 
                ? 'bg-green-500/20 border-2 border-green-500/50' 
                : 'bg-slate-700/50 border-2 border-transparent hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-green-400">{forms.length - alertCount}</p>
            <p className="text-xs text-slate-400">Sin alertas</p>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Forms List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredForms.length === 0 ? (
                <p className="text-center text-slate-400 py-4">No se encontraron formularios</p>
              ) : (
                filteredForms.map(form => (
                  <div 
                    key={form.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {form.Usuario.profileImage ? (
                        <img 
                          src={form.Usuario.profileImage} 
                          alt={form.Usuario.nombre}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="text-slate-400" size={20} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{form.Usuario.nombre}</p>
                          {form.hasAlerts ? (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                              <AlertTriangle size={10} />
                              Alerta
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                              <CheckCircle size={10} />
                              OK
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{form.Usuario.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchFormDetail(form.id)}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                      <Eye className="text-blue-400" size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Collapsed hint */}
        {!isExpanded && forms.length > 0 && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Click en la flecha para ver todos los formularios
          </p>
        )}
      </div>

      {/* Detail Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            {loadingDetail ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedForm.hasAlerts ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                      {selectedForm.hasAlerts ? (
                        <AlertTriangle className="text-red-400" size={24} />
                      ) : (
                        <CheckCircle className="text-green-400" size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedForm.Usuario.nombre}</h3>
                      <p className="text-sm text-slate-400">{selectedForm.Usuario.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedForm(null)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="text-slate-400" size={20} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Contacto de Emergencia */}
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Phone size={16} />
                      Contacto de Emergencia
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Nombre</p>
                        <p className="text-white">{selectedForm.emergencyContactName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Relación</p>
                        <p className="text-white">{selectedForm.emergencyContactRelation}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-400">Teléfono</p>
                        <a 
                          href={`tel:${selectedForm.emergencyContactPhone}`}
                          className="text-blue-400 hover:underline"
                        >
                          {selectedForm.emergencyContactPhone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Condiciones Médicas */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Condiciones Médicas Reportadas</h4>
                    {getConditions(selectedForm).length === 0 ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                        <CheckCircle className="text-green-400 mx-auto mb-2" size={32} />
                        <p className="text-green-400">Sin condiciones médicas reportadas</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getConditions(selectedForm).map((condition, idx) => (
                          <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <p className="text-red-400 font-semibold mb-1">{condition.label}</p>
                            <p className="text-white text-sm">{condition.details || 'Sin detalles adicionales'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Teléfono del participante */}
                  {selectedForm.Usuario.telefono && (
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Teléfono del participante</p>
                      <a 
                        href={`tel:${selectedForm.Usuario.telefono}`}
                        className="text-blue-400 hover:underline"
                      >
                        {selectedForm.Usuario.telefono}
                      </a>
                    </div>
                  )}

                  {/* Fecha de registro */}
                  <p className="text-xs text-slate-500 text-center">
                    Formulario registrado el {new Date(selectedForm.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700">
            {/* Modal Header */}
            <div className="border-b border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <QrCode className="text-purple-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Código QR</h3>
                  <p className="text-sm text-slate-400">Registro rápido de formulario médico</p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="text-slate-400" size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* QR Code */}
              <div className="bg-white rounded-xl p-4 flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                )}
              </div>

              {/* Instructions */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <p className="text-sm text-slate-300 text-center">
                  Los participantes pueden escanear este código para llenar su formulario médico sin necesidad de iniciar sesión.
                </p>
              </div>

              {/* URL and Copy */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadQR}
                className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors font-medium"
              >
                Descargar QR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
