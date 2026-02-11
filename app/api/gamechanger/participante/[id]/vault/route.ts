import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const participanteId = parseInt(id);

    if (isNaN(participanteId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el usuario es GAMECHANGER
    const gamechanger = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!gamechanger || gamechanger.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de GameChanger' }, { status: 403 });
    }

    // Verificar que el participante está asignado a este GameChanger
    const asignacion = await prisma.visionParticipante.findFirst({
      where: {
        userId: participanteId,
        gamechangerId: gamechanger.id
      }
    });

    if (!asignacion) {
      return NextResponse.json({ 
        error: 'Este participante no está asignado a ti' 
      }, { status: 403 });
    }

    // Obtener info del participante
    const participante = await prisma.usuario.findUnique({
      where: { id: participanteId },
      select: { id: true, nombre: true, email: true }
    });

    if (!participante) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    // Obtener evidencias de CARTA aprobadas
    const evidenciasCarta = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId: participanteId,
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
        usuarioId: participanteId,
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

    // Función para determinar rareza
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
      highQuality: ev.highQuality || false,
      qualityScore: ev.qualityScore || null,
      rarityBonus: ev.rarityBonus || false
    }));

    // Formatear evidencias EXTRAORDINARIAS
    const extraordinariasFormateadas = evidenciasExtraordinarias.map(ev => ({
      id: `extra-${ev.id}`,
      fotoUrl: ev.evidenciaUrl || '',
      descripcion: ev.AdminTask.title,
      fecha: ev.reviewedAt || ev.submittedAt,
      area: 'EXTRAORDINARIA',
      areaIcon: '⚡',
      status: 'APROBADA',
      rarity: 'LEGENDARY' as const,
      tipo: 'EXTRAORDINARIA',
      highQuality: true,
      qualityScore: 100,
      rarityBonus: false
    }));

    // Combinar todas las evidencias
    const todasEvidencias = [...evidenciasFormateadas, ...extraordinariasFormateadas];

    // Calcular estadísticas
    const stats = {
      total: todasEvidencias.length,
      legendary: todasEvidencias.filter(e => e.rarity === 'LEGENDARY').length,
      epic: todasEvidencias.filter(e => e.rarity === 'EPIC').length,
      rare: todasEvidencias.filter(e => e.rarity === 'RARE').length,
      uncommon: todasEvidencias.filter(e => e.rarity === 'UNCOMMON').length,
      common: todasEvidencias.filter(e => e.rarity === 'COMMON').length,
      thisWeek: todasEvidencias.filter(e => {
        const fecha = new Date(e.fecha);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return fecha >= weekAgo;
      }).length
    };

    return NextResponse.json({
      success: true,
      participante: {
        id: participante.id,
        nombre: participante.nombre,
        email: participante.email
      },
      evidencias: todasEvidencias,
      stats
    });

  } catch (error) {
    logger.error('Error al obtener vault del participante:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
