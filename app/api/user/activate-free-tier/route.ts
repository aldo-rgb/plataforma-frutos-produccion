import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTasksForLetter } from '@/lib/taskGenerator';
import { notifyCartaApproved } from '@/lib/notifications';

/**
 * POST /api/user/activate-free-tier
 * Activa el tier FREE para el usuario actual y auto-aprueba su carta
 * ✅ GENERA TAREAS automáticamente igual que el flujo de pago
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    console.log('🔄 Procesando aprobación automática de carta para usuario FREE:', userId);

    // 🎯 AUTO-APROBAR CARTA si existe una en BORRADOR o EN_REVISION
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: userId,
        estado: {
          in: ['BORRADOR', 'EN_REVISION']
        }
      },
      include: {
        Usuario: { select: { nombre: true, email: true } }
      }
    });

    console.log('📝 Carta encontrada:', carta ? `ID: ${carta.id}, Estado: ${carta.estado}` : 'No hay carta');

    if (carta) {
      // Actualizar estado a APROBADA
      await prisma.cartaFrutos.update({
        where: { id: carta.id },
        data: {
          estado: 'APROBADA',
          autorizadoMentor: true,
          autorizadoCoord: true,
          approvedAt: new Date(),
          fechaActualizacion: new Date()
        }
      });

      console.log('✅ Carta auto-aprobada para usuario FREE:', carta.id);

      // 🚀 GENERAR TAREAS - Igual que en el flujo de pago
      console.log(`🚀 Generando tareas automáticas para carta FREE #${carta.id}`);
      try {
        const result = await generateTasksForLetter(carta.id);

        if (result.success) {
          console.log(`✅ ${result.tasksCreated} tareas creadas exitosamente`);
          
          // Enviar notificación al usuario
          await notifyCartaApproved(carta.usuarioId, result.tasksCreated);
          console.log(`📧 Notificación enviada a ${carta.Usuario.nombre} (${carta.Usuario.email})`);

          return NextResponse.json({
            success: true,
            message: `Carta aprobada exitosamente. Se generaron ${result.tasksCreated} tareas.`,
            cartaAprobada: true,
            cartaId: carta.id,
            tasksCreated: result.tasksCreated
          });
        } else {
          console.error('❌ Error al generar tareas:', result.errors);
          return NextResponse.json(
            { 
              error: 'Carta aprobada pero error al generar tareas', 
              details: result.errors,
              cartaId: carta.id 
            },
            { status: 500 }
          );
        }
      } catch (taskError: any) {
        console.error('❌ Excepción al generar tareas:', taskError);
        return NextResponse.json(
          { 
            error: 'Carta aprobada pero falló la generación de tareas', 
            details: taskError.message,
            cartaId: carta.id 
          },
          { status: 500 }
        );
      }
    }

    // No hay carta para aprobar
    console.log('ℹ️ No se encontró carta para aprobar');
    return NextResponse.json({
      success: true,
      message: 'No hay carta para aprobar',
      cartaAprobada: false
    });

  } catch (error: any) {
    console.error('❌ Error aprobando carta:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Error al aprobar la carta', 
        details: error.message,
        type: error.name 
      },
      { status: 500 }
    );
  }
}
