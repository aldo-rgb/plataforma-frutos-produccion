'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { QrCode, Download, Share2, Copy, Check, Loader2, User, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

export default function MiQRPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchMentorProfile();
    }
  }, [status]);

  const fetchMentorProfile = async () => {
    try {
      const res = await fetch('/api/mentor/profile');
      const data = await res.json();
      
      if (data.success && data.profile) {
        setMentorProfile(data.profile);
        generateQR(data.profile.slug);
      }
    } catch (error) {
      console.error('Error fetching mentor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (slug: string) => {
    const url = `${window.location.origin}/mentores/${slug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  };

  const getProfileUrl = () => {
    if (!mentorProfile?.slug) return '';
    return `${window.location.origin}/mentores/${mentorProfile.slug}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getProfileUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-mentor-${mentorProfile?.slug || 'profile'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${mentorProfile?.displayName || 'Mentor'} - Perfil de Mentor`,
          text: '¡Agenda una mentoría conmigo!',
          url: getProfileUrl(),
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!mentorProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-900/50 backdrop-blur border border-yellow-500/30 rounded-2xl p-8 text-center">
            <User className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Perfil de Mentor no encontrado</h2>
            <p className="text-slate-400 mb-6">
              Necesitas crear tu perfil de mentor para obtener tu QR personal.
            </p>
            <button
              onClick={() => router.push('/dashboard/mentor/perfil')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Crear Perfil de Mentor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <QrCode className="text-cyan-400" />
            Mi QR Personal
          </h1>
          <p className="text-slate-400">
            Comparte tu código QR para que los participantes puedan agendar mentorías contigo
          </p>
        </div>

        {/* QR Card */}
        <div className="bg-slate-900/50 backdrop-blur border border-purple-500/20 rounded-2xl p-8">
          {/* Mentor Info */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
            {mentorProfile.photoUrl ? (
              <img
                src={mentorProfile.photoUrl}
                alt={mentorProfile.displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{mentorProfile.displayName}</h2>
              <p className="text-slate-400 text-sm">{mentorProfile.title || 'Mentor'}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center mb-6">
            {qrDataUrl ? (
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            ) : (
              <div className="w-64 h-64 bg-slate-800 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}
            <p className="mt-4 text-slate-400 text-sm text-center">
              Escanea este código para ver mi perfil de mentor
            </p>
          </div>

          {/* URL */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-500 mb-2">Tu enlace personal:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-cyan-400 text-sm break-all">
                {getProfileUrl()}
              </code>
              <button
                onClick={handleCopyLink}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Copiar enlace"
              >
                {copied ? (
                  <Check size={18} className="text-green-400" />
                ) : (
                  <Copy size={18} className="text-slate-300" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleDownloadQR}
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Download size={24} className="text-purple-400" />
              <span className="text-sm text-slate-300">Descargar</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Share2 size={24} className="text-cyan-400" />
              <span className="text-sm text-slate-300">Compartir</span>
            </button>
            
            <button
              onClick={() => window.open(getProfileUrl(), '_blank')}
              className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <ExternalLink size={24} className="text-green-400" />
              <span className="text-sm text-slate-300">Ver Perfil</span>
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-slate-900/30 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2">💡 Tips</h3>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>• Imprime tu QR y colócalo en un lugar visible durante eventos</li>
            <li>• Comparte el enlace en tus redes sociales</li>
            <li>• Añádelo a tu firma de correo electrónico</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
