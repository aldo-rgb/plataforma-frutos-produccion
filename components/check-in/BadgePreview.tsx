'use client';

import { useRef } from 'react';
import { Printer, Download, QrCode, User } from 'lucide-react';
import QRCode from 'qrcode';

interface BadgePreviewProps {
  participant: {
    id: number;
    name: string;
    nickname?: string;
    role: string;
    photoUrl?: string;
  };
  organization: {
    name: string;
    logoUrl?: string;
  };
  product: {
    name: string;
  };
  onPrint?: () => void;
  showButtons?: boolean;
}

export default function BadgePreview({ 
  participant, 
  organization, 
  product, 
  onPrint,
  showButtons = true 
}: BadgePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generar QR Code con datos del participante
  const generateQRData = () => {
    return JSON.stringify({
      id: participant.id,
      name: participant.name,
      role: participant.role,
      org: organization.name
    });
  };

  // Función para generar el canvas del gafete (sin abrir ventanas)
  const generateBadgeCanvas = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dimensiones del gafete (3.5" x 2.125" a 300 DPI = 1050 x 637.5px)
    // Usamos dimensiones proporcionales más manejables
    const width = 400;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Fondo con degradado
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Borde brillante
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Línea decorativa superior
    const topGradient = ctx.createLinearGradient(0, 0, width, 0);
    topGradient.addColorStop(0, '#06b6d4');
    topGradient.addColorStop(0.5, '#a855f7');
    topGradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = topGradient;
    ctx.fillRect(10, 10, width - 20, 8);

    // Logo de la organización o nombre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(organization.name.toUpperCase(), width / 2, 50);

    // Nombre del producto/entrenamiento
    ctx.fillStyle = '#06b6d4';
    ctx.font = '14px system-ui';
    ctx.fillText(product.name, width / 2, 75);

    // Foto del participante (círculo)
    const photoSize = 120;
    const photoX = width / 2 - photoSize / 2;
    const photoY = 100;

    // Círculo de fondo para la foto
    ctx.beginPath();
    ctx.arc(width / 2, photoY + photoSize / 2, photoSize / 2 + 5, 0, Math.PI * 2);
    const photoGradient = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
    photoGradient.addColorStop(0, '#06b6d4');
    photoGradient.addColorStop(1, '#a855f7');
    ctx.fillStyle = photoGradient;
    ctx.fill();

    // Dibujar foto si existe
    if (participant.photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = participant.photoUrl!;
        });

        // Clip circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();
      } catch {
        // Si falla la imagen, mostrar placeholder
        drawPlaceholder(ctx);
      }
    } else {
      drawPlaceholder(ctx);
    }

    function drawPlaceholder(context: CanvasRenderingContext2D) {
      context.beginPath();
      context.arc(width / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      context.fillStyle = '#334155';
      context.fill();
      context.fillStyle = '#64748b';
      context.font = '48px system-ui';
      context.textAlign = 'center';
      context.fillText('👤', width / 2, photoY + photoSize / 2 + 15);
    }

    // Nombre del participante
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    const displayName = participant.nickname 
      ? `${participant.name.split(' ')[0]} "${participant.nickname}"`
      : participant.name;
    
    // Truncar nombre si es muy largo
    const maxNameWidth = width - 40;
    let fontSize = 28;
    ctx.font = `bold ${fontSize}px system-ui`;
    while (ctx.measureText(displayName).width > maxNameWidth && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px system-ui`;
    }
    ctx.fillText(displayName, width / 2, 260);

    // Rol del participante
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(participant.role.toUpperCase(), width / 2, 290);

    // Separador
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 310);
    ctx.lineTo(width - 40, 310);
    ctx.stroke();

    // QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(generateQRData(), {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrSize = 150;
      const qrX = width / 2 - qrSize / 2;
      const qrY = 330;

      // Dibujar QR (ya tiene fondo blanco integrado)
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error('Error generando QR:', error);
    }

    // Texto inferior
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui';
    ctx.fillText('Escanea para verificar', width / 2, 510);

    // ID del participante
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText(`ID: ${participant.id}`, width / 2, 580);

    return canvas.toDataURL('image/png');
  };

  // Función para imprimir el gafete
  const handlePrintBadge = async () => {
    const dataUrl = await generateBadgeCanvas();
    if (!dataUrl) return;

    // Llamar al callback de impresión si existe
    if (onPrint) {
      onPrint();
    }

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gafete - ${participant.name}</title>
            <style>
              body {
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #f1f5f9;
              }
              img {
                max-width: 100%;
                height: auto;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              @media print {
                body { background: white; }
                img { 
                  width: 3.5in; 
                  box-shadow: none;
                }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Gafete" />
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Función para descargar el gafete (sin abrir ventana de impresión)
  const handleDownloadBadge = async () => {
    const dataUrl = await generateBadgeCanvas();
    if (!dataUrl) return;

    // Llamar al callback si existe
    if (onPrint) {
      onPrint();
    }

    const link = document.createElement('a');
    link.download = `gafete-${participant.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Canvas oculto para generar el gafete */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview visual del gafete */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/20">
        {/* Línea decorativa superior */}
        <div className="h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />

        <div className="p-6">
          {/* Logo/Nombre organización */}
          <div className="text-center mb-2">
            <h3 className="text-white font-bold text-lg tracking-wide">
              {organization.name}
            </h3>
            <p className="text-cyan-400 text-sm">{product.name}</p>
          </div>

          {/* Foto */}
          <div className="flex justify-center my-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur-sm" />
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
                {participant.photoUrl ? (
                  <img 
                    src={participant.photoUrl} 
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-500" />
                )}
              </div>
            </div>
          </div>

          {/* Nombre y rol */}
          <div className="text-center">
            <h2 className="text-white font-bold text-2xl">
              {participant.nickname 
                ? `${participant.name.split(' ')[0]} "${participant.nickname}"`
                : participant.name}
            </h2>
            <p className="text-purple-400 font-semibold mt-1 uppercase tracking-wider">
              {participant.role}
            </p>
          </div>

          {/* QR placeholder */}
          <div className="flex justify-center mt-6">
            <div className="bg-white p-3 rounded-lg">
              <QrCode className="w-24 h-24 text-slate-900" />
            </div>
          </div>

          <p className="text-slate-500 text-xs text-center mt-3">
            Escanea para verificar
          </p>

          {/* ID */}
          <p className="text-slate-600 text-xs text-center mt-4">
            ID: {participant.id}
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      {showButtons && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleDownloadBadge}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            <Download size={20} />
            Descargar
          </button>
          <button
            onClick={handlePrintBadge}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all"
          >
            <Printer size={20} />
            Imprimir
          </button>
        </div>
      )}
    </div>
  );
}
