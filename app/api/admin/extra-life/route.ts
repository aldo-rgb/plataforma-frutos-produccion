import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, razon } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId requerido' }, { status: 400 });
    }

    // Verificar que el usuario es admin, director o coordinador
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!usuario || !['ADMINISTRADOR', 'SCHOOL_ADMIN', 'COORDINADOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'Sin permisos. Solo administradores, directores y coordinadores pueden otorgar vidas extra' }, { status: 403 });
    }

    // Determinar el tipo de otorgante
    let grantedByType = 'ADMIN';
    if (usuario.rol === 'COORDINADOR') {
      grantedByType = 'COORDINADOR';
    } else if (usuario.rol === 'SCHOOL_ADMIN') {
      grantedByType = 'DIRECTOR';
    }

    // Obtener el enrollment
    const enrollment = await prisma.programEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        Usuario_ProgramEnrollment_userIdToUsuario: {
          select: { nombre: true, email: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado' }, { status: 404 });
    }

    // IMPORTANTE: Solo se puede otorgar vida extra si el usuario YA ESTÁ SUSPENDIDO
    if (enrollment.status !== 'SUSPENDED') {
      return NextResponse.json({ 
        error: 'Solo puedes otorgar una vida extra cuando el usuario esté suspendido (3 strikes alcanzados)',
        currentStrikes: enrollment.missedCallsCount,
        maxStrikes: enrollment.maxMissedAllowed,
        currentStatus: enrollment.status
      }, { status: 400 });
    }

    // Verificar si ya usó su vida extra
    if (enrollment.extraLifeUsed) {
      return NextResponse.json({ 
        error: 'El usuario ya utilizó su única vida extra disponible. Permanecerá suspendido hasta el fin del ciclo.',
        usedBy: enrollment.extraLifeGrantedBy,
        usedAt: enrollment.extraLifeGrantedAt
      }, { status: 400 });
    }

    // Resetear missedCallsCount a 0 (otorga vida extra) y reactivar
    const enrollmentActualizado = await prisma.programEnrollment.update({
      where: { id: enrollmentId },
      data: {
        missedCallsCount: 0,
        status: 'ACTIVE', // Reactivar siempre porque solo se puede otorgar cuando está suspendido
        extraLifeUsed: true,
        extraLifeGrantedBy: grantedByType,
        extraLifeGrantedAt: new Date()
      }
    });

    // Reactivar todas las sesiones futuras canceladas
    const sesionesReactivadas = await prisma.callBooking.updateMany({
      where: {
        programEnrollmentId: enrollmentId,
        scheduledAt: { gt: new Date() },
        status: 'CANCELLED'
      },
      data: {
        status: 'PENDING'
      }
    });

    // Registrar en log
    logger.debug(`[VIDA EXTRA] ${usuario.nombre || usuario.email} otorgó vida extra a ${enrollment.Usuario_ProgramEnrollment_userIdToUsuario.nombre} (Enrollment ${enrollmentId}). Razón: ${razon || 'No especificada'}`);

    return NextResponse.json({
      success: true,
      message: 'Usuario reactivado. Strikes reseteados y sesiones futuras restauradas.',
      wasReactivated: true,
      previousStrikes: enrollment.missedCallsCount,
      currentStrikes: 0,
      sesionesReactivadas: sesionesReactivadas.count
    });

  } catch (error) {
    logger.error('Error otorgando vida extra:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error otorgando vida extra' 
    }, { status: 500 });
  }
}
