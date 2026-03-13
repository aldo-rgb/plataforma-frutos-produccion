'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Share2, Users, TrendingUp } from 'lucide-react';

interface WalletData {
  user: {
    id: number;
    nombre: string;
    referralCode: string;
    balance: number;
    isGraduated: boolean;
    organizationSlug: string | null;
  };
  stats: {
    available: number;
    totalEarned: number;
    totalReferrals: number;
  };
}

export default function AmbassadorWalletMiniWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const res = await fetch('/api/ambassador/wallet');
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching ambassador wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!data?.user.referralCode) return;
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
    const link = data.user.organizationSlug 
      ? `${baseUrl}/org/${data.user.organizationSlug}?ref=${data.user.referralCode}`
      : `${baseUrl}/registro?ref=${data.user.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    if (!data?.user.referralCode) return;
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.com';
    const link = data.user.organizationSlug 
      ? `${baseUrl}/org/${data.user.organizationSlug}?ref=${data.user.referralCode}`
      : `${baseUrl}/registro?ref=${data.user.referralCode}`;
    const message = encodeURIComponent(
      `¡Hola! Te invito a vivir una experiencia transformadora. Usa mi código de referido y regístrate aquí: ${link}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 h-full animate-pulse">
        <div className="h-5 bg-purple-500/20 rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-purple-500/20 rounded w-1/2"></div>
      </div>
    );
  }

  if (!data || !data.user.isGraduated) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 h-full flex flex-col">
      {/* Header compacto */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-purple-500/20 rounded-lg">
          <Gift className="w-4 h-4 text-purple-400" />
        </div>
        <h3 className="text-sm font-bold text-white">Invita y Gana</h3>
      </div>

      {/* Balance y stats en una fila */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-purple-300/60 text-xs">Saldo</p>
          <p className="text-xl font-bold text-white">{formatMXN(data.user.balance)}</p>
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-green-400">{data.stats.totalReferrals}</p>
            <p className="text-[10px] text-purple-300/60">Referidos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-300">{formatMXN(data.stats.totalEarned)}</p>
            <p className="text-[10px] text-purple-300/60">Ganado</p>
          </div>
        </div>
      </div>

      {/* Código y botones de compartir */}
      <div className="mt-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 font-mono text-sm text-purple-300 text-center truncate">
            {data.user.referralCode}
          </div>
          <button
            onClick={copyReferralLink}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              copied 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
            }`}
            title="Copiar link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={shareOnWhatsApp}
            className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-all flex-shrink-0"
            title="Compartir en WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-purple-300/40 mt-1.5 text-center">
          20% Básico/Combo • 10% Avanzado/PL
        </p>
      </div>
    </div>
  );
}
