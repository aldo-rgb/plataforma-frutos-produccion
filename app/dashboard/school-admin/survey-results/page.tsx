'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  BarChart3, 
  Star, 
  ThermometerSun, 
  Coffee, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Calendar,
  Building,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users
} from 'lucide-react';

interface TrainingResult {
  productId: number;
  productName: string;
  levelType: string;
  visionName: string;
  dates: {
    start: string | null;
    end: string | null;
  };
  enrollment: number;
  trainer: {
    survey: any;
    ratings: {
      salonAmbiente: number;
      instalaciones: number;
      staff: number;
      average: string;
    };
  } | null;
  gameChangers: {
    id: number;
    gcName: string;
    gcImage: string | null;
    aireAcondicionado: string;
    limpiezaBanos: number;
    coffeBreak: string;
    entrenadorEstrellas: number;
    entrenadorInspiro: boolean;
    coordinadorRespaldo: number;
  }[];
  directorAudit: any | null;
  status: {
    hasTrainerSurvey: boolean;
    gcSurveysCount: number;
    hasDirectorAudit: boolean;
    isComplete: boolean;
  };
}

interface SurveyData {
  trainings: TrainingResult[];
  aggregated: {
    avgTrainerRating?: string | null;
    avgGCRating?: string | null;
    completionRate?: string;
    trainerMetrics?: any;
    gcMetrics?: any;
  };
  totalTrainings: number;
}

