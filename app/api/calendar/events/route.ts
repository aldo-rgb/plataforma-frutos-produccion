import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/calendar/events
// Obtiene todos los eventos del usuario para mostrar en el calendario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    // Filtros de categorías
    const showEvents = searchParams.get('events') !== 'false';
    const showContributions = searchParams.get('contributions') !== 'false';
    const showTasks = searchParams.get('tasks') !== 'false';
    const showMissions = searchParams.get('missions') !== 'false';
    
    // Rango de fechas (opcional)
    const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    const events: CalendarEvent[] = [];
    
    // 1. EVENTOS OFICIALES (Entrenamientos de Visión)
    if (showEvents) {
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { 
          userId,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              startDate: true,
              endDate: true,
              advancedStartDate: true,
              advancedEndDate: true,
              plWeekend1StartDate: true,
              plWeekend1EndDate: true,
              plWeekend2StartDate: true,
              plWeekend2EndDate: true,
              plWeekend3StartDate: true,
              plWeekend3EndDate: true,
              ciudad: true,
              sede: true
            }
          }
        }
      });
      
      for (const enrollment of enrollments) {
        const vision = enrollment.Vision;
        if (!vision) continue;
        
        const location = [vision.sede, vision.ciudad].filter(Boolean).join(', ');
        
        // Básico
        if (vision.startDate) {
          events.push({
            id: `basic-${vision.id}`,
            title: `🌱 Básico - ${vision.nombre}`,
            description: 'Entrenamiento de nivel Básico',
            start: vision.startDate.toISOString(),
            end: vision.endDate?.toISOString() || addHours(vision.startDate, 8).toISOString(),
            location,
            category: 'EVENTO',
            color: '#8B5CF6',
            icon: '🌱',
            visionId: vision.id
          });
        }
        
        // Avanzado (solo si está inscrito en ese nivel)
        if (vision.advancedStartDate && (enrollment.level === 'ADVANCED' || enrollment.level === 'PL')) {
          events.push({
            id: `advanced-${vision.id}`,
            title: `🔥 Avanzado - ${vision.nombre}`,
            description: 'Entrenamiento de nivel Avanzado',
            start: vision.advancedStartDate.toISOString(),
            end: vision.advancedEndDate?.toISOString() || addHours(vision.advancedStartDate, 8).toISOString(),
            location,
            category: 'EVENTO',
            color: '#F97316',
            icon: '🔥',
            visionId: vision.id
          });
        }
        
        // PL Weekends
        if (enrollment.level === 'PL') {
          if (vision.plWeekend1StartDate) {
            events.push({
              id: `pl1-${vision.id}`,
              title: `👑 Liderato W1 - ${vision.nombre}`,
              description: 'Primer fin de semana de Liderato',
              start: vision.plWeekend1StartDate.toISOString(),
              end: vision.plWeekend1EndDate?.toISOString() || addHours(vision.plWeekend1StartDate, 48).toISOString(),
              location,
              category: 'EVENTO',
              color: '#EAB308',
              icon: '👑',
              visionId: vision.id
            });
          }
          if (vision.plWeekend2StartDate) {
            events.push({
              id: `pl2-${vision.id}`,
              title: `👑 Liderato W2 - ${vision.nombre}`,
              description: 'Segundo fin de semana de Liderato',
              start: vision.plWeekend2StartDate.toISOString(),
              end: vision.plWeekend2EndDate?.toISOString() || addHours(vision.plWeekend2StartDate, 48).toISOString(),
              location,
              category: 'EVENTO',
              color: '#EAB308',
              icon: '👑',
              visionId: vision.id
            });
          }
          if (vision.plWeekend3StartDate) {
            events.push({
              id: `graduation-${vision.id}`,
              title: `🎓 Graduación - ${vision.nombre}`,
              description: '¡Ceremonia de graduación!',
              start: vision.plWeekend3StartDate.toISOString(),
              end: vision.plWeekend3EndDate?.toISOString() || addHours(vision.plWeekend3StartDate, 6).toISOString(),
              location,
              category: 'EVENTO',
              color: '#10B981',
              icon: '🎓',
              visionId: vision.id
            });
          }
        }
      }
    }
    
    // 2. CONTRIBUCIONES (Staff)
    if (showContributions) {
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { userId },
        include: {
          vision: {
            select: {
              id: true,
              nombre: true,
              startDate: true,
              advancedStartDate: true,
              plWeekend1StartDate: true,
              plWeekend2StartDate: true,
              plWeekend3StartDate: true,
              ciudad: true,
              sede: true
            }
          }
        }
      });
      
      for (const staff of staffAssignments) {
        const vision = staff.vision;
        if (!vision) continue;
        
        const location = [vision.sede, vision.ciudad].filter(Boolean).join(', ');
        let eventDate: Date | null = null;
        let title = '';
        
        if (staff.role === 'BASIC_COORDINATOR' || staff.role === 'BASIC_TRAINER') {
          eventDate = vision.startDate;
          title = `🔵 Staff Básico - ${vision.nombre}`;
        } else if (staff.role === 'ADVANCED_COORDINATOR' || staff.role === 'ADVANCED_TRAINER') {
          eventDate = vision.advancedStartDate;
          title = `🔵 Staff Avanzado - ${vision.nombre}`;
        } else if (staff.role?.includes('PL')) {
          if (staff.plWeekendNumber === 1) eventDate = vision.plWeekend1StartDate;
          else if (staff.plWeekendNumber === 2) eventDate = vision.plWeekend2StartDate;
          else if (staff.plWeekendNumber === 3) eventDate = vision.plWeekend3StartDate;
          title = `🔵 Staff Liderato W${staff.plWeekendNumber || ''} - ${vision.nombre}`;
        }
        
        if (eventDate) {
          events.push({
            id: `staff-${staff.id}`,
            title,
            description: `Contribución como ${staff.role}. ¡Llega 1 hora antes!`,
            start: addHours(eventDate, -1).toISOString(),
            end: addHours(eventDate, 10).toISOString(),
            location,
            category: 'CONTRIBUCION',
            color: '#3B82F6',
            icon: '🔵',
            visionId: vision.id
          });
        }
      }
    }
    
    // 3. TAREAS
    if (showTasks) {
      const tasks = await prisma.taskInstance.findMany({
        where: {
          usuarioId: userId,
          dueDate: { gte: startDate, lte: endDate }
        },
        include: {
          Accion: {
            select: {
              nombre: true,
              descripcion: true
            }
          }
        },
        take: 100,
        orderBy: { dueDate: 'asc' }
      });
      
      for (const task of tasks) {
        events.push({
          id: `task-${task.id}`,
          title: `🟢 ${task.Accion?.nombre || 'Tarea'}`,
          description: task.Accion?.descripcion || 'Entregable',
          start: task.dueDate.toISOString(),
          end: addHours(task.dueDate, 1).toISOString(),
          category: 'TAREA',
          color: task.status === 'COMPLETED' ? '#6B7280' : '#22C55E',
          icon: '🟢',
          completed: task.status === 'COMPLETED',
          taskId: task.id
        });
      }
    }
    
    // 4. MISIONES
    if (showMissions) {
      const missions = await prisma.adminTask.findMany({
        where: {
          assignedToId: userId,
          dueDate: { gte: startDate, lte: endDate }
        },
        take: 50,
        orderBy: { dueDate: 'asc' }
      });
      
      for (const mission of missions) {
        if (mission.dueDate) {
          events.push({
            id: `mission-${mission.id}`,
            title: `🔴 ${mission.title}`,
            description: mission.description || 'Misión especial',
            start: mission.dueDate.toISOString(),
            end: addHours(mission.dueDate, 2).toISOString(),
            category: 'MISION',
            color: mission.status === 'COMPLETED' ? '#6B7280' : '#EF4444',
            icon: '🔴',
            completed: mission.status === 'COMPLETED',
            missionId: mission.id
          });
        }
      }
    }
    
    // Ordenar por fecha de inicio
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    // Obtener el token del usuario para la suscripción
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });
    
    return NextResponse.json({
      success: true,
      events,
      subscriptionToken: user?.referralCode,
      filters: {
        events: showEvents,
        contributions: showContributions,
        tasks: showTasks,
        missions: showMissions
      }
    });
    
  } catch (error: any) {
    console.error('Error obteniendo eventos:', error);
    return NextResponse.json({ 
      error: 'Error interno',
      details: error.message 
    }, { status: 500 });
  }
}

// Tipos
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  category: 'EVENTO' | 'CONTRIBUCION' | 'TAREA' | 'MISION';
  color: string;
  icon: string;
  completed?: boolean;
  visionId?: number;
  taskId?: number;
  missionId?: number;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
