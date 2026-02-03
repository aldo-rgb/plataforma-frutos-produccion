import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/automatizaciones/logs
 * Obtiene el historial de mensajes enviados por automatizaciones
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar rol
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo directores pueden ver los registros' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const videoKey = searchParams.get('videoKey');
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId!,
    };

    if (videoKey) {
      where.videoKey = videoKey;
    }

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    // Obtener total de registros
    const total = await prisma.automationMessageLog.count({ where });

    // Obtener registros paginados
    const logs = await prisma.automationMessageLog.findMany({
      where,
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Estadísticas generales
    const stats = await prisma.automationMessageLog.groupBy({
      by: ['status', 'channel'],
      where: { organizationId: user.organizationId! },
      _count: true,
    });

    // Transformar estadísticas
    const statsMap = {
      totalEmails: 0,
      emailsSent: 0,
      emailsFailed: 0,
      totalWhatsapp: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
    };

    stats.forEach((s: any) => {
      if (s.channel === 'EMAIL') {
        statsMap.totalEmails += s._count;
        if (s.status === 'SENT' || s.status === 'DELIVERED') {
          statsMap.emailsSent += s._count;
        } else if (s.status === 'FAILED') {
          statsMap.emailsFailed += s._count;
        }
      } else if (s.channel === 'WHATSAPP') {
        statsMap.totalWhatsapp += s._count;
        if (s.status === 'SENT' || s.status === 'DELIVERED') {
          statsMap.whatsappSent += s._count;
        } else if (s.status === 'FAILED') {
          statsMap.whatsappFailed += s._count;
        }
      }
    });

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statsMap,
    });

  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
