import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/evidencias/upload
 * Sube una evidencia (foto) para una tarea de CARTA o ADMIN
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await req.formData();
    
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') ? parseInt(formData.get('taskId') as string) : null;
    const submissionId = formData.get('submissionId') ? parseInt(formData.get('submissionId') as string) : null;
    const comentario = formData.get('comentario') as string || '';

    if (!file || (!taskId && !submissionId)) {
      return NextResponse.json(
        { error: 'Archivo y (taskId o submissionId) son requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos de imagen' },
        { status: 400 }
      );
    }

    // ========== CASO 1: Tarea de CARTA (TaskInstance) ==========
    if (taskId) {
      const task = await prisma.taskInstance.findUnique({
        where: { id: taskId },
        include: {
          Accion: {
            include: {
              Meta: true
            }
          }
        }
      });

      if (!task || task.usuarioId !== userId) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o sin permisos' },
          { status: 404 }
        );
      }

      // Generar nombre único para el archivo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExtension = file.name.split('.').pop();
      const fileName = `evidencia_carta_${userId}_${taskId}_${Date.now()}.${fileExtension}`;
      
      // Guardar archivo en public/uploads/evidencias
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'evidencias');
      const filePath = join(uploadDir, fileName);
      
      try {
        await writeFile(filePath, buffer);
      } catch (writeError) {
        console.error('Error writing file:', writeError);
        const { mkdir } = await import('fs/promises');
        await mkdir(uploadDir, { recursive: true });
        await writeFile(filePath, buffer);
      }

      const publicUrl = `/uploads/evidencias/${fileName}`;

      // Crear registro en EvidenciaAccion
      const evidenciaAccion = await prisma.evidenciaAccion.create({
        data: {
          accionId: task.accionId,
          usuarioId: userId,
          fotoUrl: publicUrl,
          descripcion: comentario,
          estado: 'PENDIENTE',
          updatedAt: new Date()
        }
      });

      // Actualizar el evidenceStatus de la tarea a PENDING
      await prisma.taskInstance.update({
        where: { id: taskId },
        data: {
          evidenceStatus: 'PENDING'
        }
      });

      console.log(`✅ Evidencia CARTA subida para tarea ${taskId} por usuario ${userId}`);

      return NextResponse.json({
        success: true,
        type: 'CARTA',
        evidencia: {
          id: evidenciaAccion.id,
          url: publicUrl
        }
      });
    }

    // ========== CASO 2: Tarea ADMIN (TaskSubmission) ==========
    if (submissionId) {
      const submission = await prisma.taskSubmission.findUnique({
        where: { id: submissionId },
        include: {
          AdminTask: true
        }
      });

      if (!submission || submission.usuarioId !== userId) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o sin permisos' },
          { status: 404 }
        );
      }

      // 💀 VALIDACIÓN CRÍTICA: Verificar si la misión está expirada
      if (submission.status === 'EXPIRED') {
        return NextResponse.json(
          { 
            error: '💀 Misión Flash caducada',
            message: 'Esta misión ya expiró. No puedes subir evidencia. Oportunidad perdida.',
            deadlinePassed: true
          },
          { status: 410 } // 410 Gone - Resource no longer available
        );
      }

      // Validación adicional: Verificar deadline en tiempo real
      if (submission.AdminTask.type === 'EXTRAORDINARY' && submission.AdminTask.fechaLimite) {
        // 🔧 FIX TIMEZONE: Extraer componentes UTC y reconstruir en hora local
        const deadlineUTC = new Date(submission.AdminTask.fechaLimite);
        const year = deadlineUTC.getUTCFullYear();
        const month = deadlineUTC.getUTCMonth();
        const day = deadlineUTC.getUTCDate();
        const deadline = new Date(year, month, day);
        
        // Si hay hora límite, usarla
        if (submission.AdminTask.horaEvento) {
          const [hours, minutes] = submission.AdminTask.horaEvento.split(':');
          deadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
          deadline.setHours(23, 59, 59, 999);
        }

        if (new Date() > deadline) {
          // Expirar inmediatamente
          await prisma.taskSubmission.update({
            where: { id: submissionId },
            data: {
              status: 'EXPIRED',
              puntosGanados: 0,
              feedbackMentor: `💀 Misión expirada. Deadline: ${deadline.toLocaleString('es-MX')}`
            }
          });

          return NextResponse.json(
            { 
              error: '⏰ Tiempo agotado',
              message: `La misión expiró el ${deadline.toLocaleString('es-MX')}. Ya no puedes subir evidencia.`,
              deadlinePassed: true
            },
            { status: 410 }
          );
        }
      }

      // Generar nombre único para el archivo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileExtension = file.name.split('.').pop();
      const fileName = `evidencia_admin_${userId}_${submissionId}_${Date.now()}.${fileExtension}`;
      
      // Guardar archivo en public/uploads/evidencias
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'evidencias');
      const filePath = join(uploadDir, fileName);
      
      try {
        await writeFile(filePath, buffer);
      } catch (writeError) {
        console.error('Error writing file:', writeError);
        const { mkdir } = await import('fs/promises');
        await mkdir(uploadDir, { recursive: true });
        await writeFile(filePath, buffer);
      }

      const publicUrl = `/uploads/evidencias/${fileName}`;

      // Actualizar TaskSubmission con evidencia y cambiar status a SUBMITTED
      await prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          evidenciaUrl: publicUrl,
          comentario: comentario,
          status: 'SUBMITTED',
          submittedAt: new Date()
        }
      });

      console.log(`✅ Evidencia ADMIN subida para submission ${submissionId} por usuario ${userId}`);

      return NextResponse.json({
        success: true,
        type: 'ADMIN',
        evidencia: {
          id: submissionId,
          url: publicUrl
        }
      });
    }

    return NextResponse.json(
      { error: 'Tipo de tarea no identificado' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Error subiendo evidencia:', error);
    return NextResponse.json(
      { error: 'Error al subir evidencia', details: error.message },
      { status: 500 }
    );
  }
}
