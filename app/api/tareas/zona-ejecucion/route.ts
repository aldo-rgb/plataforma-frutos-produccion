import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

    // Verificar si el usuario está marcado como DROP
    const visionEnrollment = await prisma.vision_enrollments.findFirst({
      where: { userId },
      select: { attendanceStatus: true }
    });

    if (visionEnrollment?.attendanceStatus === 'DROP') {
      console.log('⚠️ Usuario marcado como DROP - retornando vacío');
      return NextResponse.json({
        tareasHoy: [],
        tareasRetrasadas: [],
        tareasAdmin: [],
        misionesTrainer: [],
        isDropped: true
      });
    }

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

    // DEBUG: Verificar todas las tareas del usuario sin filtros de fecha
    const allUserTasks = await prisma.taskInstance.findMany({
      where: {
        usuarioId: userId
      },
      select: {
        id: true,
        dueDate: true,
        status: true
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 20
    });
    console.log(`🔍 DEBUG: Usuario ${userId} tiene ${allUserTasks.length} tareas totales (sample 20):`, 
      allUserTasks.map(t => ({
        id: t.id,
        dueDate: t.dueDate.toISOString(),
        dueDateLocal: format(new Date(t.dueDate), 'yyyy-MM-dd', { locale: es }),
        status: t.status
      }))
    );

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
        EvidenciaAccion: true // Incluir evidencia relacionada por evidenciaId
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    console.log(`📦 Total tareas carta encontradas: ${tareasCartaHoy.length}`);
    console.log('  - Tareas de hoy:', tareasCartaHoy.map(t => ({ 
      id: t.id, 
      accion: t.Accion?.texto, 
      dueDate: t.dueDate,
      status: t.status 
    })));

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
        EvidenciaAccion: true // Incluir evidencia relacionada por evidenciaId
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

    // ========== 4. MISIONES DEL ENTRENADOR (TrainerMission) ==========
    const misionesTrainer = await prisma.missionSubmission.findMany({
      where: {
        userId: userId,
        status: {
          in: ['PENDING', 'SUBMITTED', 'REJECTED']
        },
        Mission: {
          status: 'ACTIVE',
          releaseAt: {
            lte: new Date() // Solo misiones ya liberadas
          }
        }
      },
      include: {
        Mission: {
          include: {
            Template: {
              include: {
                Questions: true
              }
            },
            Trainer: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            },
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });
    console.log(`📦 Misiones de trainer encontradas: ${misionesTrainer.length}`);

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
      evidenciaUrl: task.EvidenciaAccion?.fotoUrl || null,
      feedbackMentor: task.EvidenciaAccion?.comentarioMentor || null,
      pointsReward: 0,
      requiereEvidencia: true
    });

    // ========== FORMATEAR TAREAS ADMIN ==========
    const formatAdminTask = (submission: any) => {
      const task = submission.AdminTask;
      const isEvent = task.type === 'EVENT';
      const isArchetype = task.type === 'ARCHETYPE_REVIEW';
      const isMetamorfosis = task.type === 'METAMORFOSIS_REVIEW';
      
      // Determinar el tipo de tarea
      let tipo = 'EXTRAORDINARIA';
      let area = 'Misión Especial';
      let areaIcon = '⚡️';
      
      if (isArchetype) {
        tipo = 'PERSONAJE';
        area = 'Casting';
        areaIcon = '🎭';
      } else if (isMetamorfosis) {
        tipo = 'SALTO_CUANTICO';
        area = 'Salto Cuántico';
        areaIcon = '⚡';
      } else if (isEvent) {
        tipo = 'EVENTO';
        area = 'Evento';
        areaIcon = '📅';
      }
      
      return {
        id: `admin-${submission.id}`,
        submissionId: submission.id,
        tipo,
        texto: task.titulo,
        area,
        areaIcon,
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

    // ========== FORMATEAR MISIONES DEL TRAINER ==========
    const formatTrainerMission = (submission: any) => {
      const mission = submission.Mission;
      const template = mission.Template;
      const trainer = mission.Trainer;
      
      return {
        id: `trainer-${submission.id}`,
        submissionId: submission.id,
        missionId: mission.id,
        tipo: 'TRAINER_MISSION' as const,
        texto: template.title,
        area: 'Misión del Entrenador',
        areaIcon: '🎯',
        metaContext: mission.Vision?.nombre 
          ? `${trainer?.nombre || 'Entrenador'} • ${mission.Vision.nombre}`
          : trainer?.nombre || 'Asignado por Entrenador',
        fechaProgramada: mission.releaseAt.toISOString(),
        status: submission.status,
        evidenceStatus: submission.status === 'SUBMITTED' ? 'PENDING' : 'NONE',
        evidenciaUrl: submission.evidenceUrl,
        feedbackMentor: submission.reviewNote,
        pointsReward: template.pointsReward || 0,
        requiereEvidencia: template.requiresEvidence || false,
        deadline: mission.deadlineAt,
        trainerMessage: mission.trainerMessage,
        trainer: trainer ? {
          id: trainer.id,
          nombre: trainer.nombre,
          imagen: trainer.imagen
        } : null,
        template: {
          id: template.id,
          title: template.title,
          type: template.type,
          instructions: template.instructions,
          hasQuestions: template.Questions?.length > 0,
          questionsCount: template.Questions?.length || 0,
          tags: template.tags || []
        }
      };
    };

    // Filtrar misiones del trainer que son de HOY o tienen deadline pronto
    const misionesTrainerHoy = misionesTrainer.filter(m => {
      // Si no tiene deadline, siempre mostrar
      if (!m.Mission.deadlineAt) return true;
      
      const deadline = new Date(m.Mission.deadlineAt);
      const horasHastaDeadline = (deadline.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      
      // Mostrar si el deadline es en las próximas 72 horas
      return horasHastaDeadline > 0 && horasHastaDeadline <= 72;
    });

    console.log(`📦 Misiones trainer para mostrar hoy: ${misionesTrainerHoy.length}`);

    // ========== FILTRAR TAREAS DE ARQUETIPOS ==========
    const tareasArquetipos = tareasAdmin.filter(t => {
      if (t.AdminTask.type !== 'ARCHETYPE_REVIEW') return false;
      // Solo mostrar si está pendiente
      return t.status === 'PENDING';
    });
    console.log(`🎭 Tareas de arquetipos pendientes: ${tareasArquetipos.length}`);

    // ========== FILTRAR TAREAS DE METAMORFOSIS ==========
    const tareasMetamorfosis = tareasAdmin.filter(t => {
      if (t.AdminTask.type !== 'METAMORFOSIS_REVIEW') return false;
      // Solo mostrar si está pendiente
      return t.status === 'PENDING';
    });
    console.log(`⚡ Tareas de metamorfosis pendientes: ${tareasMetamorfosis.length}`);

    // ========== COMBINAR Y ORDENAR POR PRIORIDAD ==========
    const tareasHoy = [
      ...tareasArquetipos.map(formatAdminTask), // Prioridad 0: Arquetipos (nuevos!)
      ...tareasMetamorfosis.map(formatAdminTask), // Prioridad 0.5: Metamorfosis (Salto Cuántico)
      ...eventosHoy.map(formatAdminTask), // Prioridad 1: Eventos
      ...misionesTrainerHoy.map(formatTrainerMission), // Prioridad 2: Misiones del Trainer
      ...tareasExtraordinarias.map(formatAdminTask), // Prioridad 3: Extraordinarias
      ...tareasCartaHoy.map(formatTaskInstance) // Prioridad 4: Carta
    ];

    const tareasRetrasadas = [
      ...tareasExtraordinariasRetrasadas.map(formatAdminTask),
      ...tareasCartaRetrasadas.map(formatTaskInstance)
    ];

    // Debug: Log de tareas con evidencia PENDING
    const tareasConEvidencia = tareasHoy.filter(t => t.evidenceStatus === 'PENDING');
    console.log('🔍 DEBUG Tareas con evidencia PENDING:', tareasConEvidencia.map(t => ({
      id: t.id,
      texto: t.texto.substring(0, 50),
      evidenceStatus: t.evidenceStatus,
      evidenciaUrl: t.evidenciaUrl
    })));

    console.log('✅ Tareas procesadas:', {
      arquetipos: tareasArquetipos.length,
      eventosHoy: eventosHoy.length,
      misionesTrainer: misionesTrainerHoy.length,
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
        arquetipos: tareasArquetipos.length,
        eventos: eventosHoy.length,
        misionesTrainer: misionesTrainerHoy.length,
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
