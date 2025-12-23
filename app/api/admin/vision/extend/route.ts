import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateExtensionDate, getLastTaskDate } from '@/lib/dateCalculator';
import { generateAdditionalTasks } from '@/lib/taskGenerator';
import { addDays } from 'date-fns';

/**
 * POST /api/admin/vision/extend
 * Extiende la fecha de fin de una visión y genera tareas adicionales
 * para todos los usuarios activos del grupo
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminId = parseInt(session.user.id);

    // Verificar permisos
    const admin = await prisma.usuario.findUnique({
      where: { id: adminId },
      select: { rol: true }
    });

    if (!admin || !['ADMIN', 'STAFF'].includes(admin.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { visionId, newEndDate } = await req.json();

    if (!visionId || !newEndDate) {
      return NextResponse.json({ error: 'visionId y newEndDate son requeridos' }, { status: 400 });
    }

    console.log(`🔄 EXTENSIÓN DE VISIÓN iniciada por Admin #${adminId}`);
    console.log(`   Vision ID: ${visionId}`);
    console.log(`   Nueva fecha fin: ${newEndDate}`);

    // Obtener visión actual
    const vision = await prisma.vision.findUnique({
      where: { id: visionId }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Validar nueva fecha
    const validation = validateExtensionDate(vision.endDate, new Date(newEndDate));
    
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    console.log(`   Días adicionales: ${validation.additionalDays}`);

    // Obtener todos los usuarios activos de esta visión
    const users = await prisma.usuario.findMany({
      where: {
        visionId: visionId,
        ProgramEnrollment: {
          some: {
            status: 'ACTIVE',
            visionId: visionId
          }
        }
      },
      select: { id: true, nombre: true, email: true }
    });

    console.log(`   👥 ${users.length} usuarios activos en la visión "${vision.name}"`);

    if (users.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Visión extendida pero no hay usuarios activos' 
      });
    }

    const results = [];

    // Generar tareas adicionales para cada usuario
    for (const user of users) {
      try {
        // Encontrar última tarea generada
        const lastTaskDate = await getLastTaskDate(user.id);
        
        if (!lastTaskDate) {
          console.log(`   ⚠️ Usuario ${user.nombre}: Sin tareas previas, saltando`);
          continue;
        }

        // Generar desde (última tarea + 1 día) hasta nueva fecha fin
        const fromDate = addDays(lastTaskDate, 1);
        const toDate = new Date(newEndDate);

        console.log(`   📋 Generando tareas para ${user.nombre} desde ${fromDate.toISOString().split('T')[0]}`);

        const result = await generateAdditionalTasks(user.id, fromDate, toDate);

        results.push({
          userId: user.id,
          userName: user.nombre,
          tasksCreated: result.tasksCreated,
          success: result.success
        });

      } catch (error: any) {
        console.error(`   ❌ Error con usuario ${user.nombre}:`, error.message);
        results.push({
          userId: user.id,
          userName: user.nombre,
          tasksCreated: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Actualizar fecha de fin de la visión
    await prisma.vision.update({
      where: { id: visionId },
      data: {
        endDate: new Date(newEndDate),
        updatedAt: new Date()
      }
    });

    // Actualizar enrollments
    await prisma.programEnrollment.updateMany({
      where: {
        visionId: visionId,
        status: 'ACTIVE'
      },
      data: {
        cycleEndDate: new Date(newEndDate),
        updatedAt: new Date()
      }
    });

    // Registrar en log
    await prisma.adminActionLog.create({
      data: {
        adminId: adminId,
        targetVisionId: visionId,
        actionType: 'EXTEND_VISION',
        details: {
          visionName: vision.name,
          oldEndDate: vision.endDate,
          newEndDate: newEndDate,
          additionalDays: validation.additionalDays,
          usersAffected: users.length,
          results: results
        }
      }
    });

    const totalTasksCreated = results.reduce((sum, r) => sum + r.tasksCreated, 0);

    console.log(`✅ Visión extendida: ${totalTasksCreated} tareas adicionales generadas`);

    return NextResponse.json({
      success: true,
      message: `Visión "${vision.name}" extendida exitosamente`,
      details: {
        visionName: vision.name,
        newEndDate: newEndDate,
        additionalDays: validation.additionalDays,
        usersAffected: users.length,
        totalTasksCreated: totalTasksCreated,
        results: results
      }
    });

  } catch (error: any) {
    console.error('❌ Error extendiendo visión:', error);
    return NextResponse.json(
      { error: 'Error al extender visión', details: error.message },
      { status: 500 }
    );
  }
}
