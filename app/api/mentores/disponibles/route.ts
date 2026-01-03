import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentores/disponibles
 * Obtiene lista de mentores disponibles para lobos solitarios
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log('🔍 Buscando mentores disponibles...');

    // Buscar mentores activos con perfil y aceptando nuevos clientes
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        PerfilMentor: {
          disponible: true,
          acceptingNewClients: true,
        },
      },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        PerfilMentor: {
          select: {
            id: true,
            titulo: true,
            especialidad: true,
            biografia: true,
            calificacionPromedio: true,
            totalSesiones: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    console.log(`📊 Encontrados ${mentores.length} mentores activos en total`);

    // Mapear datos de mentores
    const mentoresDisponibles = mentores
      .filter((mentor) => mentor.PerfilMentor)
      .map((mentor) => {
        const perfil = mentor.PerfilMentor!;
        return {
          id: mentor.id,
          perfilMentorId: perfil.id,
          nombre: mentor.nombre,
          imagen: mentor.imagen || null,
          titulo: perfil.titulo || 'Mentor Frutos del Espíritu',
          especialidad: perfil.especialidad || 'Desarrollo Personal',
          biografia: perfil.biografia || 'Mentor experimentado comprometido con tu transformación personal.',
          rating: Number(perfil.calificacionPromedio) || 5.0,
          totalSesiones: perfil.totalSesiones || 0,
        };
      })
      .sort((a, b) => {
        // Ordenar por rating primero, luego por total de sesiones
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.totalSesiones - a.totalSesiones;
      });

    console.log(`✅ ${mentoresDisponibles.length} mentores disponibles para mostrar`);

    return NextResponse.json({
      mentores: mentoresDisponibles,
      total: mentoresDisponibles.length,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener mentores disponibles:', error);
    console.error('Detalles del error:', error.message);
    return NextResponse.json(
      { 
        error: 'Error al obtener mentores',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
