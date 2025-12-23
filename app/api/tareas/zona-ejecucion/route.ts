import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tareas/zona-ejecucion
 * Obtiene las tareas de HOY y RETRASADAS para el widget de Zona de Ejecución
 * INCLUYE: Tareas de carta + Tareas extraordinarias + Eventos
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('🔍 Cargando tareas para usuario:', userId);

    // Obtener fecha del query param o usar hoy por defecto
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    
    let today: Date;
    let tomorrow: Date;
    
    if (dateParam) {
      // Parsear fecha en UTC para evitar problemas de timezone
      const [year, month, day] = dateParam.split('-').map(Number);
      today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
    } else {
      // Usar fecha LOCAL para determinar qué día es "hoy" para el usuario
      // pero construir las fechas en UTC para comparar con BD
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      console.log('🕐 Componentes de fecha LOCAL:', { year, month, day });
      today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      tomorrow = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
    }
    
    console.log('📅 Rango de fechas UTC:', {
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString()
    });

    // Mapeo de áreas a íconos
    const AREA_ICONS: Record<string, string> = {
      'finanzas': '💰',
      'relaciones': '❤️',
      'salud': '💪',
      'tiempo': '⏰',
      'ocupacion': '💼',
      'espiritualidad': '🙏',
      'ocio': '🎮',
      'pazMental': '🧘',
      'talentos': '🎯'
    };

    const AREA_NAMES: Record<string, string> = {
      'finanzas': 'Finanzas',
      'relaciones': 'Relaciones',
      'salud': 'Salud',
      'tiempo': 'Ocio',
      'ocupacion': 'Talentos',
      'espiritualidad': 'Paz Mental',
      'ocio': 'Ocio',
      'pazMental': 'Paz Mental',
      'talentos': 'Talentos'
    };

    // ========== 1. TAREAS DE CARTA (HOY) ==========
    const tareasCartaHoy = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'PENDING'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        },
        EvidenciaAccion: true // Incluir evidencia para obtener feedback del mentor
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // ========== 2. TAREAS DE CARTA (RETRASADAS) ==========
    const tareasCartaRetrasadas = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId,
        dueDate: {
          lt: today
        },
        status: 'PENDING'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        },
        EvidenciaAccion: true // Incluir evidencia para obtener feedback del mentor
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    });

    // ========== 3. TAREAS EXTRAORDINARIAS Y EVENTOS ==========
    const tareasAdmin = await prisma.taskSubmission.findMany({
      where: {
        usuarioId: userId,
        status: {
          in: ['PENDING', 'SUBMITTED', 'REJECTED', 'EXPIRED'] // Incluir REJECTED para permitir reenvío
        },
        AdminTask: {
          isActive: true
        }
      },
      include: {
        AdminTask: true
      }
    });

    const ahora = new Date();
    
    // Eventos: Mostrar si es del día de hoy O está dentro de las próximas 72 horas (recordatorio)
    const eventosHoy = tareasAdmin.filter(t => {
      if (t.AdminTask.type !== 'EVENT') return false;
      if (!t.AdminTask.fechaEvento) return false;
      
      // La fecha viene como '2025-12-22T18:00:00.000Z' (mediodía en GMT-0600)
      const fechaEvento = new Date(t.AdminTask.fechaEvento);
      
      // Si tiene hora, aplicarla
      if (t.AdminTask.horaEvento) {
        const [hours, minutes] = t.AdminTask.horaEvento.split(':');
        fechaEvento.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        fechaEvento.setHours(23, 59, 59, 999);
      }
      
      // Calcular horas hasta el evento
      const horasHastaEvento = (fechaEvento.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      
      const esHoy = fechaEvento.toDateString() === today.toDateString();
      const dentroVentana72h = horasHastaEvento > 0 && horasHastaEvento <= 72;
      
      console.log(`📅 Evento "${t.AdminTask.titulo}":`, {
        fechaEvento: fechaEvento.toLocaleString('es-MX'),
        esHoy,
        horasHasta: horasHastaEvento.toFixed(1),
        dentroVentana72h,
        incluir: esHoy || dentroVentana72h
      });
      
      return esHoy || dentroVentana72h;
    });
    console.log('⏰ Hora actual del servidor:', ahora.toLocaleString('es-MX'));
    console.log('📅 Today (medianoche):', today);
    console.log('📅 Today toString:', today.toString());
    console.log('📦 Total tareas admin encontradas:', tareasAdmin.length);
    tareasAdmin.forEach(t => {
      console.log(`  - Tarea: "${t.AdminTask.titulo}" | Tipo: ${t.AdminTask.type} | Status: ${t.status} | FechaLimite: ${t.AdminTask.fechaLimite} | Hora: ${t.AdminTask.horaEvento}`);
    });

    // Función helper para calcular deadline completo (fecha + hora)
    const getDeadlineCompleto = (task: any) => {
      if (!task.fechaLimite) return null;
      
      // Convertir fechaLimite a Date si no lo es ya
      const fechaBase = task.fechaLimite instanceof Date 
        ? new Date(task.fechaLimite) 
        : new Date(task.fechaLimite);
      
      // La fechaLimite viene como UTC medianoche (00:00 UTC)
      // Extraer año, mes, día en UTC para mantener la fecha correcta
      const year = fechaBase.getUTCFullYear();
      const month = fechaBase.getUTCMonth();
      const day = fechaBase.getUTCDate();
      
      // Crear nueva fecha en hora local con la fecha UTC y la hora especificada
      let deadline: Date;
      if (task.horaEvento) {
        const [hours, minutes] = task.horaEvento.split(':');
        deadline = new Date(year, month, day, parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        deadline = new Date(year, month, day, 23, 59, 59, 999);
      }
      
      return deadline;
    };

    // Tareas extraordinarias HOY: Mostrar si está dentro de 72 horas antes de expirar O es del día de hoy
    const tareasExtraordinarias = tareasAdmin.filter(t => {
      if (t.AdminTask.type !== 'EXTRAORDINARY') return false;
      
      // Excluir tareas expiradas del widget HOY
      if (t.status === 'EXPIRED') return false;
      
      const deadline = getDeadlineCompleto(t.AdminTask);
      if (!deadline) return true; // Sin deadline = siempre visible
      
      // Calcular horas hasta el deadline
      const horasHastaDeadline = (deadline.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      
      // Verificar que la tarea sea del día de hoy
      const esHoy = deadline.toDateString() === today.toDateString();
      
      // INCLUIR si:
      // 1. Es del día de hoy Y aún no ha pasado el deadline
      // 2. O está dentro de las próximas 72 horas (recordatorio anticipado)
      const dentroVentana72h = horasHastaDeadline > 0 && horasHastaDeadline <= 72;
      const incluir = (esHoy && deadline >= ahora) || dentroVentana72h;
      
      console.log(`📋 Tarea "${t.AdminTask.titulo}":`, {
        fechaLimite: t.AdminTask.fechaLimite,
        deadline: deadline.toLocaleString('es-MX'),
        ahora: ahora.toLocaleString('es-MX'),
        horasHastaDeadline: horasHastaDeadline.toFixed(1),
        esHoy,
        dentroVentana72h,
        incluirEnHOY: incluir,
        status: t.status,
        horaEvento: t.AdminTask.horaEvento
      });
      
      return incluir;
    });

    // Tareas extraordinarias RETRASADAS: deadline ya pasó
    const tareasExtraordinariasRetrasadas = tareasAdmin.filter(t => {
      if (t.AdminTask.type !== 'EXTRAORDINARY') return false;
      
      const deadline = getDeadlineCompleto(t.AdminTask);
      if (!deadline) return false; // Sin deadline no puede estar retrasada
      
      console.log(`🔎 Evaluando si está retrasada "${t.AdminTask.titulo}":`, {
        deadline: deadline,
        deadlineToString: deadline.toString(),
        ahora: ahora,
        ahoraToString: ahora.toString(),
        deadlineTimestamp: deadline.getTime(),
        ahoraTimestamp: ahora.getTime(),
        comparacion: deadline >= ahora ? 'NO RETRASADA (deadline >= ahora)' : 'RETRASADA (deadline < ahora)'
      });
      
      // Solo está retrasada si el deadline completo ya pasó
      if (deadline >= ahora) return false;
      
      // Excluir tareas que expiraron hace más de 48 horas
      const horasPasadas = (ahora.getTime() - deadline.getTime()) / (1000 * 60 * 60);
      if (horasPasadas > 48) {
        console.log(`  ❌ Excluida por más de 48h: ${horasPasadas.toFixed(1)}h`);
        return false; // No mostrar en retrasadas (desaparecer del dashboard)
      }
      
      console.log(`  ✅ Incluida en retrasadas: ${horasPasadas.toFixed(1)}h pasadas`);
      return true; // Está retrasada y dentro de la ventana de 48h
    });

    // Marcar automáticamente como EXPIRED las tareas retrasadas que aún están PENDING
    const tareasToExpire = tareasExtraordinariasRetrasadas.filter(t => t.status === 'PENDING');
    if (tareasToExpire.length > 0) {
      await prisma.taskSubmission.updateMany({
        where: {
          id: {
            in: tareasToExpire.map(t => t.id)
          }
        },
        data: {
          status: 'EXPIRED'
        }
      });
      console.log(`⏰ Marcadas ${tareasToExpire.length} tareas como EXPIRED automáticamente`);
      
      // Actualizar el status en memoria para que se refleje en la respuesta
      tareasToExpire.forEach(t => {
        t.status = 'EXPIRED';
      });
    }

    // ========== FORMATEAR TAREAS DE CARTA ==========
    const formatTaskInstance = (task: any) => ({
      id: `carta-${task.id}`,
      taskId: task.id,
      accionId: task.accionId,
      metaId: task.Accion?.metaId,
      tipo: 'CARTA' as const,
      texto: task.Accion?.texto || 'Tarea sin descripción',
      area: AREA_NAMES[task.Accion?.Meta?.categoria || ''] || 'General',
      areaIcon: AREA_ICONS[task.Accion?.Meta?.categoria || ''] || '🎯',
      metaContext: task.Accion?.Meta?.metaPrincipal || 'Meta general',
      fechaProgramada: task.dueDate.toISOString(),
      status: task.status,
      evidenceStatus: task.evidenceStatus,
      evidenciaUrl: task.evidenceUrl,
      feedbackMentor: task.EvidenciaAccion?.feedbackMentor || null, // Agregar feedback del mentor
      pointsReward: 0,
      requiereEvidencia: true
    });

    // ========== FORMATEAR TAREAS ADMIN ==========
    const formatAdminTask = (submission: any) => {
      const task = submission.AdminTask;
      const isEvent = task.type === 'EVENT';
      
      return {
        id: `admin-${submission.id}`,
        submissionId: submission.id,
        tipo: isEvent ? 'EVENTO' : 'EXTRAORDINARIA',
        texto: task.titulo,
        area: isEvent ? 'Evento' : 'Misión Especial',
        areaIcon: isEvent ? '📅' : '⚡️',
        metaContext: task.descripcion || (isEvent ? `${task.lugar || 'Virtual'} - ${task.horaEvento || ''}` : 'Asignado por Mentoría'),
        fechaProgramada: (task.fechaEvento || task.fechaLimite || new Date()).toISOString(),
        status: submission.status,
        evidenceStatus: submission.status === 'SUBMITTED' ? 'PENDING' : 'NONE',
        evidenciaUrl: submission.evidenciaUrl,
        feedbackMentor: submission.feedbackMentor, // Agregar feedback del mentor
        pointsReward: task.pointsReward,
        requiereEvidencia: task.requiereEvidencia,
        lugar: task.lugar,
        horaEvento: task.horaEvento,
        deadline: task.fechaLimite, // Para countdown de misiones flash
        horaLimite: task.horaEvento // Hora límite para misiones flash
      };
    };

    // ========== COMBINAR Y ORDENAR POR PRIORIDAD ==========
    const tareasHoy = [
      ...eventosHoy.map(formatAdminTask), // Prioridad 1: Eventos
      ...tareasExtraordinarias.map(formatAdminTask), // Prioridad 2: Extraordinarias
      ...tareasCartaHoy.map(formatTaskInstance) // Prioridad 3: Carta
    ];

    const tareasRetrasadas = [
      ...tareasExtraordinariasRetrasadas.map(formatAdminTask),
      ...tareasCartaRetrasadas.map(formatTaskInstance)
    ];

    console.log('✅ Tareas procesadas:', {
      eventosHoy: eventosHoy.length,
      extraordinarias: tareasExtraordinarias.length,
      cartaHoy: tareasCartaHoy.length,
      retrasadasExtra: tareasExtraordinariasRetrasadas.length,
      retrasadasCarta: tareasCartaRetrasadas.length,
      totalHoy: tareasHoy.length,
      totalRetrasadas: tareasRetrasadas.length
    });

    return NextResponse.json({
      tareasHoy,
      tareasRetrasadas,
      totalHoy: tareasHoy.length,
      totalRetrasadas: tareasRetrasadas.length,
      breakdown: {
        eventos: eventosHoy.length,
        extraordinarias: tareasExtraordinarias.length,
        carta: tareasCartaHoy.length,
        retrasadasExtraordinarias: tareasExtraordinariasRetrasadas.length,
        retrasadasCarta: tareasCartaRetrasadas.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo tareas de zona de ejecución:', error);
    return NextResponse.json(
      { error: 'Error al obtener tareas', details: error.message },
      { status: 500 }
    );
  }
}
