'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Filter,
  User,
  Calendar,
  Phone,
  FileText,
  Eye,
  RefreshCw,
  Shield
} from 'lucide-react';

interface MedicalRecord {
  id: number;
  userId: number;
  hasCurrentIllness: boolean;
  currentIllnessDetail: string | null;
  isUnderTreatment: boolean;
  treatmentDetail: string | null;
  takesMedication: boolean;
  medicationDetail: string | null;
  hasAllergies: boolean;
  allergiesDetail: string | null;
  hadSurgery: boolean;
  surgeryDetail: string | null;
  wasHospitalized: boolean;
  hospitalizationDetail: string | null;
  hasChronicIllness: boolean;
  chronicIllnessDetail: string | null;
  hasPhysicalInjury: boolean;
  physicalInjuryDetail: string | null;
  hasActivityRestrictions: boolean;
  activityRestrictionsDetail: string | null;
  hasPsychologicalCondition: boolean;
  psychologicalConditionDetail: string | null;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  signatureData: string;
  signedAt: string;
  hasAlerts: boolean;
  alertsReviewed: boolean;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profileImage: string | null;
  };
  vision?: {
    id: number;
    name: string;
  };
}

export default function MedicalRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'alerts' | 'reviewed'>('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, searchTerm, filterType]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/coordinator/medical-alerts?includeAll=true');
      const result = await res.json();
      
      if (res.ok && result.success) {
        setRecords(result.records || []);
      } else {
        setError(result.error || 'Error al cargar registros médicos');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.user.firstName.toLowerCase().includes(term) ||
        r.user.lastName.toLowerCase().includes(term) ||
        r.user.email.toLowerCase().includes(term) ||
        (r.vision?.name || '').toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (filterType === 'alerts') {
      filtered = filtered.filter(r => r.hasAlerts && !r.alertsReviewed);
    } else if (filterType === 'reviewed') {
      filtered = filtered.filter(r => r.alertsReviewed);
    }

    setFilteredRecords(filtered);
  };

  const openRecordDetail = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const markAsReviewed = async (recordId: number) => {
    try {
      setMarkingAsReviewed(true);
      const res = await fetch('/api/coordinator/medical-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        // Actualizar el registro localmente
        setRecords(prev => prev.map(r => 
          r.id === recordId 
            ? { ...r, alertsReviewed: true, reviewedAt: new Date().toISOString() }
            : r
        ));
        
        if (selectedRecord?.id === recordId) {
          setSelectedRecord(prev => prev ? { ...prev, alertsReviewed: true, reviewedAt: new Date().toISOString() } : null);
        }
      } else {
        alert(result.error || 'Error al marcar como revisado');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión');
    } finally {
      setMarkingAsReviewed(false);
    }
  };

  const getAlertQuestions = (record: MedicalRecord): { question: string; detail: string | null }[] => {
    const alerts: { question: string; detail: string | null }[] = [];
    
    if (record.hasCurrentIllness) alerts.push({ question: '¿Padece alguna enfermedad actualmente?', detail: record.currentIllnessDetail });
    if (record.isUnderTreatment) alerts.push({ question: '¿Está bajo tratamiento médico?', detail: record.treatmentDetail });
    if (record.takesMedication) alerts.push({ question: '¿Toma medicamentos regularmente?', detail: record.medicationDetail });
    if (record.hasAllergies) alerts.push({ question: '¿Tiene alergias conocidas?', detail: record.allergiesDetail });
    if (record.hadSurgery) alerts.push({ question: '¿Ha tenido cirugías?', detail: record.surgeryDetail });
    if (record.wasHospitalized) alerts.push({ question: '¿Ha sido hospitalizado en el último año?', detail: record.hospitalizationDetail });
    if (record.hasChronicIllness) alerts.push({ question: '¿Padece enfermedades crónicas?', detail: record.chronicIllnessDetail });
    if (record.hasPhysicalInjury) alerts.push({ question: '¿Tiene lesiones físicas?', detail: record.physicalInjuryDetail });
    if (record.hasActivityRestrictions) alerts.push({ question: '¿Tiene restricciones de actividad física?', detail: record.activityRestrictionsDetail });
    if (record.hasPsychologicalCondition) alerts.push({ question: '¿Tiene condiciones psicológicas?', detail: record.psychologicalConditionDetail });
    
    return alerts;
  };

  const unreviewedCount = records.filter(r => r.hasAlerts && !r.alertsReviewed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/school-admin"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Heart className="text-red-400" size={28} />
                🏥 Registros Médicos
              </h1>
              <p className="text-slate-400 text-sm">
                Gestión de formularios médicos de participantes
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchRecords}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw size={20} className="text-slate-300" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-blue-400" size={24} />
              <span className="text-blue-300 font-medium">Total Registros</span>
            </div>
            <p className="text-3xl font-bold text-white">{records.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/50 to-slate-900 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-red-400" size={24} />
              <span className="text-red-300 font-medium">Alertas Pendientes</span>
            </div>
            <p className="text-3xl font-bold text-white">{unreviewedCount}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border border-green-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-green-400" size={24} />
              <span className="text-green-300 font-medium">Revisados</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {records.filter(r => r.alertsReviewed).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, email o visión..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filterType === 'all' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('alerts')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'alerts' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle size={16} />
                Con Alertas
                {unreviewedCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {unreviewedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterType('reviewed')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                  filterType === 'reviewed' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle size={16} />
                Revisados
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Cargando registros médicos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-6 text-center">
            <AlertTriangle className="text-red-400 mx-auto mb-2" size={32} />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Records List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-700/50">
                <Heart className="text-slate-600 mx-auto mb-4" size={48} />
                <p className="text-slate-400">
                  {searchTerm || filterType !== 'all' 
                    ? 'No se encontraron registros con estos filtros' 
                    : 'No hay registros médicos aún'}
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`bg-slate-900/50 border rounded-2xl p-6 transition-all hover:shadow-lg ${
                    record.hasAlerts && !record.alertsReviewed
                      ? 'border-red-500/50 hover:border-red-500'
                      : record.alertsReviewed
                      ? 'border-green-500/30 hover:border-green-500/50'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {record.user.profileImage ? (
                          <img
                            src={record.user.profileImage}
                            alt={record.user.firstName}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {record.user.firstName[0]}{record.user.lastName[0]}
                            </span>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        {record.hasAlerts && !record.alertsReviewed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        )}
                        {record.alertsReviewed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {record.user.firstName} {record.user.lastName}
                        </h3>
                        <p className="text-slate-400 text-sm">{record.user.email}</p>
                        {record.vision && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                            {record.vision.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions & Status */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {record.hasAlerts && !record.alertsReviewed && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Requiere Atención
                          </span>
                        )}
                        {record.alertsReviewed && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full flex items-center gap-1">
                            <Shield size={12} />
                            Revisado
                          </span>
                        )}
                        {!record.hasAlerts && (
                          <span className="px-3 py-1 bg-slate-500/20 text-slate-300 text-xs rounded-full">
                            Sin Alertas
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => openRecordDetail(record)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye size={16} />
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Info */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={14} />
                      <span>Registrado: {new Date(record.createdAt).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={14} />
                      <span>Emergencia: {record.emergencyContactName} ({record.emergencyContactPhone})</span>
                    </div>
                    {record.hasAlerts && (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle size={14} />
                        <span>{getAlertQuestions(record).length} condición(es) médica(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedRecord.user.profileImage ? (
                  <img
                    src={selectedRecord.user.profileImage}
                    alt={selectedRecord.user.firstName}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">
                      {selectedRecord.user.firstName[0]}{selectedRecord.user.lastName[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedRecord.user.firstName} {selectedRecord.user.lastName}
                  </h2>
                  <p className="text-slate-400 text-sm">{selectedRecord.user.email}</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Alertas Section */}
              {selectedRecord.hasAlerts && (
                <div className={`rounded-2xl p-6 ${
                  selectedRecord.alertsReviewed 
                    ? 'bg-green-900/20 border border-green-500/30' 
                    : 'bg-red-900/20 border border-red-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${
                      selectedRecord.alertsReviewed ? 'text-green-300' : 'text-red-300'
                    }`}>
                      <AlertTriangle size={20} />
                      ⚠️ Condiciones Médicas Reportadas
                    </h3>
                    
                    {!selectedRecord.alertsReviewed && (
                      <button
                        onClick={() => markAsReviewed(selectedRecord.id)}
                        disabled={markingAsReviewed}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {markingAsReviewed ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Marcar como Revisado
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {getAlertQuestions(selectedRecord).map((alert, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-xl p-4">
                        <p className="text-white font-medium text-sm">{alert.question}</p>
                        {alert.detail && (
                          <p className="text-slate-300 mt-1 text-sm bg-slate-800/50 rounded-lg p-3">
                            {alert.detail}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {selectedRecord.alertsReviewed && selectedRecord.reviewedAt && (
                    <p className="text-green-400 text-sm mt-4 flex items-center gap-2">
                      <CheckCircle size={14} />
                      Revisado el {new Date(selectedRecord.reviewedAt).toLocaleString('es-MX')}
                    </p>
                  )}
                </div>
              )}
              
              {/* Contacto de Emergencia */}
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Phone size={20} className="text-cyan-400" />
                  📞 Contacto de Emergencia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs uppercase">Nombre</p>
                    <p className="text-white font-medium">{selectedRecord.emergencyContactName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase">Parentesco</p>
                    <p className="text-white font-medium">{selectedRecord.emergencyContactRelationship}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase">Teléfono</p>
                    <p className="text-white font-medium">{selectedRecord.emergencyContactPhone}</p>
                  </div>
                </div>
              </div>
              
              {/* Firma */}
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-400" />
                  ✍️ Firma del Participante
                </h3>
                <div className="bg-white rounded-xl p-2 inline-block">
                  <img 
                    src={selectedRecord.signatureData} 
                    alt="Firma"
                    className="max-w-[300px] h-auto"
                  />
                </div>
                <p className="text-slate-400 text-sm mt-2">
                  Firmado el {new Date(selectedRecord.signedAt).toLocaleString('es-MX')}
                </p>
              </div>
              
              {/* Todas las respuestas */}
              <div className="bg-slate-800/50 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">📋 Formulario Completo</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { q: 'Enfermedad actual', v: selectedRecord.hasCurrentIllness, d: selectedRecord.currentIllnessDetail },
                    { q: 'Bajo tratamiento', v: selectedRecord.isUnderTreatment, d: selectedRecord.treatmentDetail },
                    { q: 'Toma medicamentos', v: selectedRecord.takesMedication, d: selectedRecord.medicationDetail },
                    { q: 'Alergias', v: selectedRecord.hasAllergies, d: selectedRecord.allergiesDetail },
                    { q: 'Cirugías', v: selectedRecord.hadSurgery, d: selectedRecord.surgeryDetail },
                    { q: 'Hospitalizado (último año)', v: selectedRecord.wasHospitalized, d: selectedRecord.hospitalizationDetail },
                    { q: 'Enfermedades crónicas', v: selectedRecord.hasChronicIllness, d: selectedRecord.chronicIllnessDetail },
                    { q: 'Lesiones físicas', v: selectedRecord.hasPhysicalInjury, d: selectedRecord.physicalInjuryDetail },
                    { q: 'Restricciones de actividad', v: selectedRecord.hasActivityRestrictions, d: selectedRecord.activityRestrictionsDetail },
                    { q: 'Condiciones psicológicas', v: selectedRecord.hasPsychologicalCondition, d: selectedRecord.psychologicalConditionDetail },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 py-2 border-b border-slate-700/50">
                      <span className={`font-medium ${item.v ? 'text-red-400' : 'text-green-400'}`}>
                        {item.v ? '⚠️ Sí' : '✓ No'}
                      </span>
                      <span className="text-slate-300">{item.q}</span>
                      {item.v && item.d && (
                        <span className="text-slate-400 italic">— {item.d}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
