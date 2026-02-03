import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

interface FlyerData {
  orgName: string;
  visionName: string;
  visionCity: string;
  fechaTexto: string;
  diasTexto: string;
  headline: string;
  ubicacionTexto: string;
  telefono: string;
  backgroundUrl: string;
  showUrgencyBadge: boolean;
  urgencyText: string;
}

export async function generarFlyerBasico(data: FlyerData): Promise<Buffer> {
  const {
    orgName = 'IMPACTO CUÁNTICO',
    visionName = 'VISIÓN 25',
    visionCity = 'MONTERREY',
    fechaTexto = '20 - 22 De Febrero',
    diasTexto = 'VIERNES A DOMINGO',
    headline = 'ROMPE TUS LÍMITES MENTALES Y TRANSFORMA TUS RESULTADOS EN 3 DÍAS.',
    ubicacionTexto = '',
    telefono = '',
    backgroundUrl,
    showUrgencyBadge = true,
    urgencyText = '¡CUPO LIMITADO!'
  } = data;

  // Configuración del lienzo
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Cargar y dibujar fondo
  if (backgroundUrl) {
    try {
      const background = await loadImage(backgroundUrl);
      ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
      // Fondo degradado por defecto
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a1628');
      gradient.addColorStop(0.5, '#1a365d');
      gradient.addColorStop(1, '#c9a227');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // Fondo degradado por defecto
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#1a365d');
    gradient.addColorStop(1, '#c9a227');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Overlay sutil para legibilidad
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, width, height);

  // ===== LOGO ORGANIZACIÓN (Arriba Izquierda) =====
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(orgName.toUpperCase(), 40, 50);
  
  ctx.font = '14px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.shadowBlur = 0;
  ctx.fillText('SER · HACER · TENER', 40, 72);

  // ===== BADGE ROJO "CUPO LIMITADO" (Esquina Superior Derecha) =====
  if (showUrgencyBadge) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(width - 180, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, 100);
    ctx.lineTo(width - 150, 100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡CUPO', width - 75, 40);
    ctx.fillText('LIMITADO!', width - 75, 65);
  }

  // ===== BADGE "ENTRENAMIENTO" =====
  const badgeWidth = 220;
  const badgeHeight = 35;
  const badgeX = (width - badgeWidth) / 2;
  const badgeY = 120;
  
  // Fondo del badge con ligera inclinación visual
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('ENTRENAMIENTO', width / 2, badgeY + 24);

  // ===== TÍTULO "BÁSICO CUÁNTICO" =====
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  
  // BÁSICO
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 85px Arial';
  ctx.fillText('BÁSICO', width / 2, 220);
  
  // CUÁNTICO
  ctx.fillStyle = '#38bdf8'; // Cyan
  ctx.font = 'bold 85px Arial';
  ctx.fillText('CUÁNTICO', width / 2, 300);
  
  ctx.shadowBlur = 0;

  // ===== CINTILLO AZUL "VISIÓN 25 | MONTERREY" =====
  const ribbonWidth = 340;
  const ribbonHeight = 40;
  const ribbonX = (width - ribbonWidth) / 2;
  const ribbonY = 320;
  
  ctx.fillStyle = 'rgba(30, 58, 138, 0.9)';
  ctx.beginPath();
  ctx.roundRect(ribbonX, ribbonY, ribbonWidth, ribbonHeight, 4);
  ctx.fill();
  
  ctx.fillStyle = '#fbbf24'; // Amber
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`${visionName.toUpperCase()} | ${visionCity.toUpperCase()}`, width / 2, ribbonY + 27);

  // ===== HEADLINE =====
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  
  // Dividir headline en líneas
  const words = headline.split(' ');
  let lines: string[] = [];
  let currentLine = '';
  const maxWidth = 800;
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  let headlineY = 400;
  for (const line of lines) {
    ctx.fillText(line.toUpperCase(), width / 2, headlineY);
    headlineY += 35;
  }
  
  ctx.shadowBlur = 0;

  // ===== FECHAS =====
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(fechaTexto, width / 2, 520);
  
  ctx.font = '18px Arial';
  ctx.fillStyle = '#e2e8f0';
  ctx.shadowBlur = 0;
  ctx.fillText(diasTexto, width / 2, 550);

  // ===== FOOTER =====
  // Fondo del footer
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, height - 60, width, 60);

  ctx.textAlign = 'left';
  
  // Ubicación
  if (ubicacionTexto) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '24px Arial';
    ctx.fillText('📍', 40, height - 25);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(ubicacionTexto, 75, height - 25);
  }
  
  // WhatsApp
  if (telefono) {
    ctx.fillStyle = '#25D366';
    ctx.font = '24px Arial';
    ctx.fillText('📱', width - 250, height - 25);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(telefono, width - 215, height - 25);
  }

  return canvas.toBuffer('image/png');
}
