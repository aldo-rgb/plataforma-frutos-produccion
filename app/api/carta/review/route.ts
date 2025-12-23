import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyChangesRequested, notifyCartaApproved } from '@/lib/notifications';
import { calculateCartaStatusAfterReview, type EstadoItem } from '@/lib/carta-approval-logic';
import { generateTasksForLetter } from '@/lib/taskGenerator';

/**
 * POST /api/carta/review
 * El mentor/admin revisa y aprueba/rechaza campos individuales de la carta
 * 
 * GRANULAR APPROVAL SYSTEM:
 * - Cada declaración y meta se revisa individualmente
 * - Status final de carta depende de items: APROBADA vs CAMBIOS_REQUERIDOS
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const reviewerId = parseInt(session.user.id);
    const { cartaId, reviews } = await req.json();

    // Verificar que el usuario es mentor o admin
    const reviewer = await prisma.usuario.findUnique({
      where: { id: reviewerId },
      select: { rol: true }
    });

    if (!reviewer || !['MENTOR', 'ADMIN', 'COORDINADOR'].includes(reviewer.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para revisar cartas' }, { status: 403 });
    }

    // Obtener la carta
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: { Usuario: true, Meta: true }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // Collect all item statuses for final carta status calculation
    const allStatuses: EstadoItem[] = [];

    // === REVIEW DECLARATIONS ===
    if (reviews.declarations) {
      const declarationUpdates: any = {};
      
      const areas = [
        'finanzas', 'salud', 'relaciones', 'talentos',
        'pazMental', 'ocio', 'servicioTrans', 'servicioComun'
      ];

      for (const area of areas) {
        if (reviews.declarations[area]) {
          const { status, feedback } = reviews.declarations[area];
          declarationUpdates[`${area}DeclaracionStatus`] = status;
          if (feedback) {
            declarationUpdates[`${area}DeclaracionFeedback`] = feedback;
          }
          allStatuses.push(status as EstadoItem);
        } else {
          // Keep existing status if not reviewed
          const currentStatus = (carta as any)[`${area}DeclaracionStatus`] || 'PENDING';
          allStatuses.push(currentStatus as EstadoItem);
        }
      }

      // Apply declaration updates
      if (Object.keys(declarationUpdates).length > 0) {
        await prisma.cartaFrutos.update({
          where: { id: cartaId },
          data: declarationUpdates
        });
      }
    }

    // === REVIEW METAS ===
    if (reviews.metas && Array.isArray(reviews.metas)) {
      for (const metaReview of reviews.metas) {
        const { metaId, status, feedback } = metaReview;
        
        await prisma.meta.update({
          where: { id: metaId },
          data: {
            status: status as EstadoItem,
            mentorFeedback: feedback || null
          }
        });
        
        allStatuses.push(status as EstadoItem);
      }
    }

    // Add existing meta statuses not in review
    for (const meta of carta.Meta) {
      const wasReviewed = reviews.metas?.some((r: any) => r.metaId === meta.id);
      if (!wasReviewed) {
        allStatuses.push(meta.status as EstadoItem);
      }
    }

    // === CALCULATE FINAL CARTA STATUS ===
    const newCartaStatus = calculateCartaStatusAfterReview(allStatuses);

    // Update carta status
    await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: {
        estado: newCartaStatus,
        autorizadoMentor: newCartaStatus === 'APROBADA',
        autorizadoPorId: reviewerId,
        fechaActualizacion: new Date()
      }
    });

    // Notify user if changes requested
    if (newCartaStatus === 'CAMBIOS_REQUERIDOS') {
      await notifyChangesRequested(carta.usuarioId, cartaId);
    }

    return NextResponse.json({
      success: true,
      message: 'Revisión completada',
      newStatus: newCartaStatus,
      summary: {
        approved: allStatuses.filter(s => s === 'APPROVED').length,
        rejected: allStatuses.filter(s => s === 'REJECTED').length,
        pending: allStatuses.filter(s => s === 'PENDING').length
      }
    });

  } catch (error) {
    console.error('Error in carta review:', error);
    return NextResponse.json(
      { error: 'Error al procesar revisión' },
      { status: 500 }
    );
  }
}
        approved: allStatuses.filter(s => s === 'APPROVED').length,
        rejected: allStatuses.filter(s => s === 'REJECTED').length,
        pending: allStatuses.filter(s => s === 'PENDING').length
      }
    });

  } catch (error) {
    console.error('Error in carta review:', error);
    return NextResponse.json(
      { error: 'Error al procesar revisión' },
      { status: 500 }
    );
  }
}

    for (const review of reviews) {
      const { areaType, identityStatus, metaStatus, identityFeedback, metaFeedback, identity, meta } = review;

      // Si el mentor editó directamente, actualizar el valor
      if (identity) {
        const fieldName = `${areaType.toLowerCase().replace('_', '')}Declaracion`;
        updateData[fieldName] = identity;
      }

      if (meta) {
        const fieldName = `${areaType.toLowerCase().replace('_', '')}Meta`;
        updateData[fieldName] = meta;
      }

      // Verificar rechazos
      if (identityStatus === 'REJECTED') {
        hasRejections = true;
        allApproved = false;
        feedbackMessages.push(`❌ ${areaType} - Identidad: ${identityFeedback}`);
      }

      if (metaStatus === 'REJECTED') {
        hasRejections = true;
        allApproved = false;
        feedbackMessages.push(`❌ ${areaType} - Meta: ${metaFeedback}`);
      }

      if (identityStatus !== 'APPROVED') allApproved = false;
      if (metaStatus !== 'APPROVED') allApproved = false;
    }

    // Determinar el nuevo estado
    let newStatus: any;
    if (allApproved) {
      newStatus = 'APROBADA';
      updateData.autorizadoMentor = true;
      updateData.autorizadoPorId = reviewerId;
      updateData.approvedAt = new Date();
    } else if (hasRejections) {
      newStatus = 'CAMBIOS_SOLICITADOS';
      updateData.changesRequestedAt = new Date();
      updateData.feedbackMentor = feedbackMessages.join('\n');
    } else {
      newStatus = 'PENDIENTE_MENTOR';
    }

    updateData.estado = newStatus;

    // Actualizar la carta
    const updatedCarta = await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: updateData
    });

    // 🚀 GENERAR TAREAS SI LA CARTA ES APROBADA
    if (newStatus === 'APROBADA') {
      console.log(`🚀 Carta #${cartaId} aprobada - Generando tareas automáticamente...`);
      const taskResult = await generateTasksForLetter(cartaId);
      
      if (taskResult.success) {
        await notifyCartaApproved(carta.usuarioId, taskResult.tasksCreated);
        console.log(`✅ ${taskResult.tasksCreated} tareas generadas exitosamente para Usuario #${carta.usuarioId}`);
      } else {
        console.error(`❌ Error generando tareas:`, taskResult.errors);
      }
    }

    // Enviar notificaciones al usuario
    if (newStatus === 'CAMBIOS_SOLICITADOS') {
      await notifyChangesRequested(carta.usuarioId, feedbackMessages.join('\n'));
      console.log(`📧 Notificación: Carta #${cartaId} requiere cambios - Usuario #${carta.usuarioId}`);
    }

    return NextResponse.json({
      success: true,
      carta: updatedCarta,
      message: allApproved 
        ? 'Carta aprobada exitosamente' 
        : hasRejections 
        ? 'Revisión enviada. El usuario recibirá notificación de los cambios solicitados.'
        : 'Revisión guardada'
    });

  } catch (error: any) {
    console.error('Error reviewing carta:', error);
    return NextResponse.json(
      { error: 'Error al revisar la carta', details: error.message },
      { status: 500 }
    );
  }
}
