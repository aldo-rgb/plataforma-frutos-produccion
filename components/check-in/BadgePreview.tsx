'use client';

import { useRef, useState, useEffect } from 'react';
import { Printer, Share2, Nfc, X, Smartphone, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface BadgePreviewProps {
  participant: {
    id: number;
    name: string;
    nickname?: string;
    role: string;
    photoUrl?: string;
    referralCode?: string;
  };
  organization: {
    name: string;
    logoUrl?: string;
    brandColor?: string;
  };
  product: {
    name: string;
  };
  onPrint?: () => void;
  showButtons?: boolean;
}

// Determinar si es un rol que usa color rojo
const isRedRole = (role: string): boolean => {
  const redRoles = ['GAME_CHANGER', 'GAMECHANGER', 'COORDINATOR', 'COORDINADOR', 
    'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'LIDER'];
  return redRoles.some(r => role.toUpperCase().includes(r));
};

// Obtener el nombre a mostrar (solo primer nombre)
const getDisplayName = (name: string): string => {
  const firstName = name.split(' ')[0];
  return firstName.toUpperCase();
};

// Obtener etiqueta de rol legible
const getRoleLabel = (role: string): string => {
  const roleMap: Record<string, string> = {
    'PARTICIPANTE': 'PARTICIPANTE',
    'BASIC': 'PARTICIPANTE',
    'GAME_CHANGER': 'GAME CHANGER',
    'GAMECHANGER': 'GAME CHANGER',
    'COORDINATOR': 'COORDINADOR',
    'COORDINADOR': 'COORDINADOR',
    'COORDINATOR_BASIC': 'COORDINADOR',
    'COORDINATOR_ADVANCED': 'COORDINADOR',
    'TRAINER': 'TRAINER',
    'LIDER': 'LÍDER',
    'ADVANCED': 'AVANZADO',
    'PL': 'LIDERATO'
  };
  return roleMap[role.toUpperCase()] || role.toUpperCase();
};

export default function BadgePreview({ 
  participant, 
  organization, 
  product, 
  onPrint,
  showButtons = true 
}: BadgePreviewProps) {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRed = isRedRole(participant.role);
  const textColor = isRed ? '#DC2626' : '#000000'; // Rojo o Negro
  
  // Usar brandColor de la organización o fallback a azul
  const orgColor = organization.brandColor || '#1E40AF';
  const topBarColor = isRed ? '#DC2626' : orgColor; // Rojo para especiales, brandColor para normales
  const bottomBarColor = orgColor; // Siempre usa el brandColor

  // Verificar soporte NFC
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  // Cargar logo de la organización
  useEffect(() => {
    if (organization.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setLogoImage(img);
      img.onerror = () => setLogoImage(null);
      img.src = organization.logoUrl;
    }
  }, [organization.logoUrl]);

  // Generar QR Code con el referralCode del participante
  const getQRData = () => {
    return participant.referralCode || `USER:${participant.id}`;
  };

  // Dimensiones del gafete HORIZONTAL
  const BADGE_WIDTH = 400;
  const BADGE_HEIGHT = 250;

  // Generar el FRENTE del gafete HORIZONTAL con logo
  const generateFrontCanvas = async (): Promise<string | null> => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = BADGE_WIDTH;
    canvas.height = BADGE_HEIGHT;

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);

    // Barra superior con color según rol
    const topBarHeight = 50;
    ctx.fillStyle = topBarColor;
    ctx.fillRect(0, 0, BADGE_WIDTH, topBarHeight);

    // Logo de la organización (lado izquierdo de la barra)
    if (logoImage) {
      const logoSize = 35;
      const logoX = 10;
      const logoY = (topBarHeight - logoSize) / 2;
      
      // Dibujar logo sin fondo
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    }

    // Nombre de la organización
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(organization.name.toUpperCase(), BADGE_WIDTH / 2, 32);

    // NOMBRE ENORME del participante (centrado)
    const displayName = getDisplayName(participant.name);
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    // Empezar con fuente muy grande y reducir hasta que quepa
    let fontSize = 80;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    while (ctx.measureText(displayName).width > BADGE_WIDTH - 40 && fontSize > 30) {
      fontSize -= 5;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    }
    
    // Centrar el nombre en el área principal
    const nameY = topBarHeight + (BADGE_HEIGHT - topBarHeight - 50) / 2 + fontSize / 3;
    ctx.fillText(displayName, BADGE_WIDTH / 2, nameY);

    // Barra inferior con el rol (usa brandColor)
    const bottomBarHeight = 45;
    ctx.fillStyle = bottomBarColor;
    ctx.fillRect(0, BADGE_HEIGHT - bottomBarHeight, BADGE_WIDTH, bottomBarHeight);

    // Rol del participante
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(getRoleLabel(participant.role), BADGE_WIDTH / 2, BADGE_HEIGHT - 15);

    return canvas.toDataURL('image/png');
  };

  // Generar el REVERSO del gafete HORIZONTAL
  const generateBackCanvas = async (): Promise<string | null> => {
    const canvas = backCanvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = BADGE_WIDTH;
    canvas.height = BADGE_HEIGHT;

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);

    // Barra superior (usa brandColor)
    const topBarHeight = 50;
    ctx.fillStyle = bottomBarColor;
    ctx.fillRect(0, 0, BADGE_WIDTH, topBarHeight);

    // Logo en reverso también
    if (logoImage) {
      const logoSize = 35;
      const logoX = 10;
      const logoY = (topBarHeight - logoSize) / 2;
      
      // Dibujar logo sin fondo
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    }

    // Nombre de la organización
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(organization.name.toUpperCase(), BADGE_WIDTH / 2, 32);

    // Layout horizontal: QR a la izquierda, info a la derecha
    const contentY = topBarHeight + 20;

    // QR Code (lado izquierdo)
    try {
      const qrData = getQRData();
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });

      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrSize = 120;
      const qrX = 30;
      const qrY = contentY + 10;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error('Error generando QR:', error);
    }

    // Información a la derecha del QR
    const infoX = 180;

    // Nombre completo
    ctx.fillStyle = '#1E40AF';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    
    // Ajustar si es muy largo
    let nameFont = 22;
    ctx.font = `bold ${nameFont}px Arial, sans-serif`;
    while (ctx.measureText(participant.name).width > 200 && nameFont > 14) {
      nameFont -= 2;
      ctx.font = `bold ${nameFont}px Arial, sans-serif`;
    }
    ctx.fillText(participant.name, infoX, contentY + 40);

    // Referral Code
    ctx.fillStyle = '#6B7280';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(getQRData(), infoX, contentY + 70);

    // Rol
    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText(getRoleLabel(participant.role), infoX, contentY + 100);

    return canvas.toDataURL('image/png');
  };

  // Función para imprimir gafete (frente arriba, reverso espejado abajo - para doblar)
  const handlePrintBadge = async () => {
    const frontDataUrl = await generateFrontCanvas();
    const backDataUrl = await generateBackCanvas();
    
    if (!frontDataUrl || !backDataUrl) return;

    if (onPrint) {
      onPrint();
    }

    // Crear iframe oculto para impresión (evita bloqueo de popups)
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentWindow?.document;
    if (!printDocument) {
      alert('No se pudo abrir la ventana de impresión');
      document.body.removeChild(printFrame);
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gafete - ${participant.name}</title>
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
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 8.5in;
              height: 11in;
            }
            .badge-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0;
            }
            .badge {
              width: 4in;
              height: 2.5in;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .badge img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .badge.flipped {
              transform: rotate(180deg);
            }
            .fold-line {
              width: 4.5in;
              height: 0;
              border-top: 1px dashed #ccc;
            }
            @media print {
              body {
                width: 8.5in;
                height: 11in;
                display: flex;
                align-items: center;
                justify-content: center;
              }
            }
          </style>
        </head>
        <body>
          <div class="badge-container">
            <!-- FRENTE (arriba) -->
            <div class="badge">
              <img src="${frontDataUrl}" alt="Frente" />
            </div>
            
            <!-- Línea de doblez -->
            <div class="fold-line"></div>
            
            <!-- REVERSO rotado 180° (abajo) - al doblar queda correcto -->
            <div class="badge flipped">
              <img src="${backDataUrl}" alt="Reverso" />
            </div>
          </div>
        </body>
      </html>
    `);
    printDocument.close();

    // Esperar a que las imágenes carguen y luego imprimir
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      
      // Remover iframe después de imprimir
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 500);
  };

  // Función para descargar el gafete
  const handleDownloadBadge = async () => {
    const frontDataUrl = await generateFrontCanvas();
    const backDataUrl = await generateBackCanvas();
    
    if (!frontDataUrl || !backDataUrl) return;

    if (onPrint) {
      onPrint();
    }

    // Descargar frente
    const linkFront = document.createElement('a');
    linkFront.download = `gafete-${participant.name.replace(/\s+/g, '-').toLowerCase()}-frente.png`;
    linkFront.href = frontDataUrl;
    linkFront.click();

    // Descargar reverso
    setTimeout(() => {
      const linkBack = document.createElement('a');
      linkBack.download = `gafete-${participant.name.replace(/\s+/g, '-').toLowerCase()}-reverso.png`;
      linkBack.href = backDataUrl;
      linkBack.click();
    }, 500);
  };

  // Función para compartir el gafete
  const handleShareBadge = async () => {
    const frontDataUrl = await generateFrontCanvas();
    if (!frontDataUrl) return;

    // Convertir data URL a blob
    const response = await fetch(frontDataUrl);
    const blob = await response.blob();
    const file = new File([blob], `gafete-${participant.name}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Gafete de ${participant.name}`,
          text: `Gafete para ${participant.name} - ${organization.name}`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback: copiar link o descargar
        handleDownloadBadge();
      }
    } else {
      // Fallback: descargar
      handleDownloadBadge();
    }
  };

  // Datos para NFC
  const getNFCData = () => {
    return participant.referralCode || `USER:${participant.id}`;
  };

  // Copiar datos NFC al portapapeles
  const handleCopyNFCData = async () => {
    try {
      await navigator.clipboard.writeText(getNFCData());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  // Grabar NFC directamente
  const handleWriteNFC = async () => {
    if (!('NDEFReader' in window)) {
      alert('Tu dispositivo no soporta NFC');
      return;
    }

    setNfcStatus('writing');

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [
          {
            recordType: 'text',
            data: getNFCData()
          }
        ]
      });
      setNfcStatus('success');
      setTimeout(() => {
        setNfcStatus('idle');
        setShowNFCModal(false);
        if (onPrint) onPrint();
      }, 2000);
    } catch (error: any) {
      console.error('Error writing NFC:', error);
      setNfcStatus('error');
      setTimeout(() => setNfcStatus('idle'), 3000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Canvas ocultos para generar los gafetes */}
      <canvas ref={frontCanvasRef} className="hidden" />
      <canvas ref={backCanvasRef} className="hidden" />

      {/* Preview visual del gafete HORIZONTAL - Frente y Reverso apilados */}
      <div className="flex flex-col gap-4 items-center">
        {/* FRENTE */}
        <div className="flex flex-col items-center">
          <p className="text-slate-400 text-xs mb-2">FRENTE</p>
          <div 
            className="bg-white rounded-lg overflow-hidden shadow-xl flex flex-col"
            style={{ width: '320px', height: '200px' }}
          >
            {/* Barra superior con logo */}
            <div 
              className="py-2 px-3 flex items-center gap-2"
              style={{ backgroundColor: topBarColor }}
            >
              {/* Logo */}
              {organization.logoUrl ? (
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img 
                    src={organization.logoUrl} 
                    alt={organization.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{organization.name.charAt(0)}</span>
                </div>
              )}
              <p className="text-white text-sm font-bold truncate">
                {organization.name.toUpperCase()}
              </p>
            </div>

            {/* Nombre ENORME en el centro */}
            <div className="flex-1 flex items-center justify-center bg-white">
              <h2 
                className="font-black text-center px-2"
                style={{ 
                  color: textColor,
                  fontSize: getDisplayName(participant.name).length > 10 ? '42px' : getDisplayName(participant.name).length > 7 ? '52px' : '64px',
                  lineHeight: '1',
                  letterSpacing: '-2px'
                }}
              >
                {getDisplayName(participant.name)}
              </h2>
            </div>

            {/* Barra inferior con rol (usa brandColor) */}
            <div className="py-2" style={{ backgroundColor: bottomBarColor }}>
              <p className="text-white text-sm font-bold text-center">
                {getRoleLabel(participant.role)}
              </p>
            </div>
          </div>
        </div>

        {/* REVERSO */}
        <div className="flex flex-col items-center">
          <p className="text-slate-400 text-xs mb-2">REVERSO</p>
          <div 
            className="bg-white rounded-lg overflow-hidden shadow-xl flex flex-col"
            style={{ width: '320px', height: '200px' }}
          >
            {/* Barra superior con logo (usa brandColor) */}
            <div className="py-2 px-3 flex items-center gap-2" style={{ backgroundColor: bottomBarColor }}>
              {organization.logoUrl ? (
                <div className="w-8 h-8 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img 
                    src={organization.logoUrl} 
                    alt={organization.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{organization.name.charAt(0)}</span>
                </div>
              )}
              <p className="text-white text-sm font-bold truncate">
                {organization.name.toUpperCase()}
              </p>
            </div>

            {/* QR e info - layout horizontal */}
            <div className="flex-1 flex items-center px-4 bg-white">
              {/* QR lado izquierdo */}
              <div className="bg-gray-100 p-2 rounded mr-4 flex-shrink-0">
                <div className="w-20 h-20 bg-white flex items-center justify-center border">
                  <span className="text-3xl">📱</span>
                </div>
              </div>
              {/* Info lado derecho */}
              <div className="flex-1 min-w-0">
                <p className="text-blue-800 text-base font-bold truncate">
                  {participant.name}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {getQRData()}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: textColor }}>
                  {getRoleLabel(participant.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <p className="text-slate-500 text-xs text-center mt-4">
        ID: {participant.id}
      </p>

      {/* Botones de acción: Imprimir - Compartir - Grabar */}
      {showButtons && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={handlePrintBadge}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold rounded-xl transition-all"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button
            onClick={handleShareBadge}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            <Share2 size={20} />
            Compartir
          </button>
          <button
            onClick={() => setShowNFCModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-semibold rounded-xl transition-all"
          >
            <Nfc size={20} />
            Grabar
          </button>
        </div>
      )}

      {/* Modal de NFC */}
      {showNFCModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 relative">
            {/* Cerrar */}
            <button 
              onClick={() => setShowNFCModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                <Nfc className="text-purple-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Grabar NFC</h3>
              <p className="text-slate-400 text-sm mt-1">
                Graba el código de {participant.name} en una tarjeta NFC
              </p>
            </div>

            {/* Datos a grabar */}
            <div className="bg-slate-900 rounded-xl p-4 mb-6">
              <p className="text-slate-400 text-xs mb-2">Datos a grabar:</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-purple-400 font-mono text-lg flex-1 truncate">
                  {getNFCData()}
                </code>
                <button
                  onClick={handleCopyNFCData}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  title="Copiar"
                >
                  {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-300" />}
                </button>
              </div>
              {copied && (
                <p className="text-green-400 text-xs mt-2">¡Copiado al portapapeles!</p>
              )}
            </div>

            {/* Opción 1: Grabar en otro dispositivo */}
            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-slate-400 mt-1" size={24} />
                <div>
                  <p className="text-white font-semibold">Grabar en otro dispositivo</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Copia el código y usa una app de NFC en otro dispositivo para grabarlo en la tarjeta.
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Apps recomendadas: NFC Tools, TagWriter
                  </p>
                </div>
              </div>
            </div>

            {/* Opción 2: Grabar aquí */}
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <Nfc className="text-purple-400 mt-1" size={24} />
                <div>
                  <p className="text-white font-semibold">Grabar desde este dispositivo</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {nfcSupported 
                      ? 'Tu dispositivo soporta NFC. Acerca la tarjeta y presiona el botón.'
                      : 'Tu dispositivo no soporta NFC. Usa la opción de arriba.'}
                  </p>
                </div>
              </div>

              {nfcSupported && (
                <button
                  onClick={handleWriteNFC}
                  disabled={nfcStatus === 'writing'}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    nfcStatus === 'success' 
                      ? 'bg-green-500 text-white' 
                      : nfcStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : nfcStatus === 'writing'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {nfcStatus === 'writing' && (
                    <>
                      <Nfc size={20} className="animate-pulse" />
                      Acerca la tarjeta NFC...
                    </>
                  )}
                  {nfcStatus === 'success' && (
                    <>
                      <Check size={20} />
                      ¡Grabado exitosamente!
                    </>
                  )}
                  {nfcStatus === 'error' && (
                    <>
                      <X size={20} />
                      Error al grabar. Intenta de nuevo.
                    </>
                  )}
                  {nfcStatus === 'idle' && (
                    <>
                      <Nfc size={20} />
                      Grabar NFC
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Botón cancelar */}
            <button
              onClick={() => setShowNFCModal(false)}
              className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
