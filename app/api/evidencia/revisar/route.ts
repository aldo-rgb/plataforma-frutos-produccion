// app/api/evidencia/revisar/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener todas las evidencias pendientes y que requieren corrección
    const evidencias = await prisma.evidenciaAccion.findMany({
      where: {
        OR: [
          { estado: 'PENDIENTE' },
          { estado: 'REQUIERE_CORRECCION' }
        ]
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true
          },
        },
        Accion: {
          select: {
            nombre: true,
            puntosRecompensa: true,
            categoria: true
          }
        },
        Meta: {
          select: {
            objetivo: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc',
      },
    });

    return NextResponse.json({ evidencias });
  } catch (error) {
    logger.error('Error al obtener evidencias:', error);
    return NextResponse.json({ error: 'Error al cargar evidencias' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { evidenciaId, accion, tipoRechazo, comentarioMentor, puntosRecompensa } = await req.json();

    if (!evidenciaId || !accion) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Validar que la acción sea válida
    if (!['APROBAR', 'RECHAZAR_DEFINITIVO', 'RECHAZAR_REQUIERE_ACTUALIZACION'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const mentorId = parseInt(session.user.id);

    // Obtener la evidencia actual
    const evidencia = await prisma.evidenciaAccion.findUnique({
      where: { id: evidenciaId },
      include: {
        Usuario: true,
        Accion: true
      }
    });

    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    // Si la evidencia fue rechazada definitivamente antes, no se pueden ganar puntos
    if (evidencia.rechazadaDefinitivamente && accion === 'APROBAR') {
      return NextResponse.json({ 
        error: 'Esta evidencia fue rechazada definitivamente y no puede generar puntos' 
      }, { status: 400 });
    }

    let resultado;

    // **CASO 1: APROBAR LA EVIDENCIA**
    if (accion === 'APROBAR') {
      const puntosAOtorgar = evidencia.puntosGenerados === 0 
        ? (puntosRecompensa || evidencia.Accion.puntosRecompensa || 100)
        : 0; // Si ya generó puntos antes, no dar más

      // Actualizar la evidencia
      resultado = await prisma.evidenciaAccion.update({
        where: { id: evidenciaId },
        data: {
          estado: 'APROBADA',
          comentarioMentor,
          revisadoPorId: mentorId,
          fechaRevision: new Date(),
          puntosGenerados: evidencia.puntosGenerados + puntosAOtorgar,
          updatedAt: new Date()
        }
      });

      // Otorgar puntos al usuario solo si es la primera aprobación
      if (puntosAOtorgar > 0) {
        await prisma.usuario.update({
          where: { id: evidencia.usuarioId },
          data: {
            puntosCuanticos: { increment: puntosAOtorgar },
            experienciaXP: { increment: Math.floor(puntosAOtorgar / 2) }
          }
        });

        // Crear notificación de aprobación
        await prisma.notificacion.create({
          data: {
            usuarioId: evidencia.usuarioId,
            tipo: 'EVIDENCIA_APROBADA',
            titulo: '✅ Evidencia Aprobada',
            mensaje: `Tu evidencia "${evidencia.Accion.nombre}" ha sido aprobada. Has ganado ${puntosAOtorgar} PC.`,
            leida: false
          }
        });
      } else {
        // Notificación de reaprobación sin puntos
        await prisma.notificacion.create({
          data: {
            usuarioId: evidencia.usuarioId,
            tipo: 'EVIDENCIA_APROBADA',
            titulo: '✅ Evidencia Corregida y Aprobada',
            mensaje: `Tu evidencia corregida "${evidencia.Accion.nombre}" ha sido aprobada.`,
            leida: false
          }
        });
      }

      // Marcar la tarea asociada como completada si existe
      if (evidencia.metaId) {
        await prisma.taskInstance.updateMany({
          where: { 
            metaId: evidencia.metaId,
            accionId: evidencia.accionId,
            estado: { in: ['NOT_STARTED', 'IN_PROGRESS'] }
          },
          data: { 
            estado: 'COMPLETED',
            evidenciaId: evidenciaId
          }
        });
      }

      return NextResponse.json({ 
        message: 'Evidencia aprobada exitosamente',
        puntosEntregados: puntosAOtorgar,
        evidencia: resultado
      });
    }

    // **CASO 2: RECHAZO DEFINITIVO**
    if (accion === 'RECHAZAR_DEFINITIVO') {
      resultado = await prisma.evidenciaAccion.update({
        where: { id: evidenciaId },
        data: {
          estado: 'RECHAZADA',
          tipoRechazo: 'DEFINITIVO',
          rechazadaDefinitivamente: true,
          comentarioMentor,
          revisadoPorId: mentorId,
          fechaRevision: new Date(),
          updatedAt: new Date()
        }
      });

      // Marcar la tarea como NO LOGRADA y removerla de pendientes/retrasadas
      if (evidencia.metaId) {
        await prisma.taskInstance.updateMany({
          where: { 
            metaId: evidencia.metaId,
            accionId: evidencia.accionId
          },
          data: { 
            estado: 'FAILED',
            evidenciaId: null
          }
        });
      }

      // Crear notificación de rechazo definitivo
      await prisma.notificacion.create({
        data: {
          usuarioId: evidencia.usuarioId,
          tipo: 'EVIDENCIA_RECHAZADA',
          titulo: '❌ Evidencia Rechazada Definitivamente',
          mensaje: `Tu evidencia "${evidencia.Accion.nombre}" ha sido rechazada definitivamente. Motivo: ${comentarioMentor || 'No cumple con los requisitos'}.`,
          leida: false
        }
      });

      return NextResponse.json({ 
        message: 'Evidencia rechazada definitivamente',
        evidencia: resultado
      });
    }

    // **CASO 3: RECHAZO CON SOLICITUD DE ACTUALIZACIÓN**
    if (accion === 'RECHAZAR_REQUIERE_ACTUALIZACION') {
      resultado = await prisma.evidenciaAccion.update({
        where: { id: evidenciaId },
        data: {
          estado: 'REQUIERE_CORRECCION',
          tipoRechazo: 'REQUIERE_ACTUALIZACION',
          comentarioMentor,
          revisadoPorId: mentorId,
          fechaRevision: new Date(),
          intentosCorreccion: { increment: 1 },
          updatedAt: new Date()
        }
      });

      // Crear notificación solicitando corrección
      await prisma.notificacion.create({
        data: {
          usuarioId: evidencia.usuarioId,
          tipo: 'EVIDENCIA_REQUIERE_CORRECCION',
          titulo: '⚠️ Evidencia Requiere Corrección',
          mensaje: `Tu evidencia "${evidencia.Accion.nombre}" necesita ser actualizada. Feedback del mentor: ${comentarioMentor || 'Por favor, sube una nueva evidencia'}.`,
          leida: false,
          metadata: JSON.stringify({ evidenciaId, accionId: evidencia.accionId })
        }
      });

      return NextResponse.json({ 
        message: 'Evidencia requiere corrección. Usuario notificado.',
        evidencia: resultado
      });
    }

  } catch (error) {
    logger.error('Error en API Revisar Evidencia:', error);
    return NextResponse.json({ 
      error: 'Fallo al procesar la revisión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}