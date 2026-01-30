import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todos los perfiles de mentores disponibles con sus servicios
    // EXCLUIR líderes (rol LIDER) - solo mostrar mentores reales
    // SOLO mentores con membresía activa y no expirada
    const mentores = await prisma.perfilMentor.findMany({
      where: {
        disponible: true,
        acceptingNewClients: true, // Solo mentores aceptando nuevos clientes
        membershipActive: true, // NUEVO: Solo mentores con membresía activa
        membershipExpiryDate: {
          gte: new Date() // NUEVO: Membresía no expirada
        },
        Usuario: {
          rol: 'MENTOR', // Solo mentores, NO incluir líderes
          isActive: true // Solo usuarios activos
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            profileImage: true, // Campo principal de imagen de mentores
            email: true,
            badges: true,
            rol: true // Incluir rol para verificación adicional
          },
        },
        ServicioMentoria: {
          where: {
            activo: true,
          },
          orderBy: {
            precioTotal: 'asc',
          },
        },
      },
      orderBy: [
        { destacado: 'desc' }, // Destacados primero
        { nivel: 'desc' }, // Master > Senior > Junior
        { calificacionPromedio: 'desc' },
      ],
    });

    // Formatear datos para frontend
    const mentoresFormateados = mentores.map((mentor) => {
      // Obtener servicio más económico
      const servicioBase = mentor.ServicioMentoria[0] || null;

      return {
        id: mentor.id,
        usuarioId: mentor.Usuario.id,
        nombre: mentor.Usuario.nombre,
        imagen: mentor.Usuario.profileImage || mentor.Usuario.imagen || '/default-avatar.png',
        nivel: mentor.nivel,
        titulo: mentor.titulo,
        especialidad: mentor.especialidad,
        especialidadesSecundarias: mentor.especialidadesSecundarias || [],
        biografia: mentor.biografia,
        biografiaCorta: mentor.biografiaCorta,
        biografiaCompleta: mentor.biografiaCompleta,
        logros: mentor.logros || [],
        badges: mentor.Usuario.badges || [],
        experienciaAnios: mentor.experienciaAnios,
        totalSesiones: mentor.totalSesiones,
        calificacionPromedio: mentor.calificacionPromedio,
        totalResenas: mentor.totalResenas,
        destacado: mentor.destacado,
        precioBase: servicioBase?.precioTotal || 0,
        horarioInicio: mentor.horarioInicio || '09:00',
        horarioFin: mentor.horarioFin || '18:00',
        diasDisponibles: mentor.diasDisponibles || [1, 2, 3, 4, 5],
        servicios: mentor.ServicioMentoria.map((s) => ({
          id: s.id,
          tipo: s.tipo,
          nombre: s.nombre,
          descripcion: s.descripcion,
          duracionHoras: s.duracionHoras,
          precioTotal: s.precioTotal,
        })),
      };
    });

    console.log(`📋 Listando ${mentoresFormateados.length} mentores disponibles`);

    return NextResponse.json({
      mentores: mentoresFormateados,
      total: mentoresFormateados.length,
    });

  } catch (error) {
    console.error('❌ Error al obtener mentores:', error);
    return NextResponse.json(
      { error: 'Error al cargar mentores' },
      { status: 500 }
    );
  }
}
