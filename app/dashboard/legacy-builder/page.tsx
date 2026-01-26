'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Target,
  Users,
  TrendingUp,
  Share2,
  ExternalLink,
  Wallet,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Lock,
  Crown,
  ArrowLeft
} from 'lucide-react';

interface Campaign {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  goalAmount: number;
  raisedAmount: number;
  availableAmount: number;
  status: string;
  isMember: boolean;
  memberRole: string | null;
  referralCode: string | null;
  myRaised: number;
  project: {
    id: number;
    title: string;
    slug: string;
    category: string;
  };
  vision: {
    id: number;
    nombre: string;
  };
  captain: {
    id: number;
    nombre: string;
    imagen: string;
  };
  _count: {
    donations: number;
    members: number;
  };
}

export default function LegacyBuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joiningCampaign, setJoiningCampaign] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Verificar acceso (Avanzado completado o PL)
  useEffect(() => {
    const checkLideratoAccess = async () => {
      try {
        const response = await fetch('/api/liderato-access');
        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.hasAccess === true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking Liderato access:', error);
        setHasAccess(false);
      }
    };
    checkLideratoAccess();
  }, []);

  useEffect(() => {
    if (hasAccess === true) {
      fetchCampaigns();
    } else if (hasAccess === false) {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/legacy-builder/campaigns');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinCampaign = async (campaignId: number) => {
    setJoiningCampaign(campaignId);
    try {
      const res = await fetch('/api/legacy-builder/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });
      const data = await res.json();
      if (data.success) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error joining campaign:', error);
    } finally {
      setJoiningCampaign(null);
    }
  };

  const copyReferralLink = (campaign: Campaign) => {
    const url = `${window.location.origin}/legado/${campaign.slug}?ref=${campaign.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(campaign.referralCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (raised: number, goal: number) => {
    return Math.min((raised / goal) * 100, 100);
  };

  if (loading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Pantalla de acceso restringido
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700/50 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              Contenido Exclusivo
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Programa de Liderato</span>
            </div>
            
            <p className="text-slate-400 mb-6">
              Esta sección está disponible para participantes 
              <span className="text-amber-300 font-medium">inscritos en Programa de Liderato</span> que han 
              <span className="text-emerald-300 font-medium">completado el nivel Avanzado</span>.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const myCampaigns = campaigns.filter(c => c.isMember);
  const availableCampaigns = campaigns.filter(c => !c.isMember);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl">
              <Heart className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Legacy Builder</h1>
          </div>
          <p className="text-slate-400 ml-12">
            Construye un legado de impacto. Recauda fondos para causas sociales con total transparencia.
          </p>
        </div>

        {/* Mis Campañas */}
        {myCampaigns.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Mis Campañas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all group"
                >
                  {/* Imagen de portada */}
                  <div className="relative h-40 bg-gradient-to-br from-emerald-600/20 to-teal-600/20">
                    {campaign.coverImage ? (
                      <Image
                        src={campaign.coverImage}
                        alt={campaign.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Target className="w-16 h-16 text-emerald-500/30" />
                      </div>
                    )}
                    
                    {/* Badge de rol */}
                    {campaign.memberRole === 'CAPTAIN' && (
                      <span className="absolute top-3 right-3 px-2 py-1 bg-amber-500/90 text-amber-950 text-xs font-bold rounded-lg">
                        👑 Capitán
                      </span>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-5">
                    <div className="mb-3">
                      <span className="text-xs text-emerald-400 font-medium">
                        {campaign.project.title}
                      </span>
                      <h3 className="text-lg font-semibold text-white mt-1">
                        {campaign.title}
                      </h3>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Recaudado</span>
                        <span className="text-emerald-400 font-medium">
                          {Math.round(calculateProgress(Number(campaign.raisedAmount), Number(campaign.goalAmount)))}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${calculateProgress(Number(campaign.raisedAmount), Number(campaign.goalAmount))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-white font-medium">
                          {formatCurrency(Number(campaign.raisedAmount))}
                        </span>
                        <span className="text-slate-500">
                          de {formatCurrency(Number(campaign.goalAmount))}
                        </span>
                      </div>
                    </div>

                    {/* Mi contribución */}
                    {Number(campaign.myRaised) > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Mi recaudación</span>
                          <span className="text-emerald-400 font-bold">
                            {formatCurrency(Number(campaign.myRaised))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{campaign._count.members}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{campaign._count.donations} donaciones</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/legacy-builder/${campaign.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all"
                      >
                        <Wallet className="w-4 h-4" />
                        Mi Bóveda
                      </Link>
                      
                      <button
                        onClick={() => copyReferralLink(campaign)}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                        title="Copiar link de referido"
                      >
                        {copiedCode === campaign.referralCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campañas Disponibles */}
        {availableCampaigns.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Campañas Disponibles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all"
                >
                  {/* Imagen */}
                  <div className="relative h-40 bg-gradient-to-br from-purple-600/20 to-pink-600/20">
                    {campaign.coverImage ? (
                      <Image
                        src={campaign.coverImage}
                        alt={campaign.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Target className="w-16 h-16 text-purple-500/30" />
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-5">
                    <span className="text-xs text-purple-400 font-medium">
                      {campaign.project.title}
                    </span>
                    <h3 className="text-lg font-semibold text-white mt-1 mb-2">
                      {campaign.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                      {campaign.description}
                    </p>

                    {/* Barra de progreso */}
                    <div className="mb-4">
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${calculateProgress(Number(campaign.raisedAmount), Number(campaign.goalAmount))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-white font-medium">
                          {formatCurrency(Number(campaign.raisedAmount))}
                        </span>
                        <span className="text-slate-500">
                          Meta: {formatCurrency(Number(campaign.goalAmount))}
                        </span>
                      </div>
                    </div>

                    {/* Visión */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <Users className="w-4 h-4" />
                      <span>{campaign.vision.nombre}</span>
                    </div>

                    {/* Botón unirse */}
                    <button
                      onClick={() => joinCampaign(campaign.id)}
                      disabled={joiningCampaign === campaign.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                    >
                      {joiningCampaign === campaign.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Heart className="w-4 h-4" />
                          Unirme a esta causa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-800/50 rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No hay campañas disponibles
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Cuando tu organización cree proyectos sociales, aparecerán aquí para que puedas sumarte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
