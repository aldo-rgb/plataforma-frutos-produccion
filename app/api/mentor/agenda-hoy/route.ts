import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario es mentor
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (usuario?.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el perfil del mentor para el enlace de videollamada
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        enlaceVideoLlamada: true,
        tipoVideoLlamada: true
      }
    });

    console.log('🔗 Enlace del perfil mentor:', perfilMentor?.enlaceVideoLlamada);

    // Obtener fecha de hoy (inicio y fin del día en UTC)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    console.log('🔍 Buscando sesiones para:', {
      mentorId: session.user.id,
      desde: hoy.toISOString(),
      hasta: mañana.toISOString()
    });

    // 1. OBTENER LLAMADAS DE DISCIPLINA (CallBooking)
    // SQL equivalente:
    // SELECT cb.*, u.nombre as alumno_nombre, u.email as alumno_email
    // FROM "CallBooking" cb
    // INNER JOIN "Usuario" u ON cb."studentId" = u.id
    // WHERE cb."mentorId" = $1
    //   AND cb."scheduledAt" >= $2
    //   AND cb."scheduledAt" < $3
    //   AND cb.status IN ('CONFIRMED', 'PENDING')
    // ORDER BY cb."scheduledAt" ASC
    
    const callBookings = await prisma.callBooking.findMany({
      where: {
        mentorId: session.user.id,
        scheduledAt: {
          gte: hoy,
          lt: mañana
        },
        status: {
          in: ['CONFIRMED', 'PENDING']
        }
      },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        meetingLink: true,
        type: true,
        notes: true,
        Usuario_CallBooking_studentIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    console.log('📞 CallBookings encontrados:', callBookings.length);

    // 2. OBTENER MENTORÍAS PAGADAS (SolicitudMentoria)
    // SQL equivalente:
    // SELECT sm.*, u.nombre as cliente_nombre, u.email as cliente_email, 
    //        serv.nombre as servicio_nombre, serv.tipo as servicio_tipo
    // FROM "SolicitudMentoria" sm
    // INNER JOIN "PerfilMentor" pm ON sm."perfilMentorId" = pm.id
    // INNER JOIN "Usuario" u ON sm."clienteId" = u.id
    // INNER JOIN "ServicioMentoria" serv ON sm."servicioId" = serv.id
    // WHERE pm."usuarioId" = $1
    //   AND sm.estado IN ('CONFIRMADA', 'COMPLETADA')
    //   AND sm."fechaSolicitada" >= $2
    //   AND sm."fechaSolicitada" < $3
    // ORDER BY sm."fechaSolicitada" ASC
    
    const solicitudesMentoria = await prisma.solicitudMentoria.findMany({
      where: {
        PerfilMentor: {
          usuarioId: session.user.id
        },
        estado: {
          in: ['CONFIRMADA', 'COMPLETADA']
        },
        fechaSolicitada: {
          gte: hoy,
          lt: mañana
        }
      },
      select: {
        id: true,
        fechaSolicitada: true,
        horaSolicitada: true,
        estado: true,
        notas: true,
        montoTotal: true,
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        ServicioMentoria: {
          select: {
            nombre: true,
            tipo: true,
            descripcion: true
          }
        }
      },
      orderBy: {
        fechaSolicitada: 'asc'
      }
    });

    console.log('🎓 Solicitudes Mentoría encontradas:', solicitudesMentoria.length);

    // 3. FORMATEAR Y COMBINAR LAS SESIONES
    const sesiones = [
      // Formatear CallBookings (Llamadas de Disciplina)
      ...callBookings.map(booking => {
        const hora = new Date(booking.scheduledAt);
        const horaFin = new Date(hora.getTime() + booking.duration * 60000);
        
        return {
          id: `call-${booking.id}`,
          idNumerico: booking.id,
          tipo: 'DISCIPLINA',
          alumno: booking.Usuario_CallBooking_studentIdToUsuario.nombre,
          alumnoEmail: booking.Usuario_CallBooking_studentIdToUsuario.email,
          alumnoImagen: booking.Usuario_CallBooking_studentIdToUsuario.imagen,
          servicio: booking.type === 'DISCIPLINE' ? '⏰ Club 5 AM - Disciplina' : '📞 Llamada Mentor',
          servicioIcono: booking.type === 'DISCIPLINE' ? '⏰' : '📞',
          hora: `${hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${horaFin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
          horaInicio: hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          horaFin: horaFin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          duracionMinutos: booking.duration,
          link: booking.meetingLink,
          status: booking.status,
          statusLabel: booking.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente',
          notas: booking.notes,
          fechaCompleta: booking.scheduledAt,
          ordenHora: hora.getHours() * 60 + hora.getMinutes()
        };
      }),
      
      // Formatear SolicitudesMentoria (Mentorías Pagadas)
      ...solicitudesMentoria.map(solicitud => {
        const fecha = solicitud.fechaSolicitada ? new Date(solicitud.fechaSolicitada) : new Date();
        
        // Parsear la hora si viene como string (ej: "10:00 AM")
        let horaStr = solicitud.horaSolicitada || fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        let ordenHora = fecha.getHours() * 60 + fecha.getMinutes();
        
        // Si horaSolicitada es un string con formato "HH:MM", parsearlo
        if (solicitud.horaSolicitada && solicitud.horaSolicitada.includes(':')) {
          const [horas, minutos] = solicitud.horaSolicitada.split(':').map(Number);
          ordenHora = horas * 60 + minutos;
          horaStr = solicitud.horaSolicitada;
        }
        
        return {
          id: `mentoria-${solicitud.id}`,
          idNumerico: solicitud.id,
          tipo: 'MENTORIA',
          alumno: solicitud.Usuario.nombre,
          alumnoEmail: solicitud.Usuario.email,
          alumnoImagen: solicitud.Usuario.imagen,
          servicio: `🎓 ${solicitud.ServicioMentoria.nombre}`,
          servicioIcono: '🎓',
          servicioDescripcion: solicitud.ServicioMentoria.descripcion,
          hora: horaStr,
          horaInicio: horaStr,
          horaFin: null, // Las mentorías no siempre tienen duración fija
          duracionMinutos: 60, // Asumimos 60 min por defecto
          link: perfilMentor?.enlaceVideoLlamada || null,
          tipoVideoLlamada: perfilMentor?.tipoVideoLlamada || 'zoom',
          status: solicitud.estado,
          statusLabel: solicitud.estado === 'CONFIRMADA' ? 'Confirmada' : 
                       solicitud.estado === 'COMPLETADA' ? 'Completada' : solicitud.estado,
          notas: solicitud.notas,
          monto: solicitud.montoTotal,
          fechaCompleta: solicitud.fechaSolicitada,
          // Ordenamiento
          ordenHora
        };
      })
    ];

    // 4. ORDENAR POR HORA DEL DÍA
    sesiones.sort((a, b) => a.ordenHora - b.ordenHora);

    // 5. ESTADÍSTICAS
    const stats = {
      total: sesiones.length,
      disciplina: sesiones.filter(s => s.tipo === 'DISCIPLINA').length,
      mentorias: sesiones.filter(s => s.tipo === 'MENTORIA').length,
      confirmadas: sesiones.filter(s => s.status === 'CONFIRMED' || s.status === 'CONFIRMADA').length,
      pendientes: sesiones.filter(s => s.status === 'PENDING').length,
      primeraHora: sesiones.length > 0 ? sesiones[0].horaInicio : null,
      ultimaHora: sesiones.length > 0 ? sesiones[sesiones.length - 1].horaInicio : null
    };

    console.log('📊 Estadísticas:', stats);

    return NextResponse.json({ 
      success: true,
      sesiones,
      stats,
      fecha: hoy.toISOString(),
      fechaLegible: hoy.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });

  } catch (error) {
    console.error('❌ Error obteniendo agenda del día:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener la agenda',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
