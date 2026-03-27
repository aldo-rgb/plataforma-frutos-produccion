import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';
import prisma from '@/lib/prisma';

// GET - Listar reportes (solo admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const reports = await prisma.bugReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Usuario: { select: { id: true, nombre: true, email: true } },
        ResolvedByUser: { select: { id: true, nombre: true } },
      },
    });

    // Map to expected format
    const mapped = reports.map(r => ({
      id: `bug-${r.id}`,
      dbId: r.id,
      description: r.description,
      screenshotUrl: r.screenshotUrl,
      userName: r.Usuario.nombre || 'Anónimo',
      userEmail: r.Usuario.email,
      userId: r.userId,
      pageUrl: r.pageUrl,
      userAgent: r.userAgent,
      status: r.status.toLowerCase(),
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() || null,
      notes: r.adminNotes,
      resolvedBy: r.ResolvedByUser?.nombre || null,
    }));

    return NextResponse.json({ reports: mapped });
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

    // userId is required for DB relation
    if (!userId) {
      return NextResponse.json({ error: 'Usuario requerido' }, { status: 400 });
    }

    const newReport = await prisma.bugReport.create({
      data: {
        userId: parseInt(userId),
        description,
        screenshotUrl: screenshotUrl || null,
        pageUrl: pageUrl || null,
        userAgent: userAgent || null,
      },
    });

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
🆔 bug-${newReport.id}`;

    try {
      await sendWhatsAppTextMessage(SUPPORT_PHONE, whatsappMessage);
      console.log('✅ WhatsApp notification sent for bug report:', newReport.id);
    } catch (whatsappError) {
      console.error('⚠️ Failed to send WhatsApp notification:', whatsappError);
    }

    return NextResponse.json({ 
      success: true, 
      report: {
        id: `bug-${newReport.id}`,
        description: newReport.description,
        screenshotUrl: newReport.screenshotUrl,
        userName: userName || 'Anónimo',
        userEmail,
        userId: newReport.userId,
        pageUrl: newReport.pageUrl,
        status: 'pending',
        createdAt: newReport.createdAt.toISOString(),
      }
    });
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

    // Extract numeric ID from "bug-123" format
    const dbId = typeof id === 'string' && id.startsWith('bug-') 
      ? parseInt(id.replace('bug-', ''))
      : parseInt(id);

    if (isNaN(dbId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      'pending': 'PENDING',
      'in_progress': 'IN_PROGRESS',
      'resolved': 'RESOLVED',
      'dismissed': 'CLOSED',
      'wont_fix': 'WONT_FIX',
    };

    const updateData: any = {};
    
    if (status) {
      updateData.status = statusMap[status] || status.toUpperCase();
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = parseInt((session.user as any).id);
      }
    }

    if (notes !== undefined) {
      updateData.adminNotes = notes;
    }

    const updated = await prisma.bugReport.update({
      where: { id: dbId },
      data: updateData,
    });

    return NextResponse.json({ success: true, report: updated });
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

    const dbId = id.startsWith('bug-') ? parseInt(id.replace('bug-', '')) : parseInt(id);

    if (isNaN(dbId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await prisma.bugReport.delete({
      where: { id: dbId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug report:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
