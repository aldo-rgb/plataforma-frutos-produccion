import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { VisionLevel } from '@prisma/client';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'ADMINISTRADOR'];

// Badge dimensions in points (72 per inch)
// Formato: 4 badges plegables por hoja carta (2 columnas x 2 filas)
// Cada badge plegable = frente + reverso (pegados verticalmente)
// MAXIMIZADO para llenar la hoja
const BADGE_WIDTH = 280; // ~3.9 inches (máximo para 2 columnas)
const BADGE_HEIGHT = 180; // ~2.5 inches por lado (máximo para 2 filas plegables)
const FOLDABLE_BADGE_HEIGHT = BADGE_HEIGHT * 2; // 5 inches total (frente + reverso)
const MARGIN_X = 18; // 0.25 inch horizontal margin
const MARGIN_Y = 18; // 0.25 inch vertical margin
const GAP_X = 16; // Gap between columns
const GAP_Y = 16; // Gap between rows
const BADGES_PER_ROW = 2;
const BADGES_PER_COL = 2; // 2 filas de badges plegables
const BADGES_PER_PAGE = BADGES_PER_ROW * BADGES_PER_COL; // 4 badges por página

interface Participant {
  id: number;
  nombre: string;
  email: string;
  referralCode: string | null;
  rol: string; // Rol del usuario
}

