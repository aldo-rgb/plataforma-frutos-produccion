'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, HeartPulse, Phone, User, X, ChevronDown, ChevronUp, Check, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MedicalCondition {
  label: string;
  hasCondition: boolean;
  details: string | null;
}

interface ProductInfo {
  id: number;
  name: string;
  levelType: string;
  startDate: string | null;
  endDate: string | null;
}

interface MedicalAlert {
  id: number;
  userId: number;
  Usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    profileImage: string | null;
  };
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  createdAt: string;
  productInfo?: ProductInfo | null;
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
}

export default function MedicalAlertsWidget() {
  const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/medical-alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.pendingAlerts || []);
      }
    } catch (error) {
      console.error('Error fetching medical alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alert: MedicalAlert) => {
    const medicalFormId = alert.id;
    const productId = alert.productInfo?.id || null;
    
    setAcknowledging(medicalFormId);
    try {
      const response = await fetch('/api/medical-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalFormId, productId })
      });

      if (response.ok) {
        toast.success('✅ Marcado como enterado');
        setAlerts(prev => prev.filter(a => a.id !== medicalFormId));
        setExpandedId(null);
      } else {
        toast.error('Error al procesar');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setAcknowledging(null);
    }
  };

  const getConditions = (alert: MedicalAlert): MedicalCondition[] => {
    return [
      { label: 'Enfermedad actual', hasCondition: alert.hasCurrentIllness, details: alert.currentIllnessDetails },
      { label: 'Tratamiento médico', hasCondition: alert.hasCurrentTreatment, details: alert.currentTreatmentDetails },
      { label: 'Medicamentos', hasCondition: alert.takesMedication, details: alert.medicationDetails },
      { label: 'Alergias', hasCondition: alert.hasAllergies, details: alert.allergyDetails },
      { label: 'Cirugías previas', hasCondition: alert.hadSurgery, details: alert.surgeryDetails },
      { label: 'Hospitalización reciente', hasCondition: alert.wasHospitalized, details: alert.hospitalizationDetails },
      { label: 'Enfermedad crónica', hasCondition: alert.hasChronicIllness, details: alert.chronicIllnessDetails },
      { label: 'Lesión física', hasCondition: alert.hasPhysicalInjury, details: alert.physicalInjuryDetails },
      { label: 'Restricciones de actividad', hasCondition: alert.hasActivityRestrictions, details: alert.activityRestrictionDetails },
      { label: 'Condición psicológica', hasCondition: alert.hasPsychologicalCondition, details: alert.psychologicalConditionDetails },
    ].filter(c => c.hasCondition);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-xl"></div>
          <div className="h-4 bg-slate-700 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // No mostrar widget si no hay alertas
  }

  return (
    <div className="bg-gradient-to-br from-red-900/30 to-orange-900/20 border border-red-500/50 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-xl animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Alertas Médicas</h3>
            <p className="text-xs text-red-300/80">
              {alerts.length} participante{alerts.length > 1 ? 's' : ''} con condiciones especiales
            </p>
          </div>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="space-y-3 relative z-10">
        {alerts.map(alert => {
          const isExpanded = expandedId === alert.id;
          const conditions = getConditions(alert);
          
          return (
            <div 
              key={alert.id}
              className="bg-slate-900/60 border border-red-500/30 rounded-xl overflow-hidden"
            >
              {/* Header del participante */}
              <div 
                className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alert.Usuario.profileImage ? (
                      <img 
                        src={alert.Usuario.profileImage} 
                        alt={alert.Usuario.nombre}
                        className="w-10 h-10 rounded-full object-cover border-2 border-red-500/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">{alert.Usuario.nombre}</p>
                      <p className="text-xs text-gray-400">{alert.Usuario.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs font-medium rounded-full">
                      {conditions.length} condición{conditions.length > 1 ? 'es' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Detalles expandidos */}
              {isExpanded && (
                <div className="border-t border-red-500/20 p-4 space-y-4">
                  {/* Condiciones médicas */}
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4" />
                      Condiciones Médicas
                    </h4>
                    <div className="space-y-2">
                      {conditions.map((condition, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">{condition.label}</p>
                          {condition.details && (
                            <p className="text-sm text-gray-300 mt-1">{condition.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contacto de emergencia */}
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contacto de Emergencia
                    </h4>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-sm text-white font-medium">{alert.emergencyContactName}</p>
                      <p className="text-xs text-gray-400">{alert.emergencyContactRelation}</p>
                      <a 
                        href={`tel:${alert.emergencyContactPhone}`}
                        className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block"
                      >
                        📞 {alert.emergencyContactPhone}
                      </a>
                    </div>
                  </div>

                  {/* Contacto del participante */}
                  {alert.Usuario.telefono && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Teléfono del participante</p>
                      <a 
                        href={`tel:${alert.Usuario.telefono}`}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        📞 {alert.Usuario.telefono}
                      </a>
                    </div>
                  )}

                  {/* Info del producto */}
                  {alert.productInfo && (
                    <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <div className="text-sm">
                        <span className="text-blue-400 font-medium">{alert.productInfo.name}</span>
                        <span className="text-slate-400 ml-2">
                          ({alert.productInfo.levelType === 'BASIC' ? 'Básico' : 
                            alert.productInfo.levelType === 'INTERMEDIATE' ? 'Intermedio' :
                            alert.productInfo.levelType === 'ADVANCED' ? 'Avanzado' : 
                            alert.productInfo.levelType})
                        </span>
                        {alert.productInfo.startDate && (
                          <span className="text-slate-500 ml-2">
                            Inicia: {new Date(alert.productInfo.startDate).toLocaleDateString('es-MX')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botón de enterado */}
                  <button
                    onClick={() => handleAcknowledge(alert)}
                    disabled={acknowledging === alert.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                  >
                    {acknowledging === alert.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Marcar como Enterado
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
