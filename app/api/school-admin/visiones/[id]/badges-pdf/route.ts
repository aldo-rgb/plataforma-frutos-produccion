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
const BADGE_WIDTH = 252; // 3.5 inches
const BADGE_HEIGHT = 180; // 2.5 inches
const MARGIN = 36; // 0.5 inch
const BADGES_PER_ROW = 2;
const BADGES_PER_COL = 4;
const BADGES_PER_PAGE = BADGES_PER_ROW * BADGES_PER_COL;

interface Participant {
  id: number;
  nombre: string;
  email: string;
  referralCode: string | null;
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
          },
        },
      },
    });

    const participants: Participant[] = enrollments
      .map(e => e.Usuario_vision_enrollments_userIdToUsuario)
      .filter((p): p is Participant => p !== null);

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
    
    // Default role based on level
    const role = level === 'BASIC' ? 'PARTICIPANTE' : 'GAMECHANGER';

    // Generate PDF with jsPDF
    const pdfBuffer = await generateBadgesPDF(
      participants,
      orgName,
      brandColor,
      logoUrl,
      role,
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

async function generateBadgesPDF(
  participants: Participant[],
  orgName: string,
  brandColor: string,
  logoUrl: string | null | undefined,
  role: string,
  visionName: string
): Promise<Buffer> {
  // Create jsPDF document (Letter size: 215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt', // points (72 per inch)
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

  // Calculate total pages needed
  const totalFrontPages = Math.ceil(participants.length / BADGES_PER_PAGE);

  // Parse colors
  const accentColor = hexToRgb(brandColor);
  const darkBlue: [number, number, number] = [0, 82, 147];

  // ====== INTERLEAVED PAGES: Front then Back for each page ======
  for (let pageNum = 0; pageNum < totalFrontPages; pageNum++) {
    // Add new page if not the first
    if (pageNum > 0) doc.addPage();

    const startIdx = pageNum * BADGES_PER_PAGE;
    const endIdx = Math.min(startIdx + BADGES_PER_PAGE, participants.length);
    const pageParticipants = participants.slice(startIdx, endIdx);

    // ====== FRONT PAGE (Names) ======
    for (let i = 0; i < pageParticipants.length; i++) {
      const participant = pageParticipants[i];
      const col = i % BADGES_PER_ROW;
      const row = Math.floor(i / BADGES_PER_ROW);
      
      const x = MARGIN + col * (BADGE_WIDTH + 10);
      const y = MARGIN + row * (BADGE_HEIGHT + 10);

      drawBadgeFront(doc, x, y, participant, orgName, accentColor, darkBlue, role);
    }

    // ====== BACK PAGE (QR Codes) - immediately after front ======
    doc.addPage();

    for (let i = 0; i < pageParticipants.length; i++) {
      const participant = pageParticipants[i];
      const col = i % BADGES_PER_ROW;
      const row = Math.floor(i / BADGES_PER_ROW);
      
      // Mirror horizontally for duplex printing
      const mirroredCol = BADGES_PER_ROW - 1 - col;
      const x = MARGIN + mirroredCol * (BADGE_WIDTH + 10);
      const y = MARGIN + row * (BADGE_HEIGHT + 10);

      const qrDataUrl = qrCodes.get(participant.id);
      drawBadgeBack(doc, x, y, participant, orgName, accentColor, qrDataUrl);
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
  darkBlue: [number, number, number],
  role: string
) {
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'F');
  
  // Top accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y, BADGE_WIDTH, 50, 'F');
  
  // Dark blue diagonal stripe (triangle)
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.triangle(
    x + BADGE_WIDTH - 80, y,
    x + BADGE_WIDTH, y,
    x + BADGE_WIDTH, y + 60,
    'F'
  );

  // Bottom curved accent (simplified as rectangle)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y + BADGE_HEIGHT - 35, BADGE_WIDTH, 35, 'F');

  // Organization name at top
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName.toUpperCase(), x + 10, y + 18);
  
  // Participant first name (as large as possible)
  const firstName = participant.nombre.split(' ')[0].toUpperCase();
  doc.setTextColor(220, 38, 38); // Red
  doc.setFont('helvetica', 'bold');
  
  // Calculate optimal font size to fit the badge width
  const maxWidth = BADGE_WIDTH - 20; // 10px padding on each side
  let fontSize = 72; // Start with very large font
  doc.setFontSize(fontSize);
  let nameWidth = doc.getTextWidth(firstName);
  
  // Reduce font size until it fits
  while (nameWidth > maxWidth && fontSize > 20) {
    fontSize -= 2;
    doc.setFontSize(fontSize);
    nameWidth = doc.getTextWidth(firstName);
  }
  
  // Center the name vertically in the available space (between top bar and bottom bar)
  const verticalCenter = y + 55 + (BADGE_HEIGHT - 55 - 35) / 2 + fontSize / 3;
  doc.text(firstName, x + (BADGE_WIDTH - nameWidth) / 2, verticalCenter);
  
  // Role text at bottom
  const roleText = role === 'GAMECHANGER' ? 'GAME CHANGER' : 
                   role === 'STAFF' ? 'STAFF' : 
                   role === 'COACH' ? 'COACH' : 'PARTICIPANTE';
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const roleWidth = doc.getTextWidth(roleText);
  doc.text(roleText, x + (BADGE_WIDTH - roleWidth) / 2, y + BADGE_HEIGHT - 12);
  
  // Cut line (dashed border)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'S');
  doc.setLineDashPattern([], 0);
}

function drawBadgeBack(
  doc: jsPDF,
  x: number,
  y: number,
  participant: Participant,
  orgName: string,
  accentColor: [number, number, number],
  qrDataUrl: string | undefined
) {
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'F');
  
  // Top accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(x, y, BADGE_WIDTH, 30, 'F');
  
  // Organization name at top
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const orgWidth = doc.getTextWidth(orgName.toUpperCase());
  doc.text(orgName.toUpperCase(), x + (BADGE_WIDTH - orgWidth) / 2, y + 18);
  
  // QR Code in center
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', x + (BADGE_WIDTH - 100) / 2, y + 40, 100, 100);
    } catch (err) {
      console.error('Error adding QR to PDF:', err);
    }
  }
  
  // Participant name below QR
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const nameWidth = doc.getTextWidth(participant.nombre);
  doc.text(participant.nombre, x + (BADGE_WIDTH - nameWidth) / 2, y + 150);
  
  // Referral code
  if (participant.referralCode) {
    doc.setTextColor(102, 102, 102);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const codeWidth = doc.getTextWidth(participant.referralCode);
    doc.text(participant.referralCode, x + (BADGE_WIDTH - codeWidth) / 2, y + 165);
  }
  
  // Cut line (dashed border)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.rect(x, y, BADGE_WIDTH, BADGE_HEIGHT, 'S');
  doc.setLineDashPattern([], 0);
}
