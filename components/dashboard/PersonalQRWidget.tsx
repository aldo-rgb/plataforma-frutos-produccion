'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PersonalQRWidgetProps {
  userName: string;
  userId: number;
  userEmail: string;
}

export default function PersonalQRWidget({ userName, userId, userEmail }: PersonalQRWidgetProps) {
  const [showModal, setShowModal] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  const generateQR = async () => {
    setGeneratingQR(true);
    try {
      // URL con información del usuario
      const userURL = `${window.location.origin}/profile/${userId}`;
      
      // Importar QRCode dinámicamente
      const QRCodeModule = await import('qrcode');
      const QRCode = QRCodeModule.default || QRCodeModule;
      
      // Generar el QR como data URL
      const qrDataUrl = await QRCode.toDataURL(userURL, {
        width: 512,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      setQrDataURL(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataURL) return;
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `${userName.replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    if (!qrDataURL) {
      generateQR();
    }
  };

  return (
    <>
      {/* Widget Card */}
      <div 
        onClick={handleOpenModal}
        className="bg-gradient-to-br from-indigo-900/50 via-blue-900/30 to-slate-900 border-2 border-blue-500/30 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
        
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <span className="text-3xl">📱</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Tu Código</span>
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-xl mb-2">
            Mi QR Personal
          </div>
          <p className="text-sm text-slate-400">
            Tu código QR personalizado para compartir tu perfil
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-blue-500/30 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-2xl font-black text-white">Tu QR Personal</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 text-center">
              <div className="w-64 h-64 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl overflow-hidden">
                {qrDataURL ? (
                  <img src={qrDataURL} alt="QR Code" className="w-full h-full object-contain p-4" />
                ) : generatingQR ? (
                  <div className="animate-spin text-4xl">⏳</div>
                ) : (
                  <div className="text-slate-400 text-6xl">📱</div>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {userName}
              </h3>
              <p className="text-slate-400 mb-2">
                Tu código QR personalizado
              </p>
              {qrDataURL && (
                <p className="text-slate-500 text-sm mb-6 font-mono break-all px-4">
                  {`${window.location.origin}/profile/${userId}`}
                </p>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    if (qrDataURL && navigator.share) {
                      fetch(qrDataURL)
                        .then(res => res.blob())
                        .then(blob => {
                          const file = new File([blob], `${userName.replace(/\s+/g, '-')}-qr.png`, { type: 'image/png' });
                          navigator.share({
                            title: `QR de ${userName}`,
                            text: `Visita mi perfil escaneando este QR`,
                            files: [file]
                          }).catch(err => console.log('Error sharing:', err));
                        });
                    } else if (qrDataURL) {
                      // Fallback: copiar URL al portapapeles
                      const url = `${window.location.origin}/profile/${userId}`;
                      navigator.clipboard.writeText(url);
                      alert('Enlace copiado al portapapeles');
                    }
                  }}
                  disabled={!qrDataURL || generatingQR}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-xl transition-all"
                >
                  🔗 Compartir
                </button>
                <button 
                  onClick={downloadQR}
                  disabled={!qrDataURL}
                  className="px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                >
                  📥 Descargar
                </button>
              </div>

              <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Tip:</strong> Comparte este QR para que otros puedan ver tu perfil y logros
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
