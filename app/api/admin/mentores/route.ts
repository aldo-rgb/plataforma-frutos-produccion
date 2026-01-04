import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // No cachear

// GET - Listar todos los mentores (con detalles completos) + Solicitudes pendientes
export async function GET(req: NextRequest) {
  try {
    // 1. Obtener mentores existentes (ya aprobados)
    const mentores = await prisma.perfilMentor.findMany({
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true,
            jobTitle: true,
            isActive: true,
            rol: true // Incluir rol para filtrar
          },
        },
        ServicioMentoria: {
          orderBy: { precioTotal: 'asc' },
        },
      },
      orderBy: [
        { destacado: 'desc' }, // Destacados primero
        { disponible: 'desc' },
        { nivel: 'desc' },
        { calificacionPromedio: 'desc' },
      ],
    });

    // 2. Obtener solicitudes pendientes de mentor (PARTICIPANTES solicitando ser mentor)
    const aplicacionesPendientes = await prisma.mentorApplication.findMany({
      where: {
        status: {
          in: ['PENDING', 'DRAFT']
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true,
            jobTitle: true,
            isActive: true,
            rol: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filtrar mentores: excluir usuarios con rol LIDER
    const mentoresFiltrados = mentores.filter((mentor: any) => {
      const roles = mentor.Usuario.rol || [];
      return !roles.includes('LIDER');
    });

    // Separar mentores activos de los pendientes de aprobación
    const mentoresActivos: any[] = [];
    const mentoresPendientesDirectos: any[] = [];

    mentoresFiltrados.forEach((mentor: any) => {
      // Considerar como pendiente si:
      // - disponible es false Y
      // - totalSesiones es 0 (nunca ha dado sesiones)
      const esPendiente = !mentor.disponible && mentor.totalSesiones === 0;
      
      if (esPendiente) {
        mentoresPendientesDirectos.push(mentor);
      } else {
        mentoresActivos.push(mentor);
      }
    });

    const mentoresFormateados = mentoresActivos.map((mentor: any) => {
      // Priorizar precio del servicio, sino usar precioBase del perfil
      const precioBase = mentor.ServicioMentoria[0]?.precioTotal || mentor.precioBase || 0;
      
      console.log(`   📊 Mentor ${mentor.Usuario.nombre}: disponible=${mentor.disponible}, destacado=${mentor.destacado}, precio=${precioBase}`);
      
      return {
        id: mentor.id,
        usuarioId: mentor.usuarioId,
        usuario: mentor.Usuario,
        nivel: mentor.nivel,
        titulo: mentor.titulo,
        especialidad: mentor.especialidad,
        especialidadesSecundarias: mentor.especialidadesSecundarias,
        biografiaCorta: mentor.biografiaCorta,
        biografiaCompleta: mentor.biografiaCompleta,
        logros: mentor.logros,
        experienciaAnios: mentor.experienciaAnios,
        totalSesiones: mentor.totalSesiones,
        calificacionPromedio: mentor.calificacionPromedio,
        totalResenas: mentor.totalResenas,
        disponible: mentor.disponible,
        destacado: mentor.destacado,
        comisionMentor: mentor.comisionMentor,
        comisionPlataforma: mentor.comisionPlataforma,
        servicios: mentor.ServicioMentoria,
        precioBase,
        totalSolicitudes: mentor.totalSolicitudes || 0,
        createdAt: mentor.createdAt,
        tipoPerfil: 'MENTOR_ACTIVO' // Para identificar en el frontend
      };
    });

    // 3. Formatear aplicaciones pendientes como "mentores pendientes"
    const aplicacionesFormateadas = aplicacionesPendientes.map((app: any) => ({
      id: `app-${app.id}`, // Prefijo para diferenciar de mentores reales
      applicationId: app.id,
      usuarioId: app.usuarioId,
      usuario: app.Usuario,
      nivel: 'JUNIOR', // Por defecto para nuevas solicitudes
      titulo: app.titulo,
      especialidad: app.especialidad,
      especialidadesSecundarias: app.especialidadesSecundarias || [],
      biografiaCorta: app.biografiaCorta,
      biografiaCompleta: app.biografiaCompleta,
      logros: app.logros || [],
      experienciaAnios: app.experienciaAnios,
      totalSesiones: 0,
      calificacionPromedio: 0,
      totalResenas: 0,
      disponible: false, // Pendiente de aprobación
      destacado: false,
      comisionMentor: 70,
      comisionPlataforma: 30,
      servicios: [],
      precioBase: 0,
      totalSolicitudes: 0,
      createdAt: app.createdAt,
      tipoPerfil: 'SOLICITUD_PENDIENTE', // Para identificar en el frontend
      tipoSolicitud: 'PAGO_STRIPE',
      status: app.status,
      paymentStatus: app.paymentStatus
    }));

    // 3.5 Formatear mentores creados directamente pero no aprobados
    const mentoresPendientesFormateados = mentoresPendientesDirectos.map((mentor: any) => {
      const precioBase = mentor.ServicioMentoria[0]?.precioTotal || mentor.precioBase || 0;
      
      return {
        id: mentor.id,
        usuarioId: mentor.usuarioId,
        usuario: mentor.Usuario,
        nivel: mentor.nivel,
        titulo: mentor.titulo,
        especialidad: mentor.especialidad,
        especialidadesSecundarias: mentor.especialidadesSecundarias,
        biografiaCorta: mentor.biografiaCorta,
        biografiaCompleta: mentor.biografiaCompleta,
        logros: mentor.logros,
        experienciaAnios: mentor.experienciaAnios,
        totalSesiones: mentor.totalSesiones,
        calificacionPromedio: mentor.calificacionPromedio,
        totalResenas: mentor.totalResenas,
        disponible: mentor.disponible,
        destacado: mentor.destacado,
        comisionMentor: mentor.comisionMentor,
        comisionPlataforma: mentor.comisionPlataforma,
        servicios: mentor.ServicioMentoria,
        precioBase,
        totalSolicitudes: mentor.totalSolicitudes || 0,
        createdAt: mentor.createdAt,
        tipoPerfil: 'SOLICITUD_PENDIENTE', // Mostrar como pendiente
        tipoSolicitud: 'DIRECTO_ADMIN' // Creado directamente por admin
      };
    });

    // 4. Combinar todos (solicitudes primero para que aparezcan arriba)
    const todosCombinados = [
      ...aplicacionesFormateadas, 
      ...mentoresPendientesFormateados,
      ...mentoresFormateados
    ];

    console.log(`📋 [ADMIN] Mentores activos: ${mentoresFormateados.length}, Solicitudes con pago: ${aplicacionesFormateadas.length}, Mentores pendientes directos: ${mentoresPendientesFormateados.length}`);
    console.log(`📋 [ADMIN] Estados: ${mentoresFormateados.map(m => `${m.usuario.nombre}:${m.disponible}`).join(', ')}`);

    const totalPendientes = aplicacionesFormateadas.length + mentoresPendientesFormateados.length;

    return NextResponse.json({
      success: true,
      mentores: todosCombinados,
      stats: {
        mentoresActivos: mentoresFormateados.length,
        solicitudesPendientes: totalPendientes,
        total: todosCombinados.length
      }
    });
  } catch (error: any) {
    console.error('❌ Error al obtener mentores (admin):', error);
    return NextResponse.json(
      { error: 'Error al obtener lista de mentores', details: error.message },
      { status: 500 }
    );
  }
}

/*
// POST - Crear nuevo mentor - Admin Only
// ⚠️ DESHABILITADO: Los mentores ahora se gestionan desde "Gestión de Talentos"
// Los usuarios se registran normalmente y luego el admin les asigna rol MENTOR
// El PerfilMentor se crea automáticamente con valores por defecto del schema
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.rol !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      usuarioId,
      nivel,
      titulo,
      especialidad,
      especialidadesSecundarias,
      biografiaCorta,
      biografiaCompleta,
      logros,
      experienciaAnios,
      comisionMentor,
      comisionPlataforma,
      disponible,
      destacado,
    } = body;

    // Validaciones
    if (!usuarioId) {
      return NextResponse.json(
        { error: 'El usuarioId es requerido' },
        { status: 400 }
      );
    }

    if (!especialidad || !nivel) {
      return NextResponse.json(
        { error: 'Especialidad y nivel son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y no tiene perfil de mentor
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(usuarioId) },
      include: { perfilMentor: true },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.perfilMentor) {
      return NextResponse.json(
        { error: 'Este usuario ya tiene un perfil de mentor' },
        { status: 400 }
      );
    }

    // Crear perfil de mentor
    const nuevoMentor = await prisma.perfilMentor.create({
      data: {
        usuarioId: parseInt(usuarioId),
        nivel: nivel || 'JUNIOR',
        titulo,
        especialidad,
        especialidadesSecundarias: especialidadesSecundarias || [],
        biografiaCorta,
        biografiaCompleta,
        logros: logros || [],
        experienciaAnios: parseInt(experienciaAnios) || 0,
        comisionMentor: parseInt(comisionMentor) || 85,
        comisionPlataforma: parseInt(comisionPlataforma) || 15,
        disponible: disponible !== false,
        destacado: destacado === true,
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
    });

    console.log(`✅ [ADMIN] Mentor creado: ${usuario.nombre} (ID: ${nuevoMentor.id})`);

    return NextResponse.json({
      success: true,
      mensaje: 'Mentor creado exitosamente',
      mentor: nuevoMentor,
    });
  } catch (error: any) {
    console.error('❌ Error al crear mentor:', error);
    return NextResponse.json(
      { error: 'Error al crear mentor', details: error.message },
      { status: 500 }
    );
  }
}
*/