/**
 * GET /api/school-admin/visiones/[id]/badges-pdf
 * Genera PDF de gafetes para participantes de una visión
 * Query params: level, userIds (comma-separated)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level') || 'BASIC';
    const level = levelParam as VisionLevel;
    const userIdsParam = searchParams.get('userIds');
    const userIds = userIdsParam ? userIdsParam.split(',').map(id => parseInt(id)) : null;

    // Get vision with organization info
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Organization: {
          select: {
            name: true,
            logoUrl: true,
            brandColor: true,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    }

    // Get enrollments with user data
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
        ...(userIds && { userId: { in: userIds } }),
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            referralCode: true,
            rol: true, // Incluir rol del usuario
          },
        },
      },
    });

    // Obtener el SchoolProduct para este nivel y visión para incluir Trainer y Coordinador
    const schoolProduct = await prisma.schoolProduct.findFirst({
      where: {
        visionId,
        levelType: level === 'BASIC' ? 'BASIC' : level === 'ADVANCED' ? 'ADVANCED' : 'PL',
        isActive: true,
      },
      include: {
        Trainer: {
          select: {
            id: true,
            nombre: true,
            email: true,
            referralCode: true,
            rol: true,
          },
        },
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true,
            referralCode: true,
            rol: true,
          },
        },
      },
    });

    // Mapear participantes con su rol determinado por nivel o rol de usuario
    const participants: Participant[] = [];
    
    // Agregar Trainer primero (si existe y no está filtrado por userIds)
    if (schoolProduct?.Trainer && (!userIds || userIds.includes(schoolProduct.Trainer.id))) {
      participants.push({
        id: schoolProduct.Trainer.id,
        nombre: schoolProduct.Trainer.nombre,
        email: schoolProduct.Trainer.email,
        referralCode: schoolProduct.Trainer.referralCode,
        rol: 'TRAINER',
      });
    }
    
    // Agregar Coordinador segundo (si existe y no está filtrado por userIds)
    if (schoolProduct?.Coordinator && (!userIds || userIds.includes(schoolProduct.Coordinator.id))) {
      // Evitar duplicado si el coordinador también es trainer
      if (!participants.find(p => p.id === schoolProduct.Coordinator!.id)) {
        participants.push({
          id: schoolProduct.Coordinator.id,
          nombre: schoolProduct.Coordinator.nombre,
          email: schoolProduct.Coordinator.email,
          referralCode: schoolProduct.Coordinator.referralCode,
          rol: 'COORDINADOR',
        });
      }
    }

    // Obtener los Game Changers reales de esta visión (VisionGameChanger) con sus datos
    const visionGameChangers = await prisma.visionGameChanger.findMany({
      where: { 
        visionId,
        level: level, // Filtrar por nivel
      },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            referralCode: true,
          }
        }
      }
    });
    const gcUserIds = new Set(visionGameChangers.map(gc => gc.gameChangerId));

    // Agregar Game Changers al principio (después del trainer/coordinador)
    for (const gc of visionGameChangers) {
      const gcUser = gc.Usuario_VisionGameChanger_gameChangerIdToUsuario;
      // Solo agregar si no está filtrado por userIds y no es duplicado
      if ((!userIds || userIds.includes(gcUser.id)) && !participants.find(p => p.id === gcUser.id)) {
        participants.push({
          id: gcUser.id,
          nombre: gcUser.nombre,
          email: gcUser.email,
          referralCode: gcUser.referralCode,
          rol: 'GAME CHANGER',
        });
      }
    }

    // Agregar enrollments (Participantes)
    enrollments.forEach(e => {
      const enrolledUser = e.Usuario_vision_enrollments_userIdToUsuario;
      if (!enrolledUser) return;
      
      // Evitar duplicados (por si el trainer o coordinador también tiene enrollment)
      if (participants.find(p => p.id === enrolledUser.id)) return;
      
      // Determinar rol: 
      // - ROJO: Solo GC real (VisionGameChanger) y Trainer/Coordinador (staff)
      // - NEGRO: Participantes normales (incluyendo los de ADVANCED/PL que no son GC)
      let displayRole = 'PARTICIPANTE';
      const userRol = enrolledUser.rol?.toUpperCase() || '';
      
      // Verificar si es GC real de esta visión
      if (gcUserIds.has(enrolledUser.id)) {
        displayRole = 'GAME CHANGER';
      }
      // Roles de staff que van en rojo
      else if (['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINATOR'].includes(userRol)) {
        displayRole = 'COORDINADOR';
      } else if (['TRAINER', 'COACH', 'MENTOR'].includes(userRol)) {
        displayRole = 'TRAINER';
      }
      // Los participantes de ADVANCED/PL que NO son GC real, siguen siendo PARTICIPANTE (negro)
      // No se cambia a GAME CHANGER solo por estar en ADVANCED/PL
      
      participants.push({
        id: enrolledUser.id,
        nombre: enrolledUser.nombre,
        email: enrolledUser.email,
        referralCode: enrolledUser.referralCode,
        rol: displayRole,
      });
    });

    if (participants.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay participantes para generar gafetes' 
      }, { status: 400 });
    }

    // Organization branding
    const orgName = vision.Organization?.name || 'Impacto Cuántico';
    const brandColor = vision.Organization?.brandColor || '#00BFFF'; // Cyan default
    const logoUrl = vision.Organization?.logoUrl;

    // Generate PDF with jsPDF
    const pdfBuffer = await generateBadgesPDF(
      participants,
      orgName,
      brandColor,
      logoUrl,
      vision.nombre
    );

    // Return PDF as Uint8Array
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="gafetes-${vision.nombre}-${level}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating badges PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar PDF' },
      { status: 500 }
    );
  }
}

// Helper: Convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 191, 255]; // Default cyan
}

// Helper: Get display name (first name only)
function getDisplayName(fullName: string): string {
  return fullName.split(' ')[0].toUpperCase();
}

// Helper: Get role label
function getRoleLabel(role: string): string {
  switch (role) {
    case 'COORDINADOR': return 'COORDINADOR';
    case 'GAME CHANGER': return 'GAME CHANGER';
    case 'GAMECHANGER': return 'GAME CHANGER';
    case 'TRAINER': return 'TRAINER';
    default: return 'PARTICIPANTE';
  }
}

// Helper: Check if role is EQUIPO (should be red)
// EQUIPO = Trainer, Coordinador, Game Changer
// PARTICIPANTE = letra negra
function isRedRole(role: string): boolean {
  return ['COORDINADOR', 'GAME CHANGER', 'GAMECHANGER', 'TRAINER'].includes(role);
}

// Load logo as base64 from URL
async function loadLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

async function generateBadgesPDF(
  participants: Participant[],
  orgName: string,
  brandColor: string,
  logoUrl: string | null | undefined,
  visionName: string
): Promise<Buffer> {
  // Create jsPDF document (Letter size: 612 x 792 points)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  // Pre-generate all QR codes
  const qrCodes: Map<number, string> = new Map();
  for (const participant of participants) {
    const qrData = participant.referralCode || `USER-${participant.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    qrCodes.set(participant.id, qrDataUrl);
  }

  // Load logo if available
  let logoBase64: string | null = null;
  if (logoUrl) {
    logoBase64 = await loadLogoAsBase64(logoUrl);
  }

  // Calculate total pages needed (4 badges per page)
  const totalPages = Math.ceil(participants.length / BADGES_PER_PAGE);

  // Parse brand color
  const accentColor = hexToRgb(brandColor);

  // Generate pages with foldable badges
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) doc.addPage();

    const startIdx = pageNum * BADGES_PER_PAGE;
    const endIdx = Math.min(startIdx + BADGES_PER_PAGE, participants.length);
    const pageParticipants = participants.slice(startIdx, endIdx);

    // Draw each foldable badge (front + back stacked vertically)
    for (let i = 0; i < pageParticipants.length; i++) {
      const participant = pageParticipants[i];
      const col = i % BADGES_PER_ROW;
      const row = Math.floor(i / BADGES_PER_ROW);

      const x = MARGIN_X + col * (BADGE_WIDTH + GAP_X);
      const y = MARGIN_Y + row * (FOLDABLE_BADGE_HEIGHT + GAP_Y);

      const qrDataUrl = qrCodes.get(participant.id);

      // Draw front (top half)
      drawBadgeFront(doc, x, y, participant, orgName, accentColor, logoBase64);

      // Draw back (bottom half, rotated 180°)
      drawBadgeBackRotated(doc, x, y + BADGE_HEIGHT, participant, orgName, accentColor, logoBase64, qrDataUrl);

      // Fold line (dashed line between front and back)
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([4, 4], 0);
      doc.line(x, y + BADGE_HEIGHT, x + BADGE_WIDTH, y + BADGE_HEIGHT);
      doc.setLineDashPattern([], 0);
    }
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function drawBadgeFront(
  doc: jsPDF,
  x: number,
  y: number,
  participant: Participant,
  orgName: string,
  accentColor: [number, number, number],
  logoBase64: string | null
) {
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'F');

  // Top bar with brand color
  const topBarHeight = 42;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y, BADGE_WIDTH, topBarHeight, 'F');

  // Logo in top bar (if available)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', x + 10, y + 6, 30, 30);
    } catch (err) {
      console.error('Error adding logo:', err);
    }
  }

  // Organization name in top bar
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName.toUpperCase(), x + (logoBase64 ? 48 : 12), y + 27);

  // Participant first name (LARGE)
  const displayName = getDisplayName(participant.nombre);
  
  // Color based on role: black for PARTICIPANTE, red for others
  const isRed = isRedRole(participant.rol);
  if (isRed) {
    doc.setTextColor(220, 38, 38); // Red
  } else {
    doc.setTextColor(0, 0, 0); // Black
  }
  
  doc.setFont('helvetica', 'bold');

  // Calculate optimal font size - start bigger
  const maxWidth = BADGE_WIDTH - 20;
  let fontSize = 72;
  doc.setFontSize(fontSize);
  let nameWidth = doc.getTextWidth(displayName);

  while (nameWidth > maxWidth && fontSize > 24) {
    fontSize -= 2;
    doc.setFontSize(fontSize);
    nameWidth = doc.getTextWidth(displayName);
  }

  // Center the name
  const nameY = y + topBarHeight + (BADGE_HEIGHT - topBarHeight - 36) / 2 + fontSize / 3;
  doc.text(displayName, x + (BADGE_WIDTH - nameWidth) / 2, nameY);

  // Bottom bar with role
  const bottomBarHeight = 34;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y + BADGE_HEIGHT - bottomBarHeight, BADGE_WIDTH, bottomBarHeight, 'F');

  // Role text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const roleText = getRoleLabel(participant.rol);
  const roleWidth = doc.getTextWidth(roleText);
  doc.text(roleText, x + (BADGE_WIDTH - roleWidth) / 2, y + BADGE_HEIGHT - 11);

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'S');
}

function drawBadgeBackRotated(
  doc: jsPDF,
  x: number,
  y: number,
  participant: Participant,
  orgName: string,
  accentColor: [number, number, number],
  logoBase64: string | null,
  qrDataUrl: string | undefined
) {
  // Draw badge back ROTATED 180° - all content upside down
  // When folded, this will align correctly with the front
  
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'F');

  // Top bar (will be bottom when rotated/folded)
  const topBarHeight = 42;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y, BADGE_WIDTH, topBarHeight, 'F');

  // Logo in top bar - at right side
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', x + BADGE_WIDTH - 40, y + 6, 30, 30);
    } catch (err) {
      console.error('Error adding logo:', err);
    }
  }

  // Organization name in top bar - ROTATED 180° (positioned to not overlap with logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  // Position text away from logo (logo is at right, text starts from left of logo area)
  doc.text(orgName.toUpperCase(), x + BADGE_WIDTH - (logoBase64 ? 50 : 12), y + 27, { angle: 180 });

  // QR Code - larger size
  const qrSize = 95;
  const qrX = x + 15;
  const qrY = y + topBarHeight + 10;
  
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.error('Error adding QR:', err);
    }
  }

  // Info section - right side of QR - all text ROTATED 180°
  const infoX = x + BADGE_WIDTH - 15;
  const infoY = y + topBarHeight + 30;

  // Full name - rotated 180°
  const isRed = isRedRole(participant.rol);
  if (isRed) {
    doc.setTextColor(220, 38, 38); // Red
  } else {
    doc.setTextColor(30, 64, 175); // Dark blue
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  // Truncate name if too long
  let fullName = participant.nombre;
  const maxNameWidth = BADGE_WIDTH - qrSize - 50;
  while (doc.getTextWidth(fullName) > maxNameWidth && fullName.length > 10) {
    fullName = fullName.slice(0, -1);
  }
  doc.text(fullName, infoX, infoY, { angle: 180 });

  // Referral code - rotated 180°
  if (participant.referralCode) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(participant.referralCode, infoX, infoY + 18, { angle: 180 });
  }

  // Role label - rotated 180°
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(getRoleLabel(participant.rol), infoX, infoY + 38, { angle: 180 });

  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'S');
}
