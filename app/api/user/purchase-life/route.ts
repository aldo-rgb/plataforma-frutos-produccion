import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const COSTO_VIDA_EXTRA = 1000; // Puntos cuánticos necesarios para comprar una vida

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId requerido' }, { status: 400 });
    }

    // Obtener el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: { id: enrollmentId }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el enrollment pertenece al usuario
    const enrollment = usuario.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado o no pertenece al usuario' }, { status: 404 });
    }

    // IMPORTANTE: Solo se puede comprar vida extra si el usuario YA ESTÁ SUSPENDIDO
    if (enrollment.status !== 'SUSPENDED') {
      return NextResponse.json({ 
        error: 'Solo puedes comprar una vida extra cuando tu sistema esté suspendido (3 strikes alcanzados)',
        currentStrikes: enrollment.missedCallsCount,
        maxStrikes: enrollment.maxMissedAllowed
      }, { status: 400 });
    }

    // Verificar si ya usó su vida extra
    if (enrollment.extraLifeUsed) {
      return NextResponse.json({ 
        error: 'Ya utilizaste tu única vida extra disponible. Tu sistema permanecerá suspendido hasta el fin del ciclo.',
        usedBy: enrollment.extraLifeGrantedBy,
        usedAt: enrollment.extraLifeGrantedAt
      }, { status: 400 });
    }

    // Verificar que tiene suficientes puntos
    const puntosActuales = usuario.puntosCuanticos || 0;
    if (puntosActuales < COSTO_VIDA_EXTRA) {
      return NextResponse.json({ 
        error: `Puntos insuficientes. Necesitas ${COSTO_VIDA_EXTRA} puntos cuánticos. Tienes ${puntosActuales}.`,
        required: COSTO_VIDA_EXTRA,
        current: puntosActuales,
        missing: COSTO_VIDA_EXTRA - puntosActuales
      }, { status: 400 });
    }

    // Deducir puntos y resetear strikes
    const [usuarioActualizado, enrollmentActualizado] = await prisma.$transaction([
      prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          puntosCuanticos: {
            decrement: COSTO_VIDA_EXTRA
          }
        }
      }),
      prisma.programEnrollment.update({
        where: { id: enrollmentId },
        data: {
          missedCallsCount: 0,
          status: 'ACTIVE', // Reactivar siempre porque solo se puede comprar cuando está suspendido
          extraLifeUsed: true,
          extraLifeGrantedBy: 'PURCHASE',
          extraLifeGrantedAt: new Date()
        }
      })
    ]);

    // Reactivar todas las sesiones futuras canceladas
    await prisma.callBooking.updateMany({
      where: {
        programEnrollmentId: enrollmentId,
        scheduledAt: { gt: new Date() },
        status: 'CANCELLED'
      },
      data: {
        status: 'PENDING'
      }
    });

    // Registrar la transacción
    console.log(`[COMPRA VIDA] ${usuario.nombre || usuario.email} compró una vida extra con ${COSTO_VIDA_EXTRA} puntos cuánticos (Enrollment ${enrollmentId})`);

    return NextResponse.json({
      success: true,
      message: '¡Vida extra comprada! Has sido reactivado y tus sesiones futuras han sido restauradas.',
      wasReactivated: true,
      previousStrikes: enrollment.missedCallsCount,
      currentStrikes: 0,
      pointsSpent: COSTO_VIDA_EXTRA,
      remainingPoints: usuarioActualizado.puntosCuanticos
    });

  } catch (error) {
    console.error('Error comprando vida extra:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error procesando compra de vida extra' 
    }, { status: 500 });
  }
}

// GET para obtener el precio y verificar si el usuario puede comprar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');

    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId requerido' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: { id: parseInt(enrollmentId) }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const enrollment = usuario.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado' }, { status: 404 });
    }

    const puntosActuales = usuario.puntosCuanticos || 0;
    const puedeComprar = puntosActuales >= COSTO_VIDA_EXTRA;

    return NextResponse.json({
      success: true,
      cost: COSTO_VIDA_EXTRA,
      currentPoints: puntosActuales,
      canPurchase: puedeComprar && !enrollment.extraLifeUsed,
      missing: puedeComprar ? 0 : COSTO_VIDA_EXTRA - puntosActuales,
      currentStrikes: enrollment.missedCallsCount,
      maxStrikes: enrollment.maxMissedAllowed,
      isSuspended: enrollment.status === 'SUSPENDED',
      extraLifeUsed: enrollment.extraLifeUsed || false,
      extraLifeGrantedBy: enrollment.extraLifeGrantedBy,
      extraLifeGrantedAt: enrollment.extraLifeGrantedAt
    });

  } catch (error) {
    console.error('Error obteniendo info de compra:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error obteniendo información' 
    }, { status: 500 });
  }
}
