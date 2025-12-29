import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EstadoCarta } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener usuarios de las visiones del coordinador
    let whereClause: any = {};
    
    if (coordinador.organizationId) {
      whereClause.organizationId = coordinador.organizationId;
    } else {
      whereClause.coordinadorId = coordinador.id;
    }

    // Obtener IDs de usuarios
    const usuarios = await prisma.usuario.findMany({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      },
      select: { 
        id: true,
        nombre: true,
        email: true,
        mentorId: true,
        rol: true,
        Usuario_Usuario_mentorIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              include: {
                Mentores: {
                  include: {
                    Mentor: {
                      select: {
                        nombre: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        GameChangerEnVisiones: {
          include: {
            Vision: {
              include: {
                Mentores: {
                  include: {
                    Mentor: {
                      select: {
                        nombre: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    const usuarioIds = usuarios.map(u => u.id);

    // Crear un mapa de usuario -> mentor desde la visión
    const usuarioMentorMap = new Map();
    usuarios.forEach(u => {
      let mentor = null;
      
      // Primero intentar mentor directo
      if (u.Usuario_Usuario_mentorIdToUsuario) {
        mentor = {
          nombre: u.Usuario_Usuario_mentorIdToUsuario.nombre,
          email: u.Usuario_Usuario_mentorIdToUsuario.email
        };
      } 
      // Para participantes, obtener mentor de la visión
      else if (u.rol === 'PARTICIPANTE' && u.ParticipanteEnVisiones?.[0]?.Vision?.Mentores?.length > 0) {
        const mentorVision = u.ParticipanteEnVisiones[0].Vision.Mentores[0].Mentor;
        mentor = {
          nombre: mentorVision.nombre,
          email: mentorVision.email
        };
      }
      // Para game changers, obtener mentor de la visión
      else if (u.rol === 'GAMECHANGER' && u.GameChangerEnVisiones?.[0]?.Vision?.Mentores?.length > 0) {
        const mentorVision = u.GameChangerEnVisiones[0].Vision.Mentores[0].Mentor;
        mentor = {
          nombre: mentorVision.nombre,
          email: mentorVision.email
        };
      }
      
      if (mentor) {
        usuarioMentorMap.set(u.id, mentor);
      }
    });

    // Obtener todas las cartas y agrupar por usuario (solo la más reciente)
    const todasLasCartas = await prisma.cartaFrutos.findMany({
      where: {
        usuarioId: { in: usuarioIds }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        fechaActualizacion: 'desc'
      }
    });

    // Crear mapa de usuario -> carta más reciente
    const cartaMasRecientePorUsuario = new Map();
    todasLasCartas.forEach(carta => {
      if (!cartaMasRecientePorUsuario.has(carta.usuarioId)) {
        cartaMasRecientePorUsuario.set(carta.usuarioId, carta);
      }
    });

    // Usuarios con carta (solo la más reciente)
    const usuariosConCarta = Array.from(cartaMasRecientePorUsuario.values()).map(c => ({
      id: c.id,
      usuarioId: c.usuarioId,
      usuario: {
        nombre: c.Usuario.nombre,
        email: c.Usuario.email
      },
      mentor: usuarioMentorMap.get(c.usuarioId) || null,
      estado: c.estado,
      fechaCreacion: c.fechaCreacion,
      fechaActualizacion: c.fechaActualizacion
    }));

    // Usuarios sin carta
    const usuariosSinCarta = usuarios
      .filter(u => !cartaMasRecientePorUsuario.has(u.id))
      .map(u => ({
        id: null,
        usuarioId: u.id,
        usuario: {
          nombre: u.nombre,
          email: u.email
        },
        mentor: usuarioMentorMap.get(u.id) || null,
        estado: 'SIN_INICIAR',
        fechaCreacion: null,
        fechaActualizacion: null
      }));

    // Combinar usuarios con carta y sin carta
    const resultado = [
      ...usuariosConCarta,
      ...usuariosSinCarta
    ];

    return NextResponse.json({
      success: true,
      cartas: resultado
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cartas pendientes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener cartas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
