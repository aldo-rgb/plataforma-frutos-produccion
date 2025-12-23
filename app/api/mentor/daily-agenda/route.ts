import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // No cachear

// 1. OBTENER LA AGENDA DE HOY
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mentorId = searchParams.get('mentorId');
  
  if (!mentorId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  try {
    // A. Calculamos qué día es hoy (0=Domingo, 1=Lunes...)
    // Usamos la fecha del servidor, pero idealmente debería venir del cliente para zonas horarias
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    
    // Normalizamos la fecha a YYYY-MM-DD para buscar logs
    const dateStr = today.toISOString().split('T')[0]; 
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(new Date(dateStr).setHours(23, 59, 59));

    // B. Buscamos las SUSCRIPCIONES activas para este día
    // (Alumnos que eligieron este día de la semana para sus llamadas)
    const subscriptions = await prisma.disciplineSubscription.findMany({
      where: {
        mentorId: Number(mentorId),
        status: 'ACTIVE',
        OR: [
          { day1: dayOfWeek },
          { day2: dayOfWeek }
        ]
      },
      include: {
        Usuario_DisciplineSubscription_studentIdToUsuario: {
          select: { id: true, nombre: true, missedCallsCount: true }
        }
      }
    });

    // C. Buscamos si ya se tomó asistencia HOY (CallLogs)
    const logsToday = await prisma.callLog.findMany({
      where: {
        mentorId: Number(mentorId),
        callDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    // D. Fusionamos los datos para el Frontend
    // Creamos una lista de "Slots" basada en las suscripciones encontradas
    const agenda = subscriptions.map(sub => {
      // Determinamos cuál de las dos horas toca hoy
      const time = sub.day1 === dayOfWeek ? sub.time1 : sub.time2;
      
      // Verificamos si ya tiene log hoy
      const log = logsToday.find(l => l.studentId === sub.studentId);
      
      const student = sub.Usuario_DisciplineSubscription_studentIdToUsuario;
      
      return {
        time: time, // Hora (ej: "05:15")
        studentName: student.nombre,
        studentId: student.id,
        livesLeft: 3 - student.missedCallsCount, // Calculamos vidas
        status: log ? log.status : 'PENDING', // Si hay log usa su estado, si no, PENDING
        logId: log?.id
      };
    });

    // Ordenamos por hora
    agenda.sort((a, b) => a.time.localeCompare(b.time));

    return NextResponse.json(agenda);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error cargando agenda' }, { status: 500 });
  }
}

// 2. GUARDAR ASISTENCIA (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mentorId, studentId, status, dateStr } = body; 
    // status: 'ATTENDED' | 'MISSED'

    // Usamos una transacción para asegurar consistencia
    await prisma.$transaction(async (tx) => {
      
      // 1. Guardar/Actualizar el Log del día
      // Buscamos si ya existía un registro hoy para no duplicar vidas restadas
      const today = new Date();
      const startOfDay = new Date(today.setHours(0,0,0,0));
      const endOfDay = new Date(today.setHours(23,59,59,999));

      const existingLog = await tx.callLog.findFirst({
        where: {
          studentId: Number(studentId),
          mentorId: Number(mentorId),
          callDate: { gte: startOfDay, lte: endOfDay }
        }
      });

      if (existingLog) {
        // Si ya existía, solo actualizamos el estado
        await tx.callLog.update({
          where: { id: existingLog.id },
          data: { status }
        });
        
        // Lógica compleja de reversión de vidas si cambiamos de opinión...
        // (Por simplicidad: Si cambiamos de MISSED a ATTENDED, devolvemos la vida)
        if (existingLog.status === 'MISSED' && status === 'ATTENDED') {
             await tx.usuario.update({
                where: { id: Number(studentId) },
                data: { missedCallsCount: { decrement: 1 } }
             });
        }
        // Si cambiamos de ATTENDED a MISSED
        if (existingLog.status === 'ATTENDED' && status === 'MISSED') {
             await tx.usuario.update({
                where: { id: Number(studentId) },
                data: { missedCallsCount: { increment: 1 } }
             });
        }

      } else {
        // 2. Si es nuevo, creamos el registro
        await tx.callLog.create({
          data: {
            mentorId: Number(mentorId),
            studentId: Number(studentId),
            status: status,
            callDate: new Date(), // Fecha hora actual
            dayOfWeek: new Date().getDay()
          }
        });

        // 3. Si fue falta, castigamos (Restamos vida)
        if (status === 'MISSED') {
          await tx.usuario.update({
            where: { id: Number(studentId) },
            data: { 
              missedCallsCount: { increment: 1 } 
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error saving attendance:", error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
