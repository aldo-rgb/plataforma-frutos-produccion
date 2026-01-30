import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyCartaSubmitted, notifyCartaApproved } from '@/lib/notifications';
import { validateCartaForSubmission } from '@/lib/validaciones-carta';
import { generateTasksForLetter } from '@/lib/taskGenerator';

/**
 * POST /api/carta/submit
 * Envía la carta para revisión (mentor o admin)
 * ⚠️ VALIDACIÓN DURA: Valida completitud antes de permitir envío
 * ⚠️ VALIDACIÓN VISION: Usuarios de Vision DEBEN tener mentor asignado
 * ✅ USUARIOS GRADUADOS FREE: Pueden continuar sin mentor (auto-aprobación)
 * ⚠️ VALIDACIÓN DURA: Valida completitud antes de permitir envío
 * ⚠️ VALIDACIÓN VISION: Usuarios de Vision DEBEN tener mentor asignado
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await req.json();

    // Validar que la carta existe y es del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        id: data.cartaId,
        usuarioId: userId
      },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // ========== VALIDACIÓN DE SUSCRIPCIÓN/TIER PARA PARTICIPANTES ==========
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        rol: true, 
        suscripcion: true,
        tier: true,
        mentorId: true, 
        assignedMentorId: true 
      }
    });

    // 🎫 VERIFICAR PRIMERO SI TIENE LICENCIA ASIGNADA (mayor prioridad)
    const licenseAssignment = await prisma.licenseAssignment.findFirst({
      where: {
        userId: userId,
        isActive: true,
        activatedAt: null // Licencia no activada aún
      },
      include: {
        Vision: true
      }
    });

    // ========== VALIDACIÓN USUARIOS DE VISION: MENTOR OBLIGATORIO ==========
    // Verificar si el usuario pertenece a una Vision (grupo)
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: { participanteId: userId },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    const perteneceAVision = !!visionParticipante;
    const mentorId = usuario?.assignedMentorId || usuario?.mentorId;
    const userTier = usuario?.tier || 'FREE';

    // =====================================================
    // CASO ESPECIAL: Usuario graduado con TIER FREE sin mentor
    // Pueden continuar sin mentor si lo desean (auto-aprobación)
    // =====================================================
    const isGraduatedFreeUser = userTier === 'FREE' && perteneceAVision;
    
    // Si pertenece a una Vision, NO tiene mentor y NO es usuario FREE graduado → BLOQUEAR
    // Si es FREE graduado sin mentor, permitir continuar (se manejará con confirmación en frontend)
    if (perteneceAVision && !mentorId && !isGraduatedFreeUser) {
      console.log('❌ Usuario de Vision sin mentor - Bloqueando envío');
      console.log('   Vision:', visionParticipante?.Vision?.nombre || 'N/A');
      console.log('   UserId:', userId);
      
      return NextResponse.json({ 
        error: 'Mentor requerido',
        message: 'Debes tener un mentor asignado para enviar tu carta a revisión. Contacta a tu coordinador.',
        requiresMentor: true,
        isVisionUser: true,
        visionName: visionParticipante?.Vision?.nombre
      }, { status: 403 });
    }
    
    // Usuario graduado FREE sin mentor - Preguntar si quiere continuar
    if (isGraduatedFreeUser && !mentorId) {
      // Verificar si el usuario confirmó que quiere continuar sin mentor
      const { continueWithoutMentor } = data;
      
      if (!continueWithoutMentor) {
        console.log('⚠️ Usuario graduado FREE sin mentor - Requiere confirmación');
        return NextResponse.json({ 
          error: 'Confirmación requerida',
          message: 'Como usuario graduado sin licencia activa, puedes continuar sin mentor. Tu carta será auto-aprobada y se generarán tus tareas automáticamente.',
          requiresConfirmation: true,
          canContinueWithoutMentor: true,
          isGraduatedFree: true,
          visionName: visionParticipante?.Vision?.nombre
        }, { status: 200 }); // 200 porque no es un error, es una confirmación pendiente
      }
      
      console.log('✅ Usuario graduado FREE confirmó continuar sin mentor - Auto-aprobando carta');
    }
    // ==================================================================

    // Solo validar suscripción si es PARTICIPANTE
    if (usuario?.rol === 'PARTICIPANTE') {
      const userTier = usuario.tier || 'FREE';
      
      console.log('🔍 Validación de licencia - Usuario:', userId);
      console.log('   Tier:', userTier);
      console.log('   Suscripción:', usuario.suscripcion);
      console.log('   Tiene licencia asignada:', !!licenseAssignment);
      console.log('   Pertenece a Vision:', perteneceAVision);
      console.log('   Tiene mentor:', !!mentorId);
      
      // 🎫 Si tiene LICENCIA ASIGNADA de organización, permitir envío
      if (licenseAssignment) {
        console.log('🎫 Usuario tiene licencia de organización asignada - Permitiendo envío');
        // La licencia se activará después de validar y enviar la carta al mentor
      } 
      // ✅ Usuario graduado FREE que confirmó continuar sin mentor -> Auto-aprobar
      else if (isGraduatedFreeUser && data.continueWithoutMentor) {
        console.log('✅ Usuario graduado FREE con confirmación - Permitiendo auto-aprobación');
        // Se manejará más adelante con auto-aprobación
      }
      // ❌ Si es FREE sin licencia y NO es graduado FREE confirmado -> Redirigir a PRICING
      else if (userTier === 'FREE' && !isGraduatedFreeUser) {
        console.log('❌ Usuario FREE sin licencia - Requiere comprar plan');
        return NextResponse.json({ 
          error: 'Plan requerido',
          message: 'Necesitas adquirir un plan para enviar tu carta a revisión con un mentor',
          requiresPayment: true,
          redirectTo: '/dashboard/suscripcion'
        }, { status: 402 }); // 402 Payment Required
      }
      // ✅ STANDARD o PREMIUM (ACTIVO o INACTIVO) -> Enviar a mentor
      else if (userTier === 'STANDARD' || userTier === 'PREMIUM') {
        console.log(`✅ Usuario ${userTier} - Permitiendo envío a mentor (sin importar si está activo o inactivo)`);
        // Continuar con el flujo normal de envío al mentor
      }
      // ❌ Cualquier otro caso -> Por seguridad, redirigir a pricing
      else {
        console.log('❌ Tier no reconocido o sin acceso - Requiere plan');
        return NextResponse.json({ 
          error: 'Plan requerido',
          message: 'Necesitas un plan válido para enviar tu carta a revisión',
          requiresPayment: true,
          redirectTo: '/dashboard/suscripcion'
        }, { status: 402 });
      }
    }
    // ==================================================================

    console.log('📋 Carta encontrada ID:', carta.id);
    console.log('📊 Total de metas encontradas:', carta.Meta?.length || 0);
    if (carta.Meta && carta.Meta.length > 0) {
      console.log('📝 Metas con acciones:', carta.Meta.map(m => ({
        id: m.id,
        categoria: m.categoria,
        acciones: m.Accion?.length || 0
      })));
    }

    // ========== VALIDACIÓN DURA DE REGLAS DE NEGOCIO ==========
    try {
      validateCartaForSubmission(carta, carta.Meta);
    } catch (validationError: any) {
      console.error('❌ Validación fallida:', validationError.message);
      return NextResponse.json({ 
        error: 'Validación fallida', 
        message: validationError.message,
        hint: 'Completa todos los campos requeridos en los 3 pasos del wizard'
      }, { status: 400 });
    }
    // ==========================================================

    // mentorId ya fue calculado arriba en la validación de Vision

    // =====================================================
    // CASO ESPECIAL: Usuario graduado FREE sin mentor - AUTO-APROBAR
    // =====================================================
    if (isGraduatedFreeUser && data.continueWithoutMentor && !mentorId) {
      console.log('🎯 Auto-aprobando carta para usuario graduado FREE sin mentor');
      
      // Actualizar carta a APROBADA directamente
      const updatedCarta = await prisma.cartaFrutos.update({
        where: { id: carta.id },
        data: {
          estado: 'APROBADA',
          autorizadoMentor: true,
          autorizadoCoord: true,
          approvedAt: new Date(),
          fechaActualizacion: new Date()
        }
      });
      
      // Marcar wizard como completado
      await prisma.usuario.update({
        where: { id: userId },
        data: { wizardCompleted: true }
      });
      
      console.log('✅ Carta auto-aprobada para usuario graduado FREE:', carta.id);
      
      // 🚀 GENERAR TAREAS automáticamente
      console.log(`🚀 Generando tareas automáticas para carta graduado FREE #${carta.id}`);
      try {
        const result = await generateTasksForLetter(carta.id);
        
        if (result.success) {
          console.log(`✅ ${result.tasksCreated} tareas creadas exitosamente`);
          
          // Enviar notificación al usuario
          await notifyCartaApproved(userId, result.tasksCreated);
          
          return NextResponse.json({
            success: true,
            carta: updatedCarta,
            autoApproved: true,
            tasksCreated: result.tasksCreated,
            message: `🎉 ¡Tu carta ha sido aprobada! Se generaron ${result.tasksCreated} tareas. ¡Comienza tu transformación!`
          });
        } else {
          console.error('❌ Error al generar tareas:', result.errors);
          return NextResponse.json({
            success: true,
            carta: updatedCarta,
            autoApproved: true,
            tasksCreated: 0,
            message: 'Tu carta ha sido aprobada pero hubo un problema al generar las tareas. Contacta a soporte.',
            warning: result.errors
          });
        }
      } catch (taskError: any) {
        console.error('❌ Excepción al generar tareas:', taskError);
        return NextResponse.json({
          success: true,
          carta: updatedCarta,
          autoApproved: true,
          tasksCreated: 0,
          message: 'Tu carta ha sido aprobada pero hubo un problema al generar las tareas.',
          error: taskError.message
        });
      }
    }
    // =====================================================

    // Determinar el estado según si tiene mentor (usando valores del enum EstadoCarta)
    const newStatus = 'EN_REVISION' as const;
    
    if (mentorId) {
      // Enviar notificación al mentor
      await notifyCartaSubmitted(userId, mentorId);
      console.log(`📧 Notificación: Carta #${carta.id} pendiente de revisión para mentor #${mentorId}`);
    } else {
      // Enviar notificación a admins
      await notifyCartaSubmitted(userId);
      console.log(`📧 Notificación: Carta #${carta.id} pendiente de revisión para admin (usuario sin mentor)`);
    }

    // Actualizar estado de la carta
    const updatedCarta = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        estado: newStatus,
        fechaActualizacion: new Date()
      }
    });

    // Marcar wizard como completado
    await prisma.usuario.update({
      where: { id: userId },
      data: { wizardCompleted: true }
    });

    // 🎫 ACTIVAR LICENCIA: Marcar la licencia como activada y actualizar tier del usuario
    if (licenseAssignment) {
      // Activar la licencia
      await prisma.licenseAssignment.update({
        where: { id: licenseAssignment.id },
        data: {
          activatedAt: new Date(),
          expiresAt: null // Ya no expira porque fue activada
        }
      });
      
      // Actualizar el tier del usuario a STANDARD y activar suscripción
      await prisma.usuario.update({
        where: { id: userId },
        data: { 
          tier: 'STANDARD',
          suscripcion: 'ACTIVO'
        }
      });
      
      console.log('🎫 Licencia activada para usuario:', userId, '- Vision:', licenseAssignment.Vision?.nombre || 'N/A');
      console.log('⬆️ Tier actualizado a STANDARD y suscripción activada');
    }

    console.log('✅ Wizard marcado como completado para usuario:', userId);

    return NextResponse.json({
      success: true,
      carta: updatedCarta,
      message: mentorId 
        ? '✅ Carta validada y enviada a tu mentor para revisión' 
        : '✅ Carta validada y enviada a mentor para Autorizacion'
    });

  } catch (error: any) {
    console.error('Error submitting carta:', error);
    return NextResponse.json(
      { error: 'Error al enviar la carta', details: error.message },
      { status: 500 }
    );
  }
}
