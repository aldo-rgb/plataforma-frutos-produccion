'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  LifeBuoy,
  Shield,
  Eye,
  EyeOff,
  Heart,
  User,
  Compass,
  AlertTriangle,
  FileText,
  Music,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Sparkles,
  Users,
  Home,
  Brain,
  Target,
  Rocket,
  BadgeCheck,
  UserPlus,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { TopFileModal } from '@/components/el-cruce';

// Dimension configuration
const DIMENSIONS = [
  { id: 1, name: 'Raíces', icon: Home, color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
  { id: 2, name: 'Cuerpo', icon: Heart, color: 'red', gradient: 'from-red-500 to-rose-500' },
  { id: 3, name: 'Vida', icon: User, color: 'amber', gradient: 'from-amber-500 to-orange-500' },
  { id: 4, name: 'Creencias', icon: Brain, color: 'pink', gradient: 'from-pink-500 to-purple-500' },
  { id: 5, name: 'Propósito', icon: Target, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
];

interface LegacyCapture {
  contractPhotoUrl?: string;
  contractDeclaration?: string;
  photoWithGCUrl?: string;
  photoWithSquadUrl?: string;
  photoBlueWallUrl?: string;
  lullabyTitle?: string;
  lullabyArtist?: string;
  status?: string;
}

interface BusinessProfile {
  id: number;
  headline: string;
  website?: string;
  status: string;
  isVerified: boolean;
  isPLGraduate: boolean;
  category?: {
    id: number;
    name: string;
  };
}

export default function BitacoraDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDimension, setActiveDimension] = useState(1);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [showTopFile, setShowTopFile] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/trainer/bitacoras/${params.id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al cargar');
        }
        const data = await res.json();
        setData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const markFlagAsReviewed = async () => {
    setMarkingReviewed(true);
    try {
      const res = await fetch(`/api/trainer/bitacoras/${params.id}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const result = await res.json();
        setData((prev: any) => ({
          ...prev,
          alerts: {
            ...prev.alerts,
            flagReviewedAt: result.reviewedAt,
            flagReviewedBy: { nombre: 'Tú' },
          },
        }));
      }
    } catch (error) {
      console.error('Error marking flag:', error);
    } finally {
      setMarkingReviewed(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse mx-auto" />
            <Loader2 className="w-10 h-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <p className="mt-6 text-gray-400 text-lg">Cargando bitácora...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const dimensionData = data[`dimension${activeDimension}`];
  const activeDim = DIMENSIONS.find(d => d.id === activeDimension);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/dashboard/trainer/bitacoras"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver a participantes</span>
        </Link>

        {/* Main Card - Participant Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 mb-8"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {data.participant.imagen ? (
                    <img
                      src={data.participant.imagen}
                      alt={data.participant.nombre}
                      className="w-28 h-28 rounded-2xl object-cover ring-4 ring-purple-500/20"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-purple-500/20">
                      {data.participant.nombre.charAt(0)}
                    </div>
                  )}
                  {data.status === 'COMPLETED' && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {data.participant.nombre}
                    </h1>
                    {data.vision?.nombre && (
                      <p className="text-purple-400 text-sm font-medium">
                        {data.vision.nombre}
                      </p>
                    )}
                  </div>
                  {data.status === 'COMPLETED' && (
                    <span className="px-4 py-2 bg-green-500/20 text-green-400 text-sm font-medium rounded-full border border-green-500/30">
                      Bitácora Completada
                    </span>
                  )}
                </div>

                {/* Contact & Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoCard
                    icon={Mail}
                    label="Email"
                    value={data.participant.email}
                    color="blue"
                  />
                  {data.participant.telefono && (
                    <InfoCard
                      icon={Phone}
                      label="Teléfono"
                      value={data.participant.telefono}
                      color="green"
                    />
                  )}
                  {data.participant.edad && (
                    <InfoCard
                      icon={Calendar}
                      label="Edad"
                      value={`${data.participant.edad} años`}
                      color="amber"
                    />
                  )}
                  <InfoCard
                    icon={Briefcase}
                    label="Ocupación"
                    value={data.participant.profesion || data.participant.ocupacion || 'No registrada'}
                    color="purple"
                  />
                </div>

                {/* Invitado por y Contacto de Emergencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {/* Quién lo invitó */}
                  {data.invitedBy && (
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Invitado por</span>
                      </div>
                      <p className="text-white font-medium">{data.invitedBy.nombre}</p>
                      {data.invitedBy.telefono && (
                        <a 
                          href={`tel:${data.invitedBy.telefono}`}
                          className="text-sm text-cyan-400 hover:underline flex items-center gap-1 mt-1"
                        >
                          <Phone className="w-3 h-3" />
                          {data.invitedBy.telefono}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Contacto de Emergencia */}
                  {data.emergencyContact && (
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Contacto de Emergencia</span>
                      </div>
                      <p className="text-white font-medium">{data.emergencyContact.nombre}</p>
                      <p className="text-xs text-gray-400 mb-1">({data.emergencyContact.relacion})</p>
                      {data.emergencyContact.telefono && (
                        <a 
                          href={`tel:${data.emergencyContact.telefono}`}
                          className="text-sm text-red-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {data.emergencyContact.telefono}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Botón TOP FILE */}
                  <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30 flex flex-col justify-center">
                    <button
                      onClick={() => setShowTopFile(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                    >
                      <FolderOpen className="w-5 h-5" />
                      Ver TOP FILE
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-2">Expediente completo del participante</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Suicide Risk Alert */}
            {data.alerts.suicideRisk && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <LifeBuoy className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-400 mb-1">
                      Atención Especial Requerida
                    </h3>
                    <p className="text-sm text-red-400/70 mb-3">
                      Este participante ha indicado un historial de riesgo. Procede con sensibilidad.
                    </p>
                    {data.alerts.flagReviewedAt ? (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Revisado por {data.alerts.flagReviewedBy?.nombre} el{' '}
                        {new Date(data.alerts.flagReviewedAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <button
                        onClick={markFlagAsReviewed}
                        disabled={markingReviewed}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                      >
                        {markingReviewed ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                        Marcar como revisado
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Futuro Imposible (Business Profile) */}
        {data.businessProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/30">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
              <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
              
              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-purple-500/20">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">Futuro Imposible</h3>
                      {data.businessProfile.isVerified && (
                        <BadgeCheck className="w-5 h-5 text-blue-400" />
                      )}
                      {data.businessProfile.isPLGraduate && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          PL Graduate
                        </span>
                      )}
                    </div>
                    
                    <p className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 mb-2">
                      {data.businessProfile.headline}
                    </p>
                    
                    {data.businessProfile.category && (
                      <p className="text-sm text-gray-400 mb-4">
                        {data.businessProfile.category.name}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      {data.businessProfile.website && (
                        <a
                          href={data.businessProfile.website.startsWith('http') ? data.businessProfile.website : `https://${data.businessProfile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                        >
                          <Globe className="w-4 h-4" />
                          Visitar Sitio Web
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                        data.businessProfile.status === 'ACTIVE' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : data.businessProfile.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {data.businessProfile.status === 'ACTIVE' ? 'Activo' : 
                         data.businessProfile.status === 'PENDING' ? 'Pendiente' : data.businessProfile.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dimension Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {DIMENSIONS.map((dim) => {
              const Icon = dim.icon;
              const isActive = activeDimension === dim.id;

              return (
                <button
                  key={dim.id}
                  onClick={() => setActiveDimension(dim.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition-all
                    ${isActive
                      ? 'text-white shadow-lg'
                      : 'bg-slate-800/50 text-gray-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-gray-200'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDimension"
                      className={`absolute inset-0 bg-gradient-to-r ${dim.gradient} rounded-2xl`}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {dim.name}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Dimension Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDimension}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 overflow-hidden"
          >
            {/* Dimension Header */}
            <div className={`p-6 bg-gradient-to-r ${activeDim?.gradient} bg-opacity-20`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeDim && <activeDim.icon className="w-6 h-6 text-white" />}
                  <h2 className="text-xl font-bold text-white">{dimensionData?.title}</h2>
                </div>
                
                {/* Toggle for dimension 2 */}
                {activeDimension === 2 && (
                  <button
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-xl text-sm text-gray-300 hover:bg-slate-900 transition-colors"
                  >
                    {showSensitiveData ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Ocultar datos
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Mostrar datos
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Dimension Body */}
            <div className="p-6">
              {renderDimensionContent(activeDimension, dimensionData, showSensitiveData)}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Legacy Capture Section */}
        {data.legacyCapture && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/30 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-amber-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/20">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Contrato de Transformación</h3>
                    <p className="text-amber-400/70 text-sm">Capturado por su GameChanger</p>
                  </div>
                  {data.legacyCapture.status === 'COMPLETED' && (
                    <span className="ml-auto px-4 py-2 bg-green-500/20 text-green-400 text-sm rounded-full border border-green-500/30">
                      Completado
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Contract Declaration */}
                {data.legacyCapture.contractDeclaration && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Declaración del Contrato
                    </h4>
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                      <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {data.legacyCapture.contractDeclaration}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contract Photo & Basic Blue Wall Photo - Side by Side */}
                {(data.legacyCapture.contractPhotoUrl || data.basicLegacyCapture?.photoBlueWallUrl) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contract Photo */}
                    {data.legacyCapture.contractPhotoUrl && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-3">Foto del Contrato</h4>
                        <a 
                          href={data.legacyCapture.contractPhotoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={data.legacyCapture.contractPhotoUrl} 
                            alt="Foto del Contrato" 
                            className="w-full rounded-2xl border-2 border-amber-500/30 group-hover:border-amber-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}

                    {/* Basic Blue Wall Photo */}
                    {data.basicLegacyCapture?.photoBlueWallUrl && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Pared Azul (Básico)
                        </h4>
                        <a 
                          href={data.basicLegacyCapture.photoBlueWallUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={data.basicLegacyCapture.photoBlueWallUrl} 
                            alt="Foto Pared Azul - Básico" 
                            className="w-full rounded-2xl border-2 border-blue-500/30 group-hover:border-blue-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Lullaby */}
                {(data.legacyCapture.lullabyTitle || data.legacyCapture.lullabyArtist) && (
                  <div>
                    <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Canción de Cuna
                    </h4>
                    <div className="p-5 bg-purple-500/10 rounded-2xl border border-purple-500/30">
                      <p className="text-white font-semibold text-lg">{data.legacyCapture.lullabyTitle || 'Sin título'}</p>
                      <p className="text-purple-400/70">{data.legacyCapture.lullabyArtist || 'Artista desconocido'}</p>
                    </div>
                  </div>
                )}

                {/* Closing Photos */}
                {(data.legacyCapture.photoWithGCUrl || data.legacyCapture.photoWithSquadUrl || data.legacyCapture.photoBlueWallUrl) && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Fotos del Cierre
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data.legacyCapture.photoWithGCUrl && (
                        <PhotoCard
                          url={data.legacyCapture.photoWithGCUrl}
                          label="Con GameChanger"
                        />
                      )}
                      {data.legacyCapture.photoWithSquadUrl && (
                        <PhotoCard
                          url={data.legacyCapture.photoWithSquadUrl}
                          label="Con Squad"
                        />
                      )}
                      {data.legacyCapture.photoBlueWallUrl && (
                        <PhotoCard
                          url={data.legacyCapture.photoBlueWallUrl}
                          label="Blue Wall"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TOP FILE Modal */}
        {data?.participant && (
          <TopFileModal
            userId={data.participant.id}
            userName={data.participant.nombre}
            isOpen={showTopFile}
            onClose={() => setShowTopFile(false)}
          />
        )}
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors[color] || colors.blue}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-200 truncate">{value}</p>
      </div>
    </div>
  );
}

// Photo Card Component
function PhotoCard({ url, label }: { url: string; label: string }) {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <img 
          src={url} 
          alt={label} 
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 text-sm text-white font-medium">
          {label}
        </span>
      </div>
    </a>
  );
}

// Render dimension content
function renderDimensionContent(dimension: number, data: any, showSensitive: boolean) {
  if (!data?.data) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-500 text-lg">Esta dimensión aún no ha sido completada</p>
      </div>
    );
  }

  const d = data.data;

  switch (dimension) {
    case 1: // Raíces y Relaciones
      return (
        <div className="space-y-6">
          <ResponseCard title="Estado Civil" value={translateMaritalStatus(d.estadoCivil)} />
          
          {d.relacionPareja && (
            <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Relación con Pareja</h4>
              <p className="text-gray-200 mb-3">{d.relacionPareja}</p>
              {d.calificacionPareja && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Calificación:</span>
                  <div className="flex-1 max-w-xs h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${d.calificacionPareja * 10}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-blue-400">{d.calificacionPareja}/10</span>
                </div>
              )}
            </div>
          )}
          
          {d.tieneHijos && d.datosHijos?.length > 0 && (
            <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Hijos ({d.datosHijos.length})
              </h4>
              <div className="grid gap-3">
                {d.datosHijos.map((hijo: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {hijo.name?.charAt(0) || i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{hijo.name}</p>
                      <p className="text-sm text-gray-400">{hijo.age} años</p>
                      {hijo.relationship && (
                        <p className="text-sm text-gray-300 mt-1">{hijo.relationship}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <ResponseCard title="Relación con Padres" value={d.relacionPadres} />
          
          {d.cantidadHermanos > 0 && (
            <>
              <ResponseCard title="Hermanos" value={`${d.cantidadHermanos} hermano(s)`} />
              <ResponseCard title="Relación con Hermanos" value={d.relacionHermanos} />
            </>
          )}
          
          {d.tieneAcompanante && (
            <ResponseCard
              title="Acompañante en el Entrenamiento"
              value={`${d.nombreAcompanante} (${d.relacionAcompanante})`}
            />
          )}
        </div>
      );

    case 2: // Cuerpo y Sombra
      return (
        <div className="space-y-6">
          <ResponseCard 
            title="Estado de Salud" 
            value={showSensitive ? d.estadoSalud : '•••••••••••••'} 
            blur={!showSensitive}
          />
          <ResponseCard 
            title="Medicamentos" 
            value={showSensitive ? d.medicamentos : '•••••••••••••'} 
            blur={!showSensitive}
          />
          
          {d.embarazo !== null && d.embarazo !== undefined && (
            <ResponseCard title="Embarazo" value={d.embarazo ? 'Sí' : 'No'} />
          )}
          
          {d.intentoSuicidio && (
            <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-red-400">Historial de Riesgo Reportado</span>
              </div>
              {showSensitive ? (
                <p className="text-gray-300">{d.razonSuicidio || 'No se proporcionaron detalles'}</p>
              ) : (
                <p className="text-gray-500 italic">Contenido oculto - haz clic en &quot;Mostrar datos&quot; para ver</p>
              )}
            </div>
          )}
        </div>
      );

    case 3: // Línea de Vida
      return (
        <div className="space-y-6">
          <TimelineCard
            stage="Niñez"
            event={d.ninez?.evento}
            meaning={d.ninez?.significado}
            color="yellow"
          />
          <TimelineCard
            stage="Adolescencia"
            event={d.adolescencia?.evento}
            meaning={d.adolescencia?.significado}
            color="orange"
          />
          <TimelineCard
            stage="Adultez"
            event={d.adultez?.evento}
            meaning={d.adultez?.significado}
            color="purple"
          />
          <ResponseCard title="Influencia en su Vida Actual" value={d.influenciaActual} highlight />
        </div>
      );

    case 4: // Espejos y Creencias
      return (
        <div className="space-y-6">
          <ResponseCard title="Cómo lo Describen Otros" value={d.percepcionExterna} />
          <ResponseCard title="Percepción de Amigos" value={d.percepcionAmigos} />
          <ResponseCard title="Creencias Religiosas" value={d.creenciasReligiosas} />
          <ResponseCard title="Educación y Creencias" value={d.educacionCreencias} />
          <ResponseCard title="Vida Profesional" value={d.trabajo} />
          <ResponseCard title="Detonantes/Triggers" value={d.detonantes} highlight />
        </div>
      );

    case 5: // El Propósito
      return (
        <div className="py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Su Propósito Declarado</h3>
          </div>
          <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl">
            <p className="text-xl text-gray-200 leading-relaxed text-center whitespace-pre-wrap">
              {d.proposito || 'No se ha definido aún'}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Response Card Component
function ResponseCard({ title, value, highlight = false, blur = false }: { title: string; value: any; highlight?: boolean; blur?: boolean }) {
  if (!value) return null;
  
  return (
    <div className={`p-5 rounded-2xl border ${
      highlight 
        ? 'bg-amber-500/10 border-amber-500/30' 
        : 'bg-slate-900/50 border-slate-700/50'
    }`}>
      <h4 className={`text-sm font-medium mb-2 ${highlight ? 'text-amber-400' : 'text-gray-400'}`}>
        {title}
      </h4>
      <p className={`text-gray-200 whitespace-pre-wrap ${blur ? 'blur-sm select-none' : ''}`}>
        {value}
      </p>
    </div>
  );
}

// Timeline Card Component
function TimelineCard({ stage, event, meaning, color }: { stage: string; event: string; meaning: string; color: string }) {
  const styles: Record<string, string> = {
    yellow: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    orange: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  };

  const textColors: Record<string, string> = {
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };
  
  if (!event && !meaning) return null;

  return (
    <div className={`p-5 bg-gradient-to-br ${styles[color]} border rounded-2xl`}>
      <h4 className={`font-bold text-lg mb-4 ${textColors[color]}`}>{stage}</h4>
      <div className="space-y-4">
        {event && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Evento</span>
            <p className="text-gray-200 mt-1">{event}</p>
          </div>
        )}
        {meaning && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Significado</span>
            <p className="text-gray-200 mt-1">{meaning}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function translateMaritalStatus(status: string): string {
  const translations: Record<string, string> = {
    SINGLE: 'Soltero/a',
    MARRIED: 'Casado/a',
    DIVORCED: 'Divorciado/a',
    WIDOWED: 'Viudo/a',
    COMMON_LAW: 'Unión Libre',
    DATING: 'En una relación',
  };
  return translations[status] || status || 'No especificado';
}
