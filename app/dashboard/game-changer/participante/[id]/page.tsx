'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Award,
  TrendingUp,
  Loader2,
  MessageSquare,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Evidencia {
  id: number;
  description: string | null;
  evidenceUrl: string | null;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewComment: string | null;
  areaName: string;
  taskTitle: string;
  weekNumber: number;
}

interface Participante {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
  tier: string;
  nivelActual: number;
  rangoActual: string;
  experienciaXP: number;
  completionStreak: number;
}

export default function ParticipanteEvidenciasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const participanteId = parseInt(params.id as string);

  const [participante, setParticipante] = useState<Participante | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEvidencia, setSelectedEvidencia] = useState<Evidencia | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && !isNaN(participanteId)) {
      fetchParticipanteData();
    }
  }, [session, participanteId]);

  const fetchParticipanteData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/game-changer/participante/${participanteId}/evidencias`);
      const data = await res.json();

      if (res.ok) {
        setParticipante(data.participante);
        setEvidencias(data.evidencias || []);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvidencias = filterStatus === 'all'
    ? evidencias
    : evidencias.filter((e) => e.status === filterStatus);

  const evidenciasPendientes = evidencias.filter((e) => e.status === 'PENDING').length;
  const evidenciasAprobadas = evidencias.filter((e) => e.status === 'APPROVED').length;
  const evidenciasRechazadas = evidencias.filter((e) => e.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!participante) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl">Participante no encontrado o no tienes acceso</p>
          <Link
            href="/dashboard/game-changer"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/game-changer"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="text-slate-400" size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Evidencias de {participante.nombre}
              </h1>
              <p className="text-cyan-400">{participante.email}</p>
            </div>
          </div>
        </div>

        {/* Participante Info Card */}
        <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            {participante.profileImage ? (
              <img
                src={participante.profileImage}
                alt={participante.nombre}
                className="w-20 h-20 rounded-full object-cover border-4 border-cyan-500"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-cyan-500">
                {participante.nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Tier</p>
                <p className="text-white font-bold">{participante.tier}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Nivel</p>
                <p className="text-white font-bold flex items-center gap-1">
                  <Award className="text-amber-400" size={16} />
                  {participante.nivelActual}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Rango</p>
                <p className="text-purple-400 font-bold">{participante.rangoActual}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Racha</p>
                <p className="text-white font-bold flex items-center gap-1">
                  <TrendingUp className="text-green-400" size={16} />
                  {participante.completionStreak} días
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-amber-400" size={24} />
              <span className="text-3xl font-bold text-amber-400">
                {evidenciasPendientes}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Evidencias Pendientes</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-green-400" size={24} />
              <span className="text-3xl font-bold text-green-400">
                {evidenciasAprobadas}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Evidencias Aprobadas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="text-red-400" size={24} />
              <span className="text-3xl font-bold text-red-400">
                {evidenciasRechazadas}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Evidencias Rechazadas</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-slate-300">Filtrar por estado:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todas ({evidencias.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Pendientes ({evidenciasPendientes})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'APPROVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Aprobadas ({evidenciasAprobadas})
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'REJECTED'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Rechazadas ({evidenciasRechazadas})
            </button>
          </div>
        </div>

        {/* Evidencias List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Evidencias Enviadas</h2>
            <p className="text-slate-400 text-sm mt-1">
              {filteredEvidencias.length} evidencia(s)
            </p>
          </div>

          {filteredEvidencias.length === 0 ? (
            <div className="p-12 text-center">
              <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay evidencias para mostrar</p>
              <p className="text-slate-500 text-sm">
                {filterStatus === 'all'
                  ? 'Este participante aún no ha enviado evidencias'
                  : 'No hay evidencias con este estado'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredEvidencias.map((evidencia) => (
                <div
                  key={evidencia.id}
                  className="p-6 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Evidence Image/Icon */}
                    <div className="flex-shrink-0">
                      {evidencia.evidenceUrl ? (
                        <button
                          onClick={() => {
                            setSelectedEvidencia(evidencia);
                            setShowImageModal(true);
                          }}
                          className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-600 hover:border-cyan-500 transition-colors group"
                        >
                          <img
                            src={evidencia.evidenceUrl}
                            alt="Evidencia"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="text-white" size={24} />
                          </div>
                        </button>
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                          <ImageIcon className="text-slate-500" size={32} />
                        </div>
                      )}
                    </div>

                    {/* Evidence Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">
                            {evidencia.taskTitle}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={14} />
                              Semana {evidencia.weekNumber}
                            </span>
                            <span>•</span>
                            <span>{evidencia.areaName}</span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            evidencia.status === 'APPROVED'
                              ? 'bg-green-900/20 text-green-400 border border-green-600'
                              : evidencia.status === 'REJECTED'
                              ? 'bg-red-900/20 text-red-400 border border-red-600'
                              : 'bg-amber-900/20 text-amber-400 border border-amber-600'
                          }`}
                        >
                          {evidencia.status === 'APPROVED' ? (
                            <><CheckCircle size={14} /> Aprobada</>
                          ) : evidencia.status === 'REJECTED' ? (
                            <><XCircle size={14} /> Rechazada</>
                          ) : (
                            <><Clock size={14} /> Pendiente</>
                          )}
                        </span>
                      </div>

                      {evidencia.description && (
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                          {evidencia.description}
                        </p>
                      )}

                      {evidencia.reviewComment && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="text-cyan-400" size={16} />
                            <span className="text-sm font-semibold text-cyan-400">
                              Comentario del Mentor
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed">
                            {evidencia.reviewComment}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>
                          Enviada: {new Date(evidencia.submittedAt).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {evidencia.reviewedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Revisada: {new Date(evidencia.reviewedAt).toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Eye className="text-cyan-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Modo Solo Lectura</h3>
              <p className="text-slate-300 text-sm">
                Como Game Changer, puedes ver todas las evidencias de tus participantes asignados pero no puedes aprobarlas o rechazarlas. 
                Tu rol es monitorear su progreso y proporcionar apoyo cuando sea necesario.
              </p>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && selectedEvidencia && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
              <img
                src={selectedEvidencia.evidenceUrl!}
                alt="Evidencia ampliada"
                className="w-full h-auto rounded-xl border-4 border-cyan-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
