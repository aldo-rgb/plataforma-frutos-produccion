'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';

interface Participante {
  userId: number;
  nombre: string;
  email: string;
  negocio: {
    id: number;
    nombre: string;
    status: string;
  } | null;
}

interface VisionData {
  id: number;
  nombre: string;
}

export default function PrintExpoQRsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const visionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionData | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<number, string>>(new Map());
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [stats, setStats] = useState({ total: 0, conNegocio: 0, sinNegocio: 0 });

  // Verificar autenticación
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Cargar datos
  useEffect(() => {
    if (status === 'authenticated' && visionId) {
      loadData();
    }
  }, [status, visionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vision/${visionId}/expo-negocios`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cargando datos');
      }

      setVision(data.vision);
      setParticipantes(data.participantes);
      setStats({
        total: data.totalParticipantes,
        conNegocio: data.conNegocio,
        sinNegocio: data.sinNegocio
      });

      // Generar QRs para todos los participantes
      await generateAllQRs(data.participantes, data.vision.id);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAllQRs = async (participantes: Participante[], visionId: number) => {
    setGeneratingQRs(true);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';
    const newQRCodes = new Map<number, string>();

    for (const p of participantes) {
      try {
        // URL directa para votar por este usuario/negocio específico
        const votarUrl = `${baseUrl}/expo/votar/${p.userId}`;
        const qrDataUrl = await QRCode.toDataURL(votarUrl, {
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
    window.print();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">
            {generatingQRs ? 'Generando códigos QR...' : 'Cargando participantes...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">❌ {error}</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';
  const catalogUrl = `${baseUrl}/expo/catalogo/${visionId}`;

  return (
    <>
      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }
        @page {
          size: letter;
          margin: 0.5in;
        }
      `}</style>

      {/* Barra de control (no se imprime) */}
      <div className="no-print bg-gradient-to-r from-slate-900 to-purple-900 p-4 sticky top-0 z-50 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              🚀 QR Expo - {vision?.nombre}
            </h1>
            <p className="text-purple-300">
              {stats.conNegocio} negocios registrados de {stats.total} participantes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              ← Volver
            </button>
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
            >
              🖨️ Imprimir Todo ({participantes.length})
            </button>
          </div>
        </div>
      </div>

      {/* Contenido para imprimir */}
      <div className="bg-white min-h-screen">
        {participantes.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-xl text-gray-600">No hay negocios registrados para esta visión</p>
            </div>
          </div>
        ) : (
          participantes.map((participante, index) => (
            <div 
              key={participante.userId} 
              className="print-page"
              style={{
                width: '8.5in',
                height: '11in',
                margin: '0 auto',
                padding: '0.5in',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.3in' }}>
                <div style={{
                  fontSize: '24pt',
                  fontWeight: 800,
                  color: '#f97316',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '0.1in'
                }}>
                  🚀 Expo de Futuros Imposibles
                </div>
                <div style={{ fontSize: '14pt', color: '#64748b', fontWeight: 500 }}>
                  ¡Califica este negocio!
                </div>
              </div>

              {/* Stars */}
              <div style={{ fontSize: '18pt', color: '#fbbf24', margin: '0.15in 0' }}>
                ⭐ ⭐ ⭐ ⭐ ⭐
              </div>

              {/* Business Name */}
              <div style={{
                fontSize: '36pt',
                fontWeight: 800,
                color: '#1e293b',
                margin: '0.4in 0',
                lineHeight: 1.2,
                textAlign: 'center',
                maxWidth: '6in'
              }}>
                {participante.negocio?.nombre || participante.nombre}
              </div>

              {/* QR Container */}
              <div style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '4px solid #f97316',
                borderRadius: '24px',
                padding: '0.4in',
                display: 'inline-block',
                margin: '0.3in 0',
                boxShadow: '0 8px 30px rgba(249, 115, 22, 0.2)'
              }}>
                {qrCodes.get(participante.userId) ? (
                  <img 
                    src={qrCodes.get(participante.userId)} 
                    alt="QR Code" 
                    style={{ width: '3.5in', height: '3.5in' }}
                  />
                ) : (
                  <div style={{ 
                    width: '3.5in', 
                    height: '3.5in', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#f97316'
                  }}>
                    Generando QR...
                  </div>
                )}
              </div>

              {/* Scan Text */}
              <div style={{
                fontSize: '20pt',
                fontWeight: 700,
                color: '#ea580c',
                marginTop: '0.3in',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '24pt' }}>📱</span>
                Escanea y vota
              </div>

              {/* Instructions */}
              <div style={{
                fontSize: '13pt',
                color: '#64748b',
                marginTop: '0.2in',
                lineHeight: 1.5,
                textAlign: 'center'
              }}>
                Abre la cámara de tu celular<br/>
                y escanea el código QR para calificar
              </div>

              {/* Footer */}
              <div style={{
                marginTop: '0.4in',
                paddingTop: '0.2in',
                borderTop: '2px dashed #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '10pt',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {catalogUrl}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
