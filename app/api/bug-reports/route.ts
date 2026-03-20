import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';
import fs from 'fs';
import path from 'path';

const REPORTS_FILE = path.join(process.cwd(), 'data', 'bug-reports.json');

// Asegurar que existe el directorio y archivo
function ensureReportsFile() {
  const dir = path.dirname(REPORTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_FILE)) {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
  }
}

function getReports() {
  ensureReportsFile();
  const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveReports(reports: any[]) {
  ensureReportsFile();
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// GET - Listar reportes (solo admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si es admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const reports = getReports();
    
    // Ordenar por fecha descendente
    reports.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Crear nuevo reporte
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { description, screenshotUrl, userName, userEmail, userId, pageUrl, userAgent, timestamp } = body;

    if (!description) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
    }

    const reports = getReports();
    
    const newReport = {
      id: `bug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description,
      screenshotUrl: screenshotUrl || null,
      userName: userName || 'Anónimo',
      userEmail: userEmail || null,
      userId: userId || null,
      pageUrl: pageUrl || null,
      userAgent: userAgent || null,
      status: 'pending', // pending, in_progress, resolved, dismissed
      createdAt: timestamp || new Date().toISOString(),
      resolvedAt: null,
      notes: null,
    };

    reports.push(newReport);
    saveReports(reports);

    // Enviar notificación por WhatsApp al equipo de soporte
    const SUPPORT_PHONE = '528119411741';
    const whatsappMessage = `🐛 *NUEVO REPORTE DE ERROR*

📝 *Descripción:*
${description}

👤 *Usuario:* ${userName || 'Anónimo'}
📧 *Email:* ${userEmail || 'No disponible'}
🔗 *Página:* ${pageUrl || 'No especificada'}
${screenshotUrl ? `📸 *Captura:* ${screenshotUrl}` : ''}

⏰ ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
🆔 ${newReport.id}`;

    try {
      await sendWhatsAppTextMessage(SUPPORT_PHONE, whatsappMessage);
      console.log('✅ WhatsApp notification sent for bug report:', newReport.id);
    } catch (whatsappError) {
      console.error('⚠️ Failed to send WhatsApp notification:', whatsappError);
      // No fallar el request si WhatsApp falla
    }

    return NextResponse.json({ success: true, report: newReport });
  } catch (error) {
    console.error('Error creating bug report:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar estado de un reporte
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const reports = getReports();
    const reportIndex = reports.findIndex((r: any) => r.id === id);

    if (reportIndex === -1) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    if (status) {
      reports[reportIndex].status = status;
      if (status === 'resolved') {
        reports[reportIndex].resolvedAt = new Date().toISOString();
      }
    }

    if (notes !== undefined) {
      reports[reportIndex].notes = notes;
    }

    saveReports(reports);

    return NextResponse.json({ success: true, report: reports[reportIndex] });
  } catch (error) {
    console.error('Error updating bug report:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar un reporte
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const reports = getReports();
    const filteredReports = reports.filter((r: any) => r.id !== id);

    if (filteredReports.length === reports.length) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    saveReports(filteredReports);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug report:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
