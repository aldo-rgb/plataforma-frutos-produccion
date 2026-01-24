'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Users,
  Heart,
  FileText,
  Plus,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trophy
} from 'lucide-react';

interface CampaignDetails {
  id: number;
  title: string;
  slug: string;
  description: string;
  story: string;
  coverImage: string;
  videoUrl: string;
  goalAmount: number;
  raisedAmount: number;
  availableAmount: number;
  status: string;
  project: {
    id: number;
    title: string;
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
  donations: any[];
  expenses: any[];
  members: any[];
  _count: {
    donations: number;
    members: number;
  };
}

interface Membership {
  id: number;
  referralCode: string;
  referralUrl: string;
  role: string;
  totalRaised: number;
  donationsCount: number;
  myRaised: number;
  myReferralsCount: number;
}

interface Expense {
  id: number;
  concept: string;
  description: string;
  amount: number;
  status: string;
  quotationUrl: string;
  invoiceUrl: string;
  evidenceUrls: string[];
  auditComments: string;
  createdAt: string;
  auditedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  REQUESTED: { label: 'En Revisión', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  UNDER_REVIEW: { label: 'Auditando', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  REJECTED: { label: 'Rechazado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  PAID_OUT: { label: 'Dispersado', icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  PUBLISHED: { label: 'Publicado', icon: Eye, color: 'text-teal-400', bg: 'bg-teal-500/10' }
};

export default function CampaignVaultPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [myExpenses, setMyExpenses] = useState<Expense[]>([]);
  const [wallet, setWallet] = useState({ totalRaised: 0, available: 0, spent: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'expenses' | 'leaderboard'>('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      const res = await fetch(`/api/legacy-builder/campaigns/${campaignId}`);
      const data = await res.json();
      
      if (data.campaign) {
        setCampaign(data.campaign);
        setMembership(data.membership);
        setMyExpenses(data.myExpenses || []);
        setWallet(data.wallet);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!membership) return;
    const url = `${window.location.origin}/legado/${campaign?.slug}?ref=${membership.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Campaña no encontrada</h2>
          <Link href="/dashboard/legacy-builder" className="text-emerald-400 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con navegación */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/legacy-builder"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="flex-1">
            <span className="text-sm text-emerald-400">{campaign.project.title}</span>
            <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
          </div>
          
          {/* Botón compartir */}
          <button
            onClick={copyReferralLink}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </>
            )}
          </button>
        </div>

        {/* Bóveda Virtual - Stats principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Recaudado */}
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-slate-400">Total Recaudado</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(wallet.totalRaised)}
            </p>
            <div className="mt-2">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  style={{ width: `${calculateProgress(wallet.totalRaised, Number(campaign.goalAmount))}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 mt-1">
                de {formatCurrency(Number(campaign.goalAmount))}
              </span>
            </div>
          </div>

          {/* Disponible */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-slate-400">Saldo Disponible</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(wallet.available)}
            </p>
            <span className="text-xs text-slate-500">Para solicitar gastos</span>
          </div>

          {/* Gastado */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-slate-400">Total Gastado</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(wallet.spent)}
            </p>
            <span className="text-xs text-slate-500">Con comprobantes</span>
          </div>

          {/* Mi contribución */}
          <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-slate-400">Mi Recaudación</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(membership?.myRaised || 0)}
            </p>
            <span className="text-xs text-amber-400">
              {membership?.myReferralsCount || 0} donaciones referidas
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Resumen', icon: Eye },
            { id: 'donations', label: 'Donaciones', icon: Heart },
            { id: 'expenses', label: 'Mis Gastos', icon: FileText },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel principal */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Acerca de esta campaña</h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  {campaign.description || campaign.story || 'Sin descripción disponible.'}
                </p>
                
                {/* Link a página pública */}
                <Link
                  href={`/legado/${campaign.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver página pública de donación
                </Link>
              </div>
            )}

            {activeTab === 'donations' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Últimas Donaciones ({campaign._count.donations})
                </h3>
                
                {campaign.donations.length === 0 ? (
                  <div className="text-center py-10">
                    <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aún no hay donaciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaign.donations.map((donation: any) => (
                      <div
                        key={donation.id}
                        className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
                      >
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <Heart className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{donation.donorName}</p>
                          {donation.message && (
                            <p className="text-sm text-slate-400 italic">"{donation.message}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-bold">
                            {formatCurrency(Number(donation.amount))}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(donation.createdAt).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Mis Solicitudes de Gasto
                  </h3>
                  {membership?.role && ['CAPTAIN', 'COORDINATOR'].includes(membership.role) && (
                    <Link
                      href={`/dashboard/legacy-builder/${campaignId}/new-expense`}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nueva Solicitud
                    </Link>
                  )}
                </div>

                {myExpenses.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No tienes solicitudes de gasto</p>
                    {membership?.role && !['CAPTAIN', 'COORDINATOR'].includes(membership.role) && (
                      <p className="text-sm text-slate-500 mt-2">
                        Solo capitanes y coordinadores pueden solicitar gastos
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myExpenses.map((expense) => {
                      const config = STATUS_CONFIG[expense.status] || STATUS_CONFIG.REQUESTED;
                      const StatusIcon = config.icon;
                      
                      return (
                        <div
                          key={expense.id}
                          className="p-4 bg-slate-800/50 rounded-xl"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-white font-medium">{expense.concept}</p>
                              {expense.description && (
                                <p className="text-sm text-slate-400 mt-1">{expense.description}</p>
                              )}
                            </div>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                            <span className="text-lg font-bold text-white">
                              {formatCurrency(Number(expense.amount))}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(expense.createdAt).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          
                          {expense.status === 'REJECTED' && expense.auditComments && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-sm text-red-400">
                                <strong>Motivo:</strong> {expense.auditComments}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  <Trophy className="w-5 h-5 text-amber-400 inline mr-2" />
                  Top Recaudadores
                </h3>
                
                {campaign.members.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Sin miembros aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaign.members.map((member: any, index: number) => (
                      <div
                        key={member.id}
                        className={`flex items-center gap-4 p-4 rounded-xl ${
                          index === 0 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' :
                          index === 1 ? 'bg-slate-700/50' :
                          index === 2 ? 'bg-amber-900/20' :
                          'bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-amber-500 text-amber-950' :
                          index === 1 ? 'bg-slate-400 text-slate-900' :
                          index === 2 ? 'bg-amber-700 text-amber-100' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-white font-medium">{member.user.nombre}</p>
                          <p className="text-xs text-slate-400">
                            {member.donationsCount} donaciones
                          </p>
                        </div>
                        
                        <p className="text-emerald-400 font-bold">
                          {formatCurrency(Number(member.totalRaised))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Capitán */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Capitán de Campaña</h4>
              <div className="flex items-center gap-3">
                {campaign.captain.imagen ? (
                  <Image
                    src={campaign.captain.imagen}
                    alt={campaign.captain.nombre}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <span className="text-amber-400 font-bold">
                      {campaign.captain.nombre.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{campaign.captain.nombre}</p>
                  <span className="text-xs text-amber-400">👑 Capitán</span>
                </div>
              </div>
            </div>

            {/* Mi link de referido */}
            {membership && (
              <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-5">
                <h4 className="text-sm font-medium text-emerald-400 mb-3">
                  Tu Link de Referido
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Comparte este link y cada donación que llegue se contará para tu recaudación.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/legado/${campaign.slug}?ref=${membership.referralCode}`}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 truncate"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Copy className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Transparencia */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Transparencia</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Donadores</span>
                  <span className="text-white font-medium">{campaign._count.donations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Miembros</span>
                  <span className="text-white font-medium">{campaign._count.members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gastos publicados</span>
                  <span className="text-white font-medium">
                    {campaign.expenses.filter((e: any) => e.isPublished).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