export default function SurveyResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTraining, setExpandedTraining] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    fetchSurveyResults();
  }, []);

  const fetchSurveyResults = async () => {
    try {
      const res = await fetch('/api/school-admin/survey-results');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || 'Error al cargar los resultados');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      BASICO1: 'Básico 1',
      BASICO2: 'Básico 2',
      BASICO3: 'Básico 3',
      BASICO4: 'Básico 4',
      BASICO5: 'Básico 5',
      BASICO6: 'Básico 6',
      BASIC: 'Básico',
      ADVANCED: 'Avanzado',
      PL: 'PL',
    };
    return labels[level] || level;
  };

  const getTemperatureLabel = (temp: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      CONGELADO: { text: '🥶 Congelado', color: 'text-blue-400' },
      PERFECTO: { text: '✓ Perfecto', color: 'text-green-400' },
      CALOR: { text: '🔥 Calor', color: 'text-red-400' },
    };
    return labels[temp] || { text: temp, color: 'text-slate-400' };
  };

  const getCoffeeLabel = (coffee: string) => {
    if (coffee === 'A_TIEMPO') return { text: '✓ A tiempo', color: 'text-green-400' };
    return { text: '⚠ Tarde/Faltante', color: 'text-orange-400' };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Sin fecha';
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Sin fecha';
    }
  };

  const renderStars = (rating: number, max: number = 5) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
          />
        ))}
      </div>
    );
  };

  const renderPercentageBar = (value: number, label: string) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400 w-32">{label}:</span>
      <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-[200px]">
        <div
          className={`h-2 rounded-full ${value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-medium text-white w-12">{value}%</span>
    </div>
  );

  const filteredTrainings = data?.trainings.filter(t => 
    filterLevel === 'all' || t.levelType === filterLevel
  ) || [];

  const uniqueLevels = [...new Set(data?.trainings.map(t => t.levelType) || [])];

  // Calcular métricas para mostrar
  const avgTrainerRating = data?.aggregated?.trainerMetrics?.overallAvg || null;
  const avgGCRating = data?.aggregated?.gcMetrics?.avgEntrenadorEstrellas || null;
  const completionRate = data?.trainings && data.trainings.length > 0 ? 
    ((data.trainings.filter(t => t.status.isComplete).length / data.trainings.length) * 100).toFixed(0) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando resultados de encuestas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-purple-400 hover:underline"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Resultados de Encuestas</h1>
              <p className="text-slate-400">Retroalimentación de entrenamientos completados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-3xl font-bold text-purple-400">{data?.totalTrainings || 0}</div>
            <div className="text-slate-400 text-sm">Entrenamientos Completados</div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-yellow-400">
                {avgTrainerRating || 'N/A'}
              </span>
              {avgTrainerRating && (
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <div className="text-slate-400 text-sm">Promedio Entrenadores</div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-400">
                {avgGCRating || 'N/A'}
              </span>
              {avgGCRating && (
                <Star className="w-6 h-6 text-green-400 fill-green-400" />
              )}
            </div>
            <div className="text-slate-400 text-sm">Promedio GameChangers</div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-3xl font-bold text-indigo-400">
              {completionRate}%
            </div>
            <div className="text-slate-400 text-sm">Encuestas Completas</div>
          </div>
        </div>

        {/* Filter */}
        {uniqueLevels.length > 1 && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-slate-300 font-medium">Filtrar por nivel:</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los niveles</option>
                {uniqueLevels.map(level => (
                  <option key={level} value={level}>{getLevelLabel(level)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Trainings List */}
        {filteredTrainings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No hay entrenamientos completados con encuestas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrainings.map((training) => (
              <div key={training.productId} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                {/* Training Header */}
                <button
                  onClick={() => setExpandedTraining(expandedTraining === training.productId ? null : training.productId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Building className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{training.productName}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(training.dates.end)}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                          {getLevelLabel(training.levelType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {training.enrollment} participantes
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="text-slate-400">
                        {training.status.hasTrainerSurvey ? '✓' : '○'} Encuesta entrenador
                      </div>
                      <div className="text-slate-400">
                        {training.status.gcSurveysCount} encuesta{training.status.gcSurveysCount !== 1 ? 's' : ''} GC
                      </div>
                      {training.status.hasDirectorAudit && (
                        <div className="text-green-400 font-medium">✓ Auditoría completada</div>
                      )}
                    </div>
                    {expandedTraining === training.productId ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedTraining === training.productId && (
                  <div className="border-t border-slate-700 p-4 space-y-6">
                    {/* Trainer Survey */}
                    {training.trainer && (
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-400" />
                          Encuesta del Entrenador
                        </h4>
                        <div className="bg-slate-800 rounded-lg p-4">
                          <div className="font-medium text-slate-300 mb-3">
                            Promedio General: <span className="text-yellow-400">{training.trainer.ratings.average} ⭐</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">Salón/Ambiente:</span>
                              <div className="mt-1">{renderStars(training.trainer.ratings.salonAmbiente)}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Instalaciones:</span>
                              <div className="mt-1">{renderStars(training.trainer.ratings.instalaciones)}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Staff:</span>
                              <div className="mt-1">{renderStars(training.trainer.ratings.staff)}</div>
                            </div>
                          </div>
                          {training.trainer.survey?.observaciones && (
                            <div className="mt-3 text-sm">
                              <span className="text-slate-400">Observaciones:</span>
                              <p className="text-slate-300 mt-1 italic bg-slate-700/50 p-2 rounded">
                                "{training.trainer.survey.observaciones}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* GameChanger Surveys */}
                    {training.gameChangers.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-green-400" />
                          Encuestas de GameChangers ({training.gameChangers.length})
                        </h4>
                        <div className="space-y-3">
                          {training.gameChangers.map((gc) => (
                            <div key={gc.id} className="bg-slate-800 rounded-lg p-4">
                              <div className="font-medium text-slate-300 mb-3">
                                {gc.gcName}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <ThermometerSun className="w-4 h-4" /> Aire:
                                  </span>
                                  <span className={`font-medium ${getTemperatureLabel(gc.aireAcondicionado).color}`}>
                                    {getTemperatureLabel(gc.aireAcondicionado).text}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <Coffee className="w-4 h-4" /> Coffee Break:
                                  </span>
                                  <span className={`font-medium ${getCoffeeLabel(gc.coffeBreak).color}`}>
                                    {getCoffeeLabel(gc.coffeBreak).text}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Entrenador:</span>
                                  <div className="mt-1 flex items-center gap-2">
                                    {renderStars(gc.entrenadorEstrellas)}
                                    {gc.entrenadorInspiro && (
                                      <span className="text-green-400 text-xs">✨ Inspiró</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-400">Coordinador:</span>
                                  <div className="mt-1">
                                    <span className="text-white font-medium">{gc.coordinadorRespaldo}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3">
                                {renderPercentageBar(gc.limpiezaBanos, 'Limpieza Baños')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Director Audit */}
                    {training.directorAudit && (
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-400" />
                          Auditoría de Director
                        </h4>
                        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                          <div className="font-medium text-purple-300 mb-4">
                            {training.directorAudit.directorName}
                          </div>
                          
                          {/* Momentos de Verdad */}
                          <div className="mb-4">
                            <h5 className="font-medium text-slate-300 mb-2">Momentos de Verdad</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {[
                                { key: 'auditRegistro', label: 'Registro' },
                                { key: 'auditConcentracion', label: 'Concentración' },
                                { key: 'auditBreakLargo', label: 'Break Largo' },
                                { key: 'auditEnrolamiento', label: 'Enrolamiento' },
                                { key: 'auditSalaActiva', label: 'Sala Activa' },
                                { key: 'auditBreakCorto', label: 'Break Corto' },
                              ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2 text-sm">
                                  {training.directorAudit[key] ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                  <span className="text-slate-300">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Excelencia del Salón */}
                          {(training.directorAudit.limpiezaGeneral !== null || 
                            training.directorAudit.equipoSonido !== null) && (
                            <div className="mb-4">
                              <h5 className="font-medium text-slate-300 mb-2">Excelencia del Salón</h5>
                              <div className="space-y-2">
                                {training.directorAudit.limpiezaGeneral !== null && 
                                  renderPercentageBar(training.directorAudit.limpiezaGeneral, 'Limpieza General')}
                                {training.directorAudit.equipoSonido !== null && 
                                  renderPercentageBar(training.directorAudit.equipoSonido, 'Equipo de Sonido')}
                                {training.directorAudit.visualesPantalla !== null && 
                                  renderPercentageBar(training.directorAudit.visualesPantalla, 'Visuales/Pantalla')}
                                {training.directorAudit.mesaControl !== null && 
                                  renderPercentageBar(training.directorAudit.mesaControl, 'Mesa de Control')}
                              </div>
                            </div>
                          )}

                          {/* Instalaciones */}
                          {(training.directorAudit.climaAire !== null || 
                            training.directorAudit.banosLimpieza !== null) && (
                            <div className="mb-4">
                              <h5 className="font-medium text-slate-300 mb-2">Instalaciones</h5>
                              <div className="space-y-2">
                                {training.directorAudit.climaAire !== null && 
                                  renderPercentageBar(training.directorAudit.climaAire, 'Clima/Aire')}
                                {training.directorAudit.banosLimpieza !== null && 
                                  renderPercentageBar(training.directorAudit.banosLimpieza, 'Baños')}
                                {training.directorAudit.sillasEstado !== null && 
                                  renderPercentageBar(training.directorAudit.sillasEstado, 'Sillas')}
                              </div>
                            </div>
                          )}

                          {/* Imagen Profesional */}
                          {(training.directorAudit.imagenStaff !== null || 
                            training.directorAudit.imagenCoordinador !== null) && (
                            <div className="mb-4">
                              <h5 className="font-medium text-slate-300 mb-2">Imagen Profesional</h5>
                              <div className="space-y-2">
                                {training.directorAudit.imagenStaff !== null && 
                                  renderPercentageBar(training.directorAudit.imagenStaff, 'Imagen Staff')}
                                {training.directorAudit.imagenCoordinador !== null && 
                                  renderPercentageBar(training.directorAudit.imagenCoordinador, 'Imagen Coordinador')}
                                {training.directorAudit.liderazgoCapitanias !== null && 
                                  renderPercentageBar(training.directorAudit.liderazgoCapitanias, 'Liderazgo Capitanías')}
                              </div>
                            </div>
                          )}

                          {training.directorAudit.observaciones && (
                            <div className="mt-3 text-sm">
                              <span className="text-slate-400">Observaciones:</span>
                              <p className="text-slate-300 mt-1 italic bg-slate-800/50 p-2 rounded">
                                "{training.directorAudit.observaciones}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No surveys message */}
                    {!training.trainer && 
                     training.gameChangers.length === 0 && 
                     !training.directorAudit && (
                      <div className="text-center py-6 text-slate-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No hay encuestas registradas para este entrenamiento</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
