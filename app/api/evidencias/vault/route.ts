import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener evidencias de CARTA aprobadas
    const evidenciasCarta = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId: usuario.id,
        estado: 'APROBADA'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc'
      }
    });

    // Obtener evidencias EXTRAORDINARIAS aprobadas
    const evidenciasExtraordinarias = await prisma.taskSubmission.findMany({
      where: {
        usuarioId: usuario.id,
        status: 'APPROVED'
      },
      include: {
        AdminTask: true
      },
      orderBy: {
        reviewedAt: 'desc'
      }
    });

    // Mapear áreas a iconos
    const areaIcons: Record<string, string> = {
      'FINANZAS': '💰',
      'RELACIONES': '❤️',
      'TALENTOS': '🎨',
      'PAZ_MENTAL': '🧘',
      'OCIO': '🎮',
      'SALUD': '💪',
      'SERVICIO_TRANSFORMACIONAL': '🌟',
      'SERVICIO_COMUNITARIO': '🤝',
      'EXTRAORDINARIA': '⚡'
    };

    // Función para determinar rareza (por ahora básica, luego será del sistema)
    const determinarRareza = (tipo: string, frecuencia?: string | null) => {
      if (tipo === 'EXTRAORDINARIA') return 'LEGENDARY';
      
      switch (frecuencia) {
        case 'DAILY': return 'COMMON';
        case 'WEEKLY': return 'UNCOMMON';
        case 'MONTHLY': return 'RARE';
        case 'ONE_TIME': return 'EPIC';
        default: return 'COMMON';
      }
    };

    // Formatear evidencias de CARTA
    const evidenciasFormateadas = evidenciasCarta.map(ev => ({
      id: ev.id,
      fotoUrl: ev.fotoUrl,
      descripcion: ev.descripcion || ev.Accion.texto,
      fecha: ev.fechaSubida,
      area: ev.Accion.Meta.categoria,
      areaIcon: areaIcons[ev.Accion.Meta.categoria] || '📋',
      status: ev.estado,
      rarity: determinarRareza('CARTA', ev.Accion.frequency),
      tipo: 'CARTA',
      // Campos de calidad
      highQuality: ev.highQuality || false,
      qualityScore: ev.qualityScore || null,
      rarityBonus: ev.rarityBonus || false
    }));

    // Formatear evidencias EXTRAORDINARIAS
    const extraordinariasFormateadas = evidenciasExtraordinarias.map(ev => ({
      id: ev.id,
      fotoUrl: ev.evidenciaUrl || '',
      descripcion: ev.comentario || ev.AdminTask?.titulo || 'Misión Especial',
      fecha: ev.reviewedAt || ev.submittedAt,
      area: 'EXTRAORDINARIA',
      areaIcon: '⚡',
      status: ev.status,
      rarity: 'LEGENDARY',
      tipo: 'EXTRAORDINARIA'
    }));

    // Combinar y ordenar por fecha
    const todasLasEvidencias = [...evidenciasFormateadas, ...extraordinariasFormateadas]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({
      evidencias: todasLasEvidencias,
      total: todasLasEvidencias.length,
      porRareza: {
        legendary: todasLasEvidencias.filter(e => e.rarity === 'LEGENDARY').length,
        epic: todasLasEvidencias.filter(e => e.rarity === 'EPIC').length,
        rare: todasLasEvidencias.filter(e => e.rarity === 'RARE').length,
        uncommon: todasLasEvidencias.filter(e => e.rarity === 'UNCOMMON').length,
        common: todasLasEvidencias.filter(e => e.rarity === 'COMMON').length
      }
    });

  } catch (error) {
    logger.error('❌ Error al cargar evidencias de la bóveda:', error);
    return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 });
  }
}
