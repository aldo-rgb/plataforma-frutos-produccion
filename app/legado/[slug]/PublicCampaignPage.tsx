'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  Users,
  Target,
  Eye,
  Play,
  Share2,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
  TrendingUp
} from 'lucide-react';

interface Campaign {
  id: number;
  title: string;
  slug: string;
  description: string;
  story: string;
  coverImage: string;
  videoUrl: string;
  goalAmount: number;
  raisedAmount: number;
  project: {
    id: number;
    title: string;
    category: string;
    organization: {
      id: number;
      name: string;
      logoUrl: string;
    };
  };
  vision: {
    nombre: string;
  };
  captain: {
    nombre: string;
    imagen: string;
  };
  donations: any[];
  expenses: any[];
  _count: {
    donations: number;
    members: number;
  };
}

interface Props {
  campaign: Campaign;
  referralCode?: string;
}

const DONATION_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function PublicCampaignPage({ campaign, referralCode }: Props) {
  const [activeTab, setActiveTab] = useState<'story' | 'transparency' | 'donations'>('story');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleDonate = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount < 50) {
      alert('El monto mínimo de donación es $50 MXN');
      return;
    }

    if (!donorEmail) {
      alert('El email es requerido');
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch('/api/legacy-builder/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          amount,
          donorName: isAnonymous ? null : donorName,
          donorEmail,
          message: message || null,
          isAnonymous,
          referralCode,
          paymentMethod: 'stripe'
        })
      });

      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Error procesando donación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando donación');
    } finally {
      setProcessing(false);
    }
  };

  const shareUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[7].length === 11 ? match[7] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-[40vh] md:h-[50vh] relative">
          {campaign.coverImage ? (
            <Image
              src={campaign.coverImage}
              alt={campaign.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {/* Org logo */}
            {campaign.project.organization.logoUrl && (
              <Image
                src={campaign.project.organization.logoUrl}
                alt={campaign.project.organization.name}
                width={48}
                height={48}
                className="rounded-lg mb-4"
              />
            )}
            
            <span className="text-emerald-400 font-medium text-sm">
              {campaign.project.title}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mt-2 mb-4">
              {campaign.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {campaign.vision.nombre}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-pink-400" />
                {campaign._count.donations} donaciones
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-400" />
                {campaign._count.members} miembros
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(campaign.raisedAmount)}
                  </span>
                  <span className="text-slate-400 ml-2">recaudado</span>
                </div>
                <span className="text-emerald-400 font-bold text-xl">
                  {Math.round(progress)}%
                </span>
              </div>
              
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Meta: {formatCurrency(campaign.goalAmount)}</span>
                <span className="text-slate-400">
                  Faltan {formatCurrency(campaign.goalAmount - campaign.raisedAmount)}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'story', label: 'Historia', icon: Sparkles },
                { id: 'transparency', label: 'Transparencia', icon: Shield },
                { id: 'donations', label: 'Donadores', icon: Heart }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              {activeTab === 'story' && (
                <div>
                  {/* Video */}
                  {campaign.videoUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-slate-800">
                      {getYouTubeEmbedUrl(campaign.videoUrl) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(campaign.videoUrl)!}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-16 h-16 text-slate-500" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                      {campaign.story || campaign.description || 'Esta campaña busca generar un impacto positivo en nuestra comunidad.'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'transparency' && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Gastos Comprobados
                    </h3>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-6">
                    Cada peso donado se usa con responsabilidad. Aquí puedes ver exactamente en qué se ha invertido.
                  </p>

                  {campaign.expenses.length === 0 ? (
                    <div className="text-center py-10">
                      <Eye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Aún no hay gastos publicados</p>
                      <p className="text-sm text-slate-500">Los gastos aparecerán aquí cuando sean auditados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaign.expenses.map((expense: any) => (
                        <div
                          key={expense.id}
                          className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
                        >
                          {expense.publicImageUrl && (
                            <img
                              src={expense.publicImageUrl}
                              alt={expense.concept}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-white font-medium">{expense.concept}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(expense.publishedAt).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          <span className="text-emerald-400 font-bold">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'donations' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Últimas Donaciones
                  </h3>

                  {campaign.donations.length === 0 ? (
                    <div className="text-center py-10">
                      <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Sé el primero en donar</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaign.donations.map((donation: any) => (
                        <div
                          key={donation.id}
                          className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl"
                        >
                          <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Heart className="w-5 h-5 text-pink-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium">{donation.donorName}</p>
                            {donation.message && (
                              <p className="text-sm text-slate-400 italic mt-1">"{donation.message}"</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-emerald-400 font-bold">
                              {formatCurrency(donation.amount)}
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
            </div>
          </div>

          {/* Right Column - Donation Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                Hacer una Donación
              </h3>

              {/* Amount Selection */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {DONATION_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      selectedAmount === amount
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="mb-4">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  placeholder="Otro monto..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Donor Info */}
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={isAnonymous}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                
                <input
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="Tu email *"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mensaje de apoyo (opcional)"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Anonymous checkbox */}
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-slate-300 text-sm">Donar de forma anónima</span>
              </label>

              {/* Donate Button */}
              <button
                onClick={handleDonate}
                disabled={processing || (!selectedAmount && !customAmount)}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Donar {selectedAmount ? formatCurrency(selectedAmount) : customAmount ? formatCurrency(parseFloat(customAmount)) : ''}
                  </>
                )}
              </button>

              {/* Share */}
              <button
                onClick={shareUrl}
                className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">¡Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Compartir campaña
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Pago 100% seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Transparencia total en gastos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">
            Campaña organizada por <strong className="text-slate-400">{campaign.project.organization.name}</strong>
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Powered by Quantum AI
          </p>
        </div>
      </footer>
    </div>
  );
}
