import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // No cachear

// GET - Listar todos los mentores (con detalles completos)
export async function GET(req: NextRequest) {
  try {
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
            isActive: true
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

    const mentoresFormateados = mentores.map((mentor: any) => {
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
        precioBase,
        createdAt: mentor.createdAt,
      };
    });

    console.log(`📋 [ADMIN] Listando ${mentoresFormateados.length} mentores en el sistema`);
    console.log(`📋 [ADMIN] Estados: ${mentoresFormateados.map(m => `${m.usuario.nombre}:${m.disponible}`).join(', ')}`);

    return NextResponse.json({
      success: true,
      mentores: mentoresFormateados,
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
