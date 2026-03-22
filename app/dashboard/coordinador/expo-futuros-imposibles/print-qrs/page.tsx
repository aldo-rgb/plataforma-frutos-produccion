'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, QrCode, Users, Store, Loader2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  businessName: string | null;
  businessCategory: string | null;
}

interface VisionOption {
  id: number;
  nombre: string;
}

export default function PrintExpoQRsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const visionIdParam = searchParams.get('visionId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiones, setVisiones] = useState<VisionOption[]>([]);
  const [selectedVisionId, setSelectedVisionId] = useState<number | null>(visionIdParam ? parseInt(visionIdParam) : null);
  const [selectedVisionName, setSelectedVisionName] = useState<string>('');
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<number, string>>(new Map());
  const [generatingQRs, setGeneratingQRs] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showSelector, setShowSelector] = useState(!visionIdParam);

  // Verificar autenticación
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Cargar visiones disponibles
  useEffect(() => {
    if (status === 'authenticated') {
      loadVisiones();
    }
  }, [status]);

  // Cargar participantes cuando se selecciona una visión
  useEffect(() => {
    if (selectedVisionId) {
      loadParticipantes(selectedVisionId);
    }
  }, [selectedVisionId]);

  const loadVisiones = async () => {
    try {
      const response = await fetch('/api/coordinador/visiones');
      const data = await response.json();
      
      if (response.ok && data.visiones) {
        setVisiones(data.visiones);
        
        // Si hay visionId en params, establecer el nombre
        if (visionIdParam) {
          const vision = data.visiones.find((v: VisionOption) => v.id === parseInt(visionIdParam));
          if (vision) {
            setSelectedVisionName(vision.nombre);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando visiones:', err);
    }
  };

  const loadParticipantes = async (visionId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/coordinador/expo-futuros-imposibles?visionId=${visionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cargando participantes');
      }

      setParticipantes(data.participants || []);
      
      // Actualizar nombre de visión seleccionada
      const vision = visiones.find(v => v.id === visionId);
      if (vision) {
        setSelectedVisionName(vision.nombre);
      }

      // Filtrar solo participantes con negocio para generar QRs
      const participantesConNegocio = (data.participants || []).filter(
        (p: Participante) => p.businessName && p.businessName.trim() !== ''
      );

      // Generar QRs solo para participantes con negocio
      if (participantesConNegocio.length > 0) {
        await generateAllQRs(participantesConNegocio);
      }

      setShowSelector(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAllQRs = async (participantes: Participante[]) => {
    setGeneratingQRs(true);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';
    const newQRCodes = new Map<number, string>();

    for (const p of participantes) {
      try {
        // URL directa para votar por este usuario/negocio específico
        const votarUrl = `${baseUrl}/expo/votar/${p.id}`;
        const qrDataUrl = await QRCode.toDataURL(votarUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        newQRCodes.set(p.id, qrDataUrl);
      } catch (error) {
        console.error(`Error generando QR para ${p.nombre}:`, error);
      }
    }

    setQrCodes(newQRCodes);
    setGeneratingQRs(false);
  };

  const handlePrint = () => {
    // Ocultar todo el layout del dashboard antes de imprimir
    const dashboardLayout = document.querySelector('body > div') as HTMLElement;
    const allElements = document.querySelectorAll('header, nav, aside, footer, [class*="sidebar"], [class*="Sidebar"], [class*="header"], [class*="Header"]');
    
    // Agregar estilo temporal para ocultar elementos del dashboard
    const styleElement = document.createElement('style');
    styleElement.id = 'print-override-styles';
    styleElement.textContent = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        .print-container, .print-container * {
          visibility: visible !important;
        }
        .print-container {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
        }
        .print-page {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100vh !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: white !important;
          padding: 0.5in !important;
        }
        .print-page:last-child {
          page-break-after: auto !important;
        }
        .no-print {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Pequeño delay para que el DOM se actualice
    setTimeout(() => {
      window.print();
      
      // Remover el estilo después de imprimir
      setTimeout(() => {
        const tempStyle = document.getElementById('print-override-styles');
        if (tempStyle) {
          tempStyle.remove();
        }
      }, 1000);
    }, 100);
  };

  const handleDownloadPDF = async () => {
    // Filtrar solo participantes con negocio
    const participantesConNegocio = participantes.filter(p => p.businessName && p.businessName.trim() !== '');
    
    if (participantesConNegocio.length === 0) {
      alert('No hay participantes con negocio configurado para generar PDF');
      return;
    }

    setGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter' // 8.5 x 11 pulgadas
      });

      const pageWidth = 8.5;
      const pageHeight = 11;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.impactocuantico.net';

      for (let i = 0; i < participantesConNegocio.length; i++) {
        const p = participantesConNegocio[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        // Generar QR de alta resolución para PDF
        const votarUrl = `${baseUrl}/expo/votar/${p.id}`;
        const qrDataUrl = await QRCode.toDataURL(votarUrl, {
          width: 800,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // Header - Expo de Futuros Imposibles
        pdf.setFontSize(28);
        pdf.setTextColor(249, 115, 22); // Orange
        pdf.setFont('helvetica', 'bold');
        const headerText = 'EXPO DE FUTUROS IMPOSIBLES';
        const headerWidth = pdf.getTextWidth(headerText);
        pdf.text(headerText, (pageWidth - headerWidth) / 2, 1);

        // Subtítulo
        pdf.setFontSize(14);
        pdf.setTextColor(100, 116, 139); // Slate
        pdf.setFont('helvetica', 'normal');
        const subText = 'Califica este negocio!';
        const subWidth = pdf.getTextWidth(subText);
        pdf.text(subText, (pageWidth - subWidth) / 2, 1.4);

        // Estrellas - usar asteriscos en lugar de emojis
        pdf.setFontSize(24);
        pdf.setTextColor(251, 191, 36); // Yellow
        pdf.setFont('helvetica', 'bold');
        const stars = '* * * * *';
        const starsWidth = pdf.getTextWidth(stars);
        pdf.text(stars, (pageWidth - starsWidth) / 2, 1.85);

        // Nombre del negocio
        pdf.setFontSize(36);
        pdf.setTextColor(30, 41, 59); // Slate dark
        pdf.setFont('helvetica', 'bold');
        const businessName = p.businessName || p.nombre;
        const nameWidth = pdf.getTextWidth(businessName);
        // Si el nombre es muy largo, reducir el tamaño
        if (nameWidth > 7) {
          pdf.setFontSize(28);
        }
        const adjustedNameWidth = pdf.getTextWidth(businessName);
        pdf.text(businessName, (pageWidth - adjustedNameWidth) / 2, 2.6);

        // Categoría
        if (p.businessCategory) {
          pdf.setFontSize(14);
          pdf.setTextColor(100, 116, 139);
          pdf.setFont('helvetica', 'normal');
          const catWidth = pdf.getTextWidth(p.businessCategory);
          pdf.text(p.businessCategory, (pageWidth - catWidth) / 2, 3.1);
        }

        // QR Code - centrado y grande
        const qrSize = 4;
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = 3.5;
        
        // Dibujar borde naranja alrededor del QR
        pdf.setDrawColor(249, 115, 22);
        pdf.setLineWidth(0.05);
        pdf.roundedRect(qrX - 0.3, qrY - 0.3, qrSize + 0.6, qrSize + 0.6, 0.2, 0.2, 'S');
        
        // Agregar el QR
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Texto "Escanea y vota"
        pdf.setFontSize(20);
        pdf.setTextColor(234, 88, 12); // Orange darker
        pdf.setFont('helvetica', 'bold');
        const scanText = 'ESCANEA Y VOTA';
        const scanWidth = pdf.getTextWidth(scanText);
        pdf.text(scanText, (pageWidth - scanWidth) / 2, 8.3);

        // Instrucciones
        pdf.setFontSize(12);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        const inst1 = 'Abre la camara de tu celular';
        const inst2 = 'y escanea el codigo QR para calificar';
        pdf.text(inst1, (pageWidth - pdf.getTextWidth(inst1)) / 2, 8.7);
        pdf.text(inst2, (pageWidth - pdf.getTextWidth(inst2)) / 2, 9.0);

        // URL al pie
        pdf.setFontSize(9);
        pdf.setTextColor(148, 163, 184);
        const catalogUrl = `${baseUrl}/expo/catalogo/${selectedVisionId}`;
        const urlWidth = pdf.getTextWidth(catalogUrl);
        pdf.text(catalogUrl, (pageWidth - urlWidth) / 2, 10.3);
      }

      // Descargar el PDF
      pdf.save(`QRs-Expo-${selectedVisionName || 'Vision'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intenta de nuevo.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSelectVision = (visionId: number) => {
    setSelectedVisionId(visionId);
  };

  const handleChangeVision = () => {
    setShowSelector(true);
    setParticipantes([]);
    setQrCodes(new Map());
  };

  // Pantalla de selección de visión
  if (showSelector || !selectedVisionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/coordinador/expo-futuros-imposibles')}
              className="flex items-center gap-2 text-purple-300 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              Volver a Expo
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <QrCode className="text-orange-400" size={36} />
              Imprimir QRs de Expo
            </h1>
            <p className="text-purple-300 mt-2">
              Selecciona la visión para generar los códigos QR de los participantes
            </p>
          </div>

          {/* Lista de visiones */}
          <div className="space-y-3">
            {visiones.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-purple-400" size={40} />
                <p className="text-purple-300">Cargando visiones...</p>
              </div>
            ) : (
              visiones.map((vision) => (
                <button
                  key={vision.id}
                  onClick={() => handleSelectVision(vision.id)}
                  className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-purple-500/30 hover:border-orange-500/50 rounded-xl p-4 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Users className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg group-hover:text-orange-300 transition-colors">
                          {vision.nombre}
                        </h3>
                        <p className="text-purple-400 text-sm">ID: {vision.id}</p>
                      </div>
                    </div>
                    <div className="text-purple-400 group-hover:text-orange-400 transition-colors">
                      <Printer size={24} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
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

  // Error state
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
  const catalogUrl = `${baseUrl}/expo/catalogo/${selectedVisionId}`;

  return (
    <>
      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: auto !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-qr-container, #print-qr-container * {
            visibility: visible !important;
          }
          #print-qr-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          .print-page {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 8.5in !important;
            height: 11in !important;
            min-height: 11in !important;
            max-height: 11in !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: white !important;
            box-sizing: border-box !important;
            padding: 0.5in !important;
            margin: 0 !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
        @page {
          size: letter portrait;
          margin: 0;
        }
      `}</style>

      {/* Barra de control (no se imprime) */}
      <div className="no-print bg-gradient-to-r from-slate-900 to-purple-900 p-4 sticky top-0 z-50 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <QrCode className="text-orange-400" />
              QR Expo - {selectedVisionName}
            </h1>
            <p className="text-purple-300">
              {participantes.filter(p => p.businessName).length} negocios registrados de {participantes.length} participantes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleChangeVision}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
            >
              <Users size={18} />
              Cambiar Visión
            </button>
            <button
              onClick={() => router.push('/dashboard/coordinador/expo-futuros-imposibles')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              ← Volver a Expo
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF || participantes.filter(p => p.businessName).length === 0}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-slate-500 disabled:to-slate-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Descargar PDF ({participantes.filter(p => p.businessName).length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido para imprimir */}
      <div id="print-qr-container" className="bg-white min-h-screen print-container">
        {participantes.filter(p => p.businessName).length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Store className="mx-auto mb-4 text-gray-400" size={64} />
              <p className="text-xl text-gray-600">No hay participantes con negocio configurado en esta visión</p>
              <button
                onClick={handleChangeVision}
                className="mt-4 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
              >
                Seleccionar otra visión
              </button>
            </div>
          </div>
        ) : (
          participantes.filter(p => p.businessName).map((participante, index, filteredArray) => (
            <div 
              key={participante.id} 
              className="print-page"
              style={{
                width: '100%',
                minHeight: '100vh',
                boxSizing: 'border-box',
                padding: '0.5in',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                pageBreakAfter: index < filteredArray.length - 1 ? 'always' : 'auto',
                breakAfter: index < filteredArray.length - 1 ? 'page' : 'auto'
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
                {participante.businessName || participante.nombre}
              </div>

              {/* Category */}
              {participante.businessCategory && (
                <div style={{
                  fontSize: '14pt',
                  color: '#64748b',
                  marginBottom: '0.2in',
                  padding: '8px 20px',
                  background: '#f1f5f9',
                  borderRadius: '20px'
                }}>
                  {participante.businessCategory}
                </div>
              )}

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
                {qrCodes.get(participante.id) ? (
                  <img 
                    src={qrCodes.get(participante.id)} 
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
                ESCANEA Y VOTA
              </div>

              {/* Instructions */}
              <div style={{
                fontSize: '13pt',
                color: '#64748b',
                marginTop: '0.2in',
                lineHeight: 1.5,
                textAlign: 'center'
              }}>
                Abre la camara de tu celular<br/>
                y escanea el codigo QR para calificar
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
