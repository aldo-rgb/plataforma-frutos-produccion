import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { validateSessionCredits, consumeSessionCredit } from '@/lib/packageSessionManager';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. OBTENER SESIÓN Y DATOS
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { date, time, mentorId, type, usePackageCredit } = body; // 🔥 NUEVO: usePackageCredit
    
    const studentId = session.user.id;

    if (!date || !time || !mentorId) {
      return NextResponse.json({ error: 'Faltan datos: date, time, mentorId' }, { status: 400 });
    }

    const callType = type || 'DISCIPLINE'; // Por defecto DISCIPLINE
    if (callType !== 'DISCIPLINE' && callType !== 'MENTORSHIP') {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    // Combinar date (YYYY-MM-DD) + time (HH:mm) en un DateTime
    const scheduledAt = new Date(`${date}T${time}:00`);

    logger.debug(`📞 Intento de reserva: Estudiante ${studentId}, Mentor ${mentorId}, Fecha: ${scheduledAt}`);
    logger.debug(`💳 Usar crédito de paquete: ${usePackageCredit ? 'Sí' : 'No'}`);

    // 💳 VALIDAR CRÉDITOS DE PAQUETE SI SE REQUIERE
    let packageOrderId: string | undefined;
    if (usePackageCredit && callType === 'MENTORSHIP') {
      const validation = await validateSessionCredits(studentId, Number(mentorId));
      
      if (!validation.hasCredits) {
        return NextResponse.json(
          { 
            error: validation.message,
            code: 'NO_PACKAGE_CREDITS'
          },
          { status: 403 }
        );
      }

      packageOrderId = validation.packageOrderId;
      logger.debug(`💳 Créditos validados. Paquete: ${packageOrderId}, Restantes: ${validation.remainingSessions}`);
    }
    
    // 🎯 VALIDACIÓN CRÍTICA: Para DISCIPLINE, verificar que el mentor esté asignado a la visión
    if (callType === 'DISCIPLINE') {
      const participante = await prisma.usuario.findUnique({
        where: { id: Number(studentId) },
        include: {
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            select: { visionId: true }
          }
        }
      });

      if (participante && participante.VisionParticipante_VisionParticipante_participanteIdToUsuario.length > 0) {
        const visionId = participante.VisionParticipante_VisionParticipante_participanteIdToUsuario[0].visionId;
        
        // Verificar que el mentor está asignado a esta visión
        const mentorAsignado = await prisma.visionMentor.findUnique({
          where: {
            visionId_mentorId: {
              visionId,
              mentorId: Number(mentorId)
            }
          }
        });

        if (!mentorAsignado) {
          return NextResponse.json({ 
            error: 'Este mentor no está disponible para tu visión. Por favor contacta a tu coordinador.',
            code: 'MENTOR_NOT_ASSIGNED'
          }, { status: 403 });
        }
      }
    }

    // 2. INICIAMOS TRANSACCIÓN (Todo o Nada)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // A. REGLA DE NEGOCIO: ¿Ya cumplió sus 2 llamadas de esta semana?
      const start = startOfWeek(scheduledAt, { weekStartsOn: 1 }); // Lunes
      const end = endOfWeek(scheduledAt, { weekStartsOn: 1 });   // Domingo

      const existingWeeklyCalls = await tx.callBooking.findMany({
        where: {
          studentId: Number(studentId),
          status: { not: 'CANCELLED' }, // Ignoramos canceladas
          scheduledAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          id: true,
          scheduledAt: true
        }
      });

      const weeklyCalls = existingWeeklyCalls.length;

      logger.debug(`📊 Llamadas esta semana: ${weeklyCalls}/2`);

      if (weeklyCalls >= 2) {
        throw new Error("LIMIT_REACHED"); // "Disparo" el error para cancelar todo
      }

      // NUEVA VALIDACIÓN: Si ya tiene 1 llamada, verificar que sea en un día diferente
      if (weeklyCalls === 1) {
        const existingCall = existingWeeklyCalls[0];
        const existingDay = new Date(existingCall.scheduledAt).getDay();
        const newDay = scheduledAt.getDay();
        
        logger.debug(`🔍 Validando días: Llamada existente día ${existingDay}, Nueva llamada día ${newDay}`);
        
        if (existingDay === newDay) {
          throw new Error("SAME_DAY_ERROR");
        }
      }

      // B. OBTENER DATOS FINANCIEROS DEL MENTOR (Solo para MENTORSHIP sin paquete)
      let price = 0;
      let commission = 0;
      let platformShare = 0;
      let mentorShare = 0;

      if (callType === 'MENTORSHIP' && !packageOrderId) {
        // Solo calcular precio si NO es con paquete
        const mentorProfile = await tx.perfilMentor.findUnique({
          where: { usuarioId: Number(mentorId) },
          select: { 
            precioBase: true,
            comisionPlataforma: true
          }
        });

        price = mentorProfile?.precioBase || 1000; // Precio por defecto
        commission = mentorProfile?.comisionPlataforma || 30; // % por defecto

        // Calculamos el reparto
        platformShare = (price * commission) / 100;
        mentorShare = price - platformShare;

        logger.debug(`💰 Precio: $${price} | Comisión: ${commission}% | Plataforma: $${platformShare} | Mentor: $${mentorShare}`);
      }

      // C. INTENTO DE RESERVA con tipo de llamada
      // Intentamos crear. Si ya existe (por el @@unique), esto fallará automáticamente.
      const newBooking = await tx.callBooking.create({
        data: {
          studentId: Number(studentId),
          mentorId: Number(mentorId),
          scheduledAt,
          duration: callType === 'DISCIPLINE' ? 15 : 60, // 🔥 15 min o 1 hora
          status: 'PENDING',
          type: callType as any, // 🔥 Guardar el tipo
          packageOrderId // 📦 Vincular con paquete si aplica
        }
      });

      // D. REGISTRAR TRANSACCIÓN FINANCIERA (Solo para MENTORSHIP sin paquete)
      if (callType === 'MENTORSHIP' && !packageOrderId) {
        await tx.transaction.create({
          data: {
            bookingId: newBooking.id,
            amountTotal: price,
            platformFee: platformShare,
            mentorEarnings: mentorShare,
            status: 'HELD' // El dinero está "retenido" hasta que se complete la mentoría
          }
        });

        logger.debug(`💳 Transacción registrada: Booking ID ${newBooking.id}, Total: $${price}`);
      }

      // E. CONSUMIR CRÉDITO DE PAQUETE SI APLICA
      if (packageOrderId) {
        await consumeSessionCredit(packageOrderId);
        logger.debug(`📦 Crédito consumido del paquete ${packageOrderId}`);
      }

      logger.debug(`✅ Reserva creada exitosamente: ID ${newBooking.id}`);

      return newBooking;
    });

    return NextResponse.json({ 
      success: true, 
      booking: result,
      message: '¡Llamada reservada exitosamente!' 
    });

  } catch (error: any) {
    logger.error("❌ Error en reserva:", error);

    // 3. MANEJO DE ERRORES ESPECÍFICOS
    
    // Error P2002 de Prisma = Violación de Unique Constraint (Ya ganaron el lugar)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '⚠️ Lo sentimos, alguien acaba de ganar este horario hace un segundo.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Error de Límite Semanal (Lo lanzamos nosotros arriba)
    if (error.message === 'LIMIT_REACHED') {
      return NextResponse.json(
        { error: '⛔ Has alcanzado tu límite de 2 llamadas esta semana. ¡Buen trabajo!' },
        { status: 403 }
      );
    }

    // NUEVO: Error de mismo día
    if (error.message === 'SAME_DAY_ERROR') {
      return NextResponse.json(
        { 
          error: '📅 Las dos llamadas semanales deben ser en días diferentes. Por favor selecciona otro día.',
          code: 'SAME_DAY_NOT_ALLOWED'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
