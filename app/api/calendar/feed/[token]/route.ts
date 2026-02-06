import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET /api/calendar/feed/[token]?categories=events,contributions,tasks,missions
// Genera un feed iCal dinámico para suscripción webcal://
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;
    
    // Buscar usuario por token (usamos referralCode como token único)
    const user = await prisma.usuario.findFirst({
      where: { referralCode: token },
      select: { 
        id: true, 
        nombre: true, 
        organizationId: true,
        rol: true
      }
    });
    
    if (!user) {
      return new NextResponse('Token inválido', { status: 401 });
    }
    
    // Obtener categorías del query param
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories') || 'events,contributions,tasks';
    const categories = categoriesParam.split(',');
    
    // Obtener enrollments activos del usuario para saber en qué visiones está
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { 
        userId: user.id,
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
    
    const events: ICalEvent[] = [];
    const now = new Date();
    
    // 1. EVENTOS OFICIALES (Entrenamientos)
    if (categories.includes('events')) {
      for (const enrollment of enrollments) {
        const vision = enrollment.Vision;
        if (!vision) continue;
        
        const location = [vision.sede, vision.ciudad].filter(Boolean).join(', ');
        
        // Básico
        if (vision.startDate && (enrollment.level === 'BASIC' || enrollment.level === 'ADVANCED' || enrollment.level === 'PL')) {
          events.push({
            uid: `basic-${vision.id}-${user.id}@quantumchronos`,
            title: `🌱 Entrenamiento Básico - ${vision.nombre}`,
            description: 'Entrenamiento de nivel Básico. ¡Llega puntual!',
            start: new Date(vision.startDate),
            end: vision.endDate ? new Date(vision.endDate) : addHours(new Date(vision.startDate), 8),
            location,
            category: 'EVENTO',
            color: '#8B5CF6' // Púrpura
          });
        }
        
        // Avanzado
        if (vision.advancedStartDate && (enrollment.level === 'ADVANCED' || enrollment.level === 'PL')) {
          events.push({
            uid: `advanced-${vision.id}-${user.id}@quantumchronos`,
            title: `🔥 Entrenamiento Avanzado - ${vision.nombre}`,
            description: 'Entrenamiento de nivel Avanzado. ¡Prepárate para el siguiente nivel!',
            start: new Date(vision.advancedStartDate),
            end: vision.advancedEndDate ? new Date(vision.advancedEndDate) : addHours(new Date(vision.advancedStartDate), 8),
            location,
            category: 'EVENTO',
            color: '#F97316' // Naranja
          });
        }
        
        // PL Fines de Semana
        if (enrollment.level === 'PL') {
          if (vision.plWeekend1StartDate) {
            events.push({
              uid: `pl1-${vision.id}-${user.id}@quantumchronos`,
              title: `👑 Liderato Weekend 1 - ${vision.nombre}`,
              description: 'Primer fin de semana de Liderato',
              start: new Date(vision.plWeekend1StartDate),
              end: vision.plWeekend1EndDate ? new Date(vision.plWeekend1EndDate) : addHours(new Date(vision.plWeekend1StartDate), 48),
              location,
              category: 'EVENTO',
              color: '#EAB308' // Amarillo
            });
          }
          if (vision.plWeekend2StartDate) {
            events.push({
              uid: `pl2-${vision.id}-${user.id}@quantumchronos`,
              title: `👑 Liderato Weekend 2 - ${vision.nombre}`,
              description: 'Segundo fin de semana de Liderato',
              start: new Date(vision.plWeekend2StartDate),
              end: vision.plWeekend2EndDate ? new Date(vision.plWeekend2EndDate) : addHours(new Date(vision.plWeekend2StartDate), 48),
              location,
              category: 'EVENTO',
              color: '#EAB308'
            });
          }
          if (vision.plWeekend3StartDate) {
            events.push({
              uid: `graduation-${vision.id}-${user.id}@quantumchronos`,
              title: `🎓 GRADUACIÓN - ${vision.nombre}`,
              description: '¡Ceremonia de graduación! Momento histórico.',
              start: new Date(vision.plWeekend3StartDate),
              end: vision.plWeekend3EndDate ? new Date(vision.plWeekend3EndDate) : addHours(new Date(vision.plWeekend3StartDate), 6),
              location,
              category: 'EVENTO',
              color: '#10B981' // Verde
            });
          }
        }
      }
    }
    
    // 2. CONTRIBUCIONES (Staff assignments)
    if (categories.includes('contributions')) {
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { userId: user.id },
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
          // Determinar qué weekend
          if (staff.plWeekendNumber === 1) eventDate = vision.plWeekend1StartDate;
          else if (staff.plWeekendNumber === 2) eventDate = vision.plWeekend2StartDate;
          else if (staff.plWeekendNumber === 3) eventDate = vision.plWeekend3StartDate;
          title = `🔵 Staff Liderato W${staff.plWeekendNumber || ''} - ${vision.nombre}`;
        }
        
        if (eventDate) {
          events.push({
            uid: `staff-${staff.id}-${user.id}@quantumchronos`,
            title,
            description: `Contribución como ${staff.role}. ¡Llega 1 hora antes!`,
            start: addHours(new Date(eventDate), -1), // 1 hora antes
            end: addHours(new Date(eventDate), 10),
            location,
            category: 'CONTRIBUCION',
            color: '#3B82F6' // Azul
          });
        }
      }
    }
    
    // 3. TAREAS (TaskInstances pendientes)
    if (categories.includes('tasks')) {
      const tasks = await prisma.taskInstance.findMany({
        where: {
          usuarioId: user.id,
          status: 'PENDING',
          dueDate: { gte: now }
        },
        include: {
          Accion: {
            select: {
              nombre: true,
              descripcion: true
            }
          }
        },
        take: 50,
        orderBy: { dueDate: 'asc' }
      });
      
      for (const task of tasks) {
        events.push({
          uid: `task-${task.id}@quantumchronos`,
          title: `🟢 ${task.Accion?.nombre || 'Tarea'}`,
          description: task.Accion?.descripcion || 'Entregable pendiente',
          start: new Date(task.dueDate),
          end: addHours(new Date(task.dueDate), 1),
          category: 'TAREA',
          color: '#22C55E', // Verde
          isAllDay: false
        });
      }
    }
    
    // 4. MISIONES (Retos especiales - AdminTasks asignadas)
    if (categories.includes('missions')) {
      const missions = await prisma.adminTask.findMany({
        where: {
          assignedToId: user.id,
          status: { not: 'COMPLETED' },
          dueDate: { gte: now }
        },
        take: 20,
        orderBy: { dueDate: 'asc' }
      });
      
      for (const mission of missions) {
        if (mission.dueDate) {
          events.push({
            uid: `mission-${mission.id}@quantumchronos`,
            title: `🔴 MISIÓN: ${mission.title}`,
            description: mission.description || 'Reto especial asignado',
            start: new Date(mission.dueDate),
            end: addHours(new Date(mission.dueDate), 2),
            category: 'MISION',
            color: '#EF4444' // Rojo
          });
        }
      }
    }
    
    // Generar el archivo iCal
    const icalContent = generateICalendar(events, user.nombre);
    
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="quantum-chronos.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
    
  } catch (error: any) {
    logger.error('Error generando feed iCal:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}

// Tipos
interface ICalEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  category: string;
  color: string;
  isAllDay?: boolean;
}

// Helpers
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateICalendar(events: ICalEvent[], userName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quantum Chronos//Frutos Platform//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Quantum Chronos - ${userName}`,
    'X-WR-TIMEZONE:America/Mexico_City',
  ];
  
  // Timezone definition
  lines.push(
    'BEGIN:VTIMEZONE',
    'TZID:America/Mexico_City',
    'BEGIN:STANDARD',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700405T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  );
  
  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(event.start)}`);
    lines.push(`DTEND:${formatICalDate(event.end)}`);
    lines.push(`SUMMARY:${escapeICalText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeICalText(event.location)}`);
    }
    lines.push(`CATEGORIES:${event.category}`);
    // Alarma por defecto: 1 hora antes
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT1H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICalText(event.title)} - en 1 hora`);
    lines.push('END:VALARM');
    // Segunda alarma: 15 minutos antes
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeICalText(event.title)} - en 15 minutos`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }
  
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}
