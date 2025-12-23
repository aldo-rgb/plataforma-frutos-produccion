// app/api/evidencia/revisar/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obtener todas las evidencias con información del usuario
    const evidencias = await prisma.evidencia.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fechaSubida: 'desc',
      },
    });

    return NextResponse.json({ evidencias });
  } catch (error) {
    console.error('Error al obtener evidencias:', error);
    return NextResponse.json({ error: 'Error al cargar evidencias' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { evidenciaId, accion, puntosRecompensa } = await req.json();

    if (!evidenciaId || !accion) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Validar que la acción sea válida
    if (accion !== 'APROBAR' && accion !== 'RECHAZAR') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const estadoFinal = accion === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';

    // 4. LOGICA DE RECOMPENSA (Solo si es APROBADO)
    if (estadoFinal === 'APROBADO') {
      // **ACTUALIZAR PUNTOS Y ENVIAR NOTIFICACIÓN DE ÉXITO**
      // await prisma.usuario.update({
      //   where: { id: evidencia.usuarioId },
      //   data: { puntosAcumulados: { increment: puntosRecompensa || 500 } }
      // });
    } else {
      // Si es RECHAZADO, intentar revertir la tarea (si existe en BD)
      // NOTA: Por ahora las tareas son solo UI local, así que esto no hará nada.
      // Cuando tengas tareas reales en BD, este código revertirá correctamente.
      try {
        const revertido = await prisma.tarea.updateMany({
          where: { evidenciaId: evidenciaId },
          data: { completada: false, evidenciaId: null },
        });
        
        if (revertido.count === 0) {
          console.warn(`[INFO] No se encontró Tarea en BD con evidenciaId: ${evidenciaId}. (Normal si las tareas son solo UI local)`);
        } else {
          console.log(`[ÉXITO] Tarea revertida. Rows afectados: ${revertido.count}`);
        }
      } catch (revertError) {
        console.error("Error al intentar revertir la tarea:", revertError);
      }

      // Eliminar la evidencia rechazada de todos modos
      await prisma.evidencia.delete({
        where: { id: evidenciaId },
      });
    }

    return NextResponse.json({ 
      message: `Evidencia ${evidenciaId} marcada como ${estadoFinal}.`, 
      puntosEntregados: estadoFinal === 'APROBADO' ? (puntosRecompensa || 500) : 0
    });

  } catch (error) {
    console.error('Error en API Revisar Evidencia (Capturado):', error);
    // Devolvemos 500 para la revisión, indicando un fallo interno
    return NextResponse.json({ error: 'Fallo al procesar la revisión. Verifique el log de la BD para detalles de clave foránea.' }, { status: 500 });
  }
}