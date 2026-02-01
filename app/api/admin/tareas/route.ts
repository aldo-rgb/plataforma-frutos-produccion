import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper para crear submissions según targetType
async function crearSubmissionsMultiDay(
  tareasDiarias: any[],
  targetType: string,
  targetId: number | null,
  usuario: any,
  userId: number
) {
  if (targetType === 'ALL') {
    const whereClause: any = {
      rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
      isActive: true
    };
    
    if (usuario.rol === 'MENTOR') {
      whereClause.assignedMentorId = userId;
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: { id: true }
    });

    // Crear submissions para TODAS las tareas diarias
    for (const tarea of tareasDiarias) {
      if (usuarios.length > 0) {
        await prisma.taskSubmission.createMany({
          data: usuarios.map(u => ({
            adminTaskId: tarea.id,
            usuarioId: u.id,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }
    }

    console.log(`✅ ${usuarios.length} usuarios × ${tareasDiarias.length} días = ${usuarios.length * tareasDiarias.length} submissions creadas`);
    
  } else if (targetType === 'GROUP' && targetId) {
    const whereClause: any = {
      rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
      isActive: true,
      visionId: targetId
    };
    
    if (usuario.rol === 'MENTOR') {
      whereClause.assignedMentorId = userId;
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: { id: true }
    });

    for (const tarea of tareasDiarias) {
      if (usuarios.length > 0) {
        await prisma.taskSubmission.createMany({
          data: usuarios.map(u => ({
            adminTaskId: tarea.id,
            usuarioId: u.id,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }
    }

    console.log(`✅ Grupo: ${usuarios.length} usuarios × ${tareasDiarias.length} días`);
    
  } else if (targetType === 'USER' && targetId) {
    if (usuario.rol === 'MENTOR') {
      const targetUser = await prisma.usuario.findUnique({
        where: { id: targetId },
        select: { assignedMentorId: true }
      });

      if (!targetUser || targetUser.assignedMentorId !== userId) {
        throw new Error('Solo puedes asignar tareas a tus mentorados');
      }
    }
    
    for (const tarea of tareasDiarias) {
      await prisma.taskSubmission.create({
        data: {
          adminTaskId: tarea.id,
          usuarioId: targetId,
          status: 'PENDING'
        }
      });
    }

    console.log(`✅ Usuario individual: ${tareasDiarias.length} tareas diarias asignadas`);
  }
}

/**
 * GET /api/admin/tareas
 * Obtiene todas las tareas administrativas
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('🔍 GET /api/admin/tareas - Session:', session?.user?.id ? `User ${session.user.id}` : 'No session');
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de admin/staff/coordinador/mentor
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true, id: true, nombre: true }
    });

    console.log('👤 Usuario solicitando tareas:', { id: user?.id, rol: user?.rol, nombre: user?.nombre });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Lista de roles permitidos: Solo Admin, Coordinador, Director y School Admin
    const rolesPermitidos = ['ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'];
    
    if (!rolesPermitidos.includes(user.rol)) {
      console.log('❌ Acceso denegado para rol:', user.rol);
      return NextResponse.json({ 
        error: 'Acceso denegado',
        mensaje: `Tu rol actual es ${user.rol}. Solo Administradores, Coordinadores, Directores y School Admins pueden acceder.`
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // EXTRAORDINARY o EVENT
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';
    
    // Si es mentor, solo ver sus tareas
    if (user.rol === 'MENTOR') {
      where.createdBy = user.id;
    }

    const tareas = await prisma.adminTask.findMany({
      where,
      include: {
        Creator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Submissions: {
          select: {
            id: true,
            status: true,
            usuarioId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('✅ Tareas encontradas:', tareas.length);

    const tareasFormatted = tareas.map(tarea => ({
      ...tarea,
      stats: {
        totalSubmissions: tarea.Submissions.length,
        pendingSubmissions: tarea.Submissions.filter(s => s.status === 'PENDING' || s.status === 'SUBMITTED').length,
        approvedSubmissions: tarea.Submissions.filter(s => s.status === 'APPROVED').length,
        expiredSubmissions: tarea.Submissions.filter(s => s.status === 'EXPIRED').length
      }
    }));

    return NextResponse.json(tareasFormatted);

  } catch (error: any) {
    console.error('❌ Error obteniendo tareas admin:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Error al obtener tareas', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tareas
 * Crea una nueva tarea administrativa o evento
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verificar rol de admin/staff/coordinador/mentor
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true, nombre: true }
    });

    console.log('👤 Usuario creando tarea:', { id: userId, rol: usuario?.rol, nombre: usuario?.nombre });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const rolesPermitidos = ['ADMINISTRADOR', 'ADMIN', 'COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'];
    
    if (!rolesPermitidos.includes(usuario.rol)) {
      console.log('❌ Acceso denegado para rol:', usuario.rol);
      return NextResponse.json({ 
        error: 'Acceso denegado',
        mensaje: `Tu rol actual es ${usuario.rol}. Solo Administradores, Coordinadores, Directores y School Admins pueden crear tareas.`
      }, { status: 403 });
    }

    const body = await req.json();
    const {
      type,
      titulo,
      descripcion,
      pointsReward,
      targetType,
      targetId,
      fechaLimite,
      fechaEvento,
      horaEvento,
      lugar,
      requiereEvidencia,
      isMultiDay,
      duracionDias,
      horaLimiteDiaria
    } = body;

    // Validaciones
    if (!type || !titulo || !targetType) {
      return NextResponse.json(
        { error: 'Campos requeridos: type, titulo, targetType' },
        { status: 400 }
      );
    }

    // Validar que la fecha límite no sea anterior a ahora (considerando hora si existe)
    if (fechaLimite) {
      if (horaEvento) {
        // Si tiene hora, validar fecha+hora completa
        const fechaHoraLimite = new Date(`${fechaLimite}T${horaEvento}`);
        const ahora = new Date();
        
        if (fechaHoraLimite < ahora) {
          return NextResponse.json(
            { error: 'La fecha y hora límite deben ser futuras' },
            { status: 400 }
          );
        }
      } else {
        // Si no tiene hora, solo validar que la fecha no sea anterior a ayer
        const fechaLimiteDate = new Date(fechaLimite);
        fechaLimiteDate.setHours(0, 0, 0, 0);
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        ayer.setHours(0, 0, 0, 0);
        
        if (fechaLimiteDate < ayer) {
          return NextResponse.json(
            { error: 'La fecha límite no puede ser anterior a hoy' },
            { status: 400 }
          );
        }
      }
    }

    // Validar que la fecha del evento no sea anterior a ahora (considerando hora si existe)
    if (fechaEvento) {
      if (horaEvento) {
        // Si tiene hora, validar fecha+hora completa
        const fechaHoraEvento = new Date(`${fechaEvento}T${horaEvento}`);
        const ahora = new Date();
        
        if (fechaHoraEvento < ahora) {
          return NextResponse.json(
            { error: 'La fecha y hora del evento deben ser futuras' },
            { status: 400 }
          );
        }
      } else {
        // Si no tiene hora, solo validar que la fecha no sea anterior a ayer
        const fechaEventoDate = new Date(fechaEvento);
        fechaEventoDate.setHours(0, 0, 0, 0);
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        ayer.setHours(0, 0, 0, 0);
        
        if (fechaEventoDate < ayer) {
          return NextResponse.json(
            { error: 'La fecha del evento no puede ser anterior a hoy' },
            { status: 400 }
          );
        }
      }
    }

    // Helper para convertir fecha YYYY-MM-DD a Date
    // Guardar como medianoche UTC del día siguiente para mantener la fecha correcta en cualquier timezone
    const parseFechaLocal = (fechaStr: string): Date => {
      // Parsear como UTC medianoche para evitar problemas de timezone
      // Añadimos 'T00:00:00.000Z' para que se interprete como UTC
      const fecha = new Date(fechaStr + 'T00:00:00.000Z');
      
      console.log('📅 parseFechaLocal UTC:', {
        input: fechaStr,
        fechaCreada: fecha,
        fechaString: fecha.toString(),
        fechaISO: fecha.toISOString(),
        fechaLocal: fecha.toLocaleString('es-MX', { timeZone: 'America/Monterrey' })
      });
      
      return fecha;
    };

    console.log('🔧 Datos de entrada para fechas:', {
      fechaLimite,
      fechaEvento,
      horaEvento
    });

    const fechaLimiteParsed = fechaLimite ? parseFechaLocal(fechaLimite) : null;
    const fechaEventoParsed = fechaEvento ? parseFechaLocal(fechaEvento) : null;

    console.log('🔧 Fechas parseadas:', {
      fechaLimiteParsed,
      fechaEventoParsed
    });

    // Si es multi-día, crear tarea padre y tareas diarias
    if (isMultiDay && duracionDias && duracionDias > 1) {
      console.log(`🗓️ Creando misión multi-día de ${duracionDias} días`);

      // Crear la tarea padre (contenedor)
      const tareaParent = await prisma.adminTask.create({
        data: {
          type,
          titulo,
          descripcion: descripcion || null,
          pointsReward: pointsReward || 0,
          targetType,
          targetId: targetId || null,
          fechaLimite: fechaLimiteParsed,
          horaEvento: horaEvento || null,
          requiereEvidencia: requiereEvidencia || false,
          createdBy: userId,
          isMultiDay: true,
          duracionDias,
          horaLimiteDiaria: horaLimiteDiaria || '23:59'
        }
      });

      // Crear tareas diarias (subtareas)
      const fechaInicio = fechaLimiteParsed ? new Date(fechaLimiteParsed) : new Date();
      const tareasDiarias = [];

      for (let dia = 1; dia <= duracionDias; dia++) {
        const fechaDia = new Date(fechaInicio);
        fechaDia.setDate(fechaInicio.getDate() + (dia - 1));

        const tareaHija = await prisma.adminTask.create({
          data: {
            type,
            titulo: `${titulo} - Día ${dia}/${duracionDias}`,
            descripcion: `${descripcion || ''}\n\n🗓️ Día ${dia} de ${duracionDias} - Debes completar TODOS los días para ganar los puntos.`,
            pointsReward: 0, // Los puntos se dan al completar TODA la misión
            targetType,
            targetId: targetId || null,
            fechaLimite: fechaDia,
            horaEvento: horaLimiteDiaria || '23:59',
            requiereEvidencia: requiereEvidencia || false,
            createdBy: userId,
            isMultiDay: false,
            parentTaskId: tareaParent.id,
            diaNumero: dia
          }
        });

        tareasDiarias.push(tareaHija);
      }

      console.log(`✅ Misión multi-día creada: 1 padre + ${tareasDiarias.length} tareas diarias`);

      // Auto-crear submissions para las tareas diarias
      await crearSubmissionsMultiDay(tareasDiarias, targetType, targetId, usuario, userId);

      return NextResponse.json({
        success: true,
        tarea: tareaParent,
        tareasDiarias: tareasDiarias.length,
        mensaje: `Misión multi-día creada con ${duracionDias} días consecutivos`
      });
    }

    // Crear la tarea normal (no multi-día)
    const tarea = await prisma.adminTask.create({
      data: {
        type,
        titulo,
        descripcion: descripcion || null,
        pointsReward: pointsReward || 0,
        targetType,
        targetId: targetId || null,
        fechaLimite: fechaLimiteParsed,
        fechaEvento: fechaEventoParsed,
        horaEvento: horaEvento || null,
        lugar: lugar || null,
        requiereEvidencia: requiereEvidencia || false,
        createdBy: userId
      },
      include: {
        Creator: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    // Auto-crear submissions según targetType y rol del creador
    if (targetType === 'ALL') {
      // Si es MENTOR: solo sus mentorados (PARTICIPANTES y GAMECHANGERS)
      // Si es ADMIN/COORDINADOR: todos los participantes y gamechangers
      const whereClause: any = {
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
        isActive: true
      };
      
      if (usuario.rol === 'MENTOR') {
        whereClause.assignedMentorId = userId;
      }

      const usuarios = await prisma.usuario.findMany({
        where: whereClause,
        select: { id: true }
      });

      // Crear submissions en batch
      if (usuarios.length > 0) {
        await prisma.taskSubmission.createMany({
          data: usuarios.map(u => ({
            adminTaskId: tarea.id,
            usuarioId: u.id,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }

      console.log(`✅ Tarea ${tarea.id} creada por ${usuario.rol} con ${usuarios.length} submissions automáticas`);
      
    } else if (targetType === 'GROUP') {
      // Filtrar por visión/grupo (PARTICIPANTES y GAMECHANGERS)
      const whereClause: any = {
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
        isActive: true
        // vision: targetId // Descomentar cuando exista el modelo
      };
      
      if (usuario.rol === 'MENTOR') {
        whereClause.assignedMentorId = userId;
      }

      const usuarios = await prisma.usuario.findMany({
        where: whereClause,
        select: { id: true }
      });

      if (usuarios.length > 0) {
        await prisma.taskSubmission.createMany({
          data: usuarios.map(u => ({
            adminTaskId: tarea.id,
            usuarioId: u.id,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }

      console.log(`✅ Tarea ${tarea.id} creada para grupo con ${usuarios.length} submissions`);
      
    } else if (targetType === 'USER' && targetId) {
      // Verificar que el usuario target sea mentorado del mentor (si aplica)
      if (usuario.rol === 'MENTOR') {
        const targetUser = await prisma.usuario.findUnique({
          where: { id: targetId },
          select: { assignedMentorId: true }
        });

        if (!targetUser || targetUser.assignedMentorId !== userId) {
          return NextResponse.json(
            { error: 'Solo puedes asignar tareas a tus mentorados' },
            { status: 403 }
          );
        }
      }
      
      // Crear submission para usuario específico
      await prisma.taskSubmission.create({
        data: {
          adminTaskId: tarea.id,
          usuarioId: targetId,
          status: 'PENDING'
        }
      });

      console.log(`✅ Tarea ${tarea.id} creada para usuario individual ${targetId}`);
    }

    return NextResponse.json({
      success: true,
      tarea
    });

  } catch (error: any) {
    console.error('❌ Error creando tarea admin:', error);
    return NextResponse.json(
      { error: 'Error al crear tarea', details: error.message },
      { status: 500 }
    );
  }
}
