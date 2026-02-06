import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import logger from '@/lib/logger';

// PUT: Aprobar una carta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const cartaId = parseInt(id);

    if (isNaN(cartaId)) {
      return NextResponse.json({ error: 'ID de carta inválido' }, { status: 400 });
    }

    // Buscar usuario mentor
    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Verificar que la carta existe y está en revisión
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    if (carta.estado !== 'EN_REVISION') {
      return NextResponse.json({ 
        error: `La carta no está en revisión (Estado actual: ${carta.estado})` 
      }, { status: 400 });
    }

    // Aprobar carta
    const cartaAprobada = await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: { 
        estado: 'APROBADA',
        feedbackMentor: null // Limpiar feedback previo si existe
      }
    });

    logger.debug(`✅ Carta ${cartaId} APROBADA por ${mentor.nombre} para ${carta.Usuario.nombre}`);

    // Verificar si el usuario ya tiene un ciclo activo
    const cicloExistente = await prisma.programEnrollment.findFirst({
      where: {
        userId: carta.usuarioId,
        status: 'ACTIVE'
      }
    });

    // Crear ciclo de 63 días si no existe
    if (!cicloExistente) {
      const hoy = new Date();
      const fechaFin = addDays(hoy, 63);
      
      await prisma.programEnrollment.create({
        data: {
          userId: carta.usuarioId,
          mentorId: carta.usuarioId, // Ciclo personal (SOLO)
          cycleType: 'SOLO',
          cycleStartDate: hoy,
          cycleEndDate: fechaFin,
          startDate: hoy, // Legacy field
          endDate: fechaFin, // Legacy field
          totalWeeks: 9, // ~63 días = 9 semanas
          status: 'ACTIVE'
        }
      });
      
      logger.debug(`🎯 Ciclo de 63 días creado para ${carta.Usuario.nombre}`);
    } else {
      logger.debug(`ℹ️  ${carta.Usuario.nombre} ya tiene un ciclo activo`);
    }

    // TODO: Aquí puedes agregar notificación al usuario
    // - Email
    // - Notificación in-app
    // - Push notification

    return NextResponse.json({ 
      success: true,
      message: `Carta de ${carta.Usuario.nombre} aprobada exitosamente`,
      estado: 'APROBADA'
    }, { status: 200 });

  } catch (error) {
    logger.error('❌ Error al aprobar carta:', error);
    return NextResponse.json({ error: 'Error al aprobar carta' }, { status: 500 });
  }
}
