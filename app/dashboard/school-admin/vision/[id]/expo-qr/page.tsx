'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Printer, Loader2, QrCode, Building2 } from 'lucide-react';
import QRCode from 'qrcode';

interface Participante {
  userId: number;
  nombre: string;
  email: string;
  referralCode: string | null;
  businessName: string;
  businessSlug: string | null;
  logoUrl: string | null;
  hasBusinessSite: boolean;
}

interface VisionData {
  id: number;
  nombre: string;
}

export default function ExpoQRPrintPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const visionId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [vision, setVision] = useState<VisionData | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<number, string>>(new Map());
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    fetchData();
  }, [status, visionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/expo-qr`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar datos');
        return;
      }

      setVision(data.vision);
      setParticipantes(data.participantes);
      
      // Generar QRs para todos los participantes
      await generateAllQRs(data.participantes);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const generateAllQRs = async (participants: Participante[]) => {
    setGeneratingQRs(true);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';
    const newQRCodes = new Map<number, string>();

    for (const p of participants) {
      try {
        // Link al catálogo de la visión (donde pueden votar por el negocio)
        const expoLink = `${baseUrl}/expo/catalogo/${visionId}`;
        
        const qrDataUrl = await QRCode.toDataURL(expoLink, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        newQRCodes.set(p.userId, qrDataUrl);
      } catch (error) {
        console.error(`Error generando QR para ${p.nombre}:`, error);
      }
    }

    setQrCodes(newQRCodes);
    setGeneratingQRs(false);
  };

  const handlePrint = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes para imprimir');
      return;
    }

    // Generar HTML para cada participante (uno por página)
    let pagesHtml = '';
    
    participantes.forEach((p, index) => {
      const qrDataUrl = qrCodes.get(p.userId) || '';
      const expoLink = `${baseUrl}/expo/catalogo/${visionId}`;
      const isLastPage = index === participantes.length - 1;
      
      pagesHtml += `
        <div class="page" ${!isLastPage ? 'style="page-break-after: always;"' : ''}>
          <div class="container">
            <div class="header">
              <div class="expo-title">🚀 EXPO DE FUTUROS IMPOSIBLES</div>
              <div class="subtitle">¡Califica este negocio!</div>
            </div>
            
            <div class="decorative-stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
            
            <div class="business-name">${p.businessName}</div>
            
            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code" class="qr-image" />
            </div>
            
            <div class="scan-text">
              <span class="scan-icon">📱</span>
              Escanea y vota
            </div>
            
            <div class="instructions">
              Abre la cámara de tu celular<br/>
              y escanea el código QR para calificar
            </div>
            
            <div class="footer">
              <div class="url-text">${expoLink}</div>
            </div>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QRs Expo - ${vision?.nombre || 'Visión'}</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff;
          }
          .page {
            width: 8.5in;
            height: 11in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.5in;
          }
          .container {
            text-align: center;
            width: 100%;
            max-width: 6in;
          }
          .header {
            margin-bottom: 0.3in;
          }
          .expo-title {
            font-size: 24pt;
            font-weight: 800;
            color: #f97316;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 0.1in;
          }
          .subtitle {
            font-size: 14pt;
            color: #64748b;
            font-weight: 500;
          }
          .business-name {
            font-size: 32pt;
            font-weight: 800;
            color: #1e293b;
            margin: 0.3in 0;
            line-height: 1.2;
            word-wrap: break-word;
          }
          .qr-container {
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            border: 4px solid #f97316;
            border-radius: 24px;
            padding: 0.4in;
            display: inline-block;
            margin: 0.3in 0;
            box-shadow: 0 8px 30px rgba(249, 115, 22, 0.2);
          }
          .qr-image {
            width: 3.5in;
            height: 3.5in;
          }
          .scan-text {
            font-size: 20pt;
            font-weight: 700;
            color: #ea580c;
            margin-top: 0.3in;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .scan-icon {
            font-size: 24pt;
          }
          .instructions {
            font-size: 13pt;
            color: #64748b;
            margin-top: 0.2in;
            line-height: 1.5;
          }
          .footer {
            margin-top: 0.4in;
            padding-top: 0.2in;
            border-top: 2px dashed #e2e8f0;
          }
          .url-text {
            font-size: 10pt;
            color: #94a3b8;
            font-family: monospace;
            word-break: break-all;
          }
          .decorative-stars {
            font-size: 18pt;
            color: #fbbf24;
            margin: 0.15in 0;
          }
          @media print {
            .page {
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Cargando participantes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <QrCode className="w-7 h-7 text-orange-400" />
                QR Expo - {vision?.nombre}
              </h1>
              <p className="text-slate-400">
                {participantes.length} participantes con QR para imprimir
              </p>
            </div>
          </div>
          
          <button
            onClick={handlePrint}
            disabled={generatingQRs || participantes.length === 0}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            {generatingQRs ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando QRs...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Imprimir Todos ({participantes.length})
              </>
            )}
          </button>
        </div>

        {/* Preview de participantes */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white">Vista previa</h2>
            <p className="text-sm text-slate-400">
              Cada participante tendrá su página con QR individual
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {participantes.map((p) => (
              <div
                key={p.userId}
                className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                    {p.nombre?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                  <Building2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-sm text-orange-300 truncate">
                    {p.businessName}
                  </span>
                </div>
                
                {qrCodes.get(p.userId) && (
                  <div className="mt-3 flex justify-center">
                    <div className="bg-white p-2 rounded-lg">
                      <img 
                        src={qrCodes.get(p.userId)} 
                        alt={`QR ${p.businessName}`}
                        className="w-24 h-24"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {participantes.length === 0 && (
            <div className="p-12 text-center">
              <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay participantes en esta visión</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
