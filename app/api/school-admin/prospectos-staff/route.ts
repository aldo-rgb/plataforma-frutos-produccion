// API para obtener prospectos de staff (personas que quieren ser staff)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Verificar permisos (SCHOOL_ADMIN, ADMIN, COORDINATOR)
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
        esCoordinador: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['ADMIN', 'SCHOOL_ADMIN', 'COORDINATOR'];
    if (!allowedRoles.includes(user.rol) && !user.esCoordinador) {
      return NextResponse.json({ error: 'No tienes permisos para ver prospectos de staff' }, { status: 403 });
    }

    // Obtener parámetros de filtro
    const { searchParams } = new URL(request.url);
    const filterLevel = searchParams.get('level'); // basico, avanzado, liderato, servicio
    const source = searchParams.get('source'); // 'perfil', 'encuesta', o null para ambos

    // Map para unificar prospectos por usuarioId
    const prospectosMap = new Map<number, any>();

    // 1. Obtener prospectos desde PerfilCompleto (quiereSerStaff desde perfil)
    if (!source || source === 'perfil') {
      const perfilProspectos = await (prisma.perfilCompleto as any).findMany({
        where: {
          quiereSerStaff: true,
          ...(filterLevel === 'basico' && { staffBasicoInterest: true }),
          ...(filterLevel === 'avanzado' && { staffAvanzadoInterest: true }),
          ...(filterLevel === 'liderato' && { staffLideratoInterest: true }),
          ...(filterLevel === 'servicio' && { staffServicioInterest: true }),
        },
        select: {
          usuarioId: true,
          quiereSerStaff: true,
          staffBasicoInterest: true,
          staffAvanzadoInterest: true,
          staffLideratoInterest: true,
          staffServicioInterest: true,
          updatedAt: true,
        }
      });

      // Obtener datos de usuarios
      const userIds = perfilProspectos.map((p: any) => p.usuarioId);
      const usuarios = await prisma.usuario.findMany({
        where: { 
          id: { in: userIds },
          ...(user.rol === 'SCHOOL_ADMIN' && user.organizationId 
            ? { organizationId: user.organizationId } 
            : {}
          )
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          imagen: true,
          currentVisionLevel: true,
          organizationId: true,
        }
      });

      const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

      for (const perfil of perfilProspectos) {
        const usuario = usuariosMap.get(perfil.usuarioId);
        if (!usuario) continue;

        prospectosMap.set(perfil.usuarioId, {
          id: perfil.usuarioId,
          source: 'perfil',
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            telefono: usuario.telefono,
            imagen: usuario.imagen,
            nivel: usuario.currentVisionLevel,
          },
          intereses: {
            basico: perfil.staffBasicoInterest,
            avanzado: perfil.staffAvanzadoInterest,
            liderato: perfil.staffLideratoInterest,
            servicio: perfil.staffServicioInterest,
          },
          createdAt: perfil.updatedAt,
        });
      }
    }

    // 2. Obtener prospectos desde ParticipantSurvey (encuestas PL)
    if (!source || source === 'encuesta') {
      const whereClause: any = {
        quiereSerStaff: true,
        level: 'PL',
      };

      // Si es SCHOOL_ADMIN, filtrar por su organización
      if (user.rol === 'SCHOOL_ADMIN' && user.organizationId) {
        whereClause.Product = {
          Vision: {
            organizationId: user.organizationId
          }
        };
      }

      // Filtro por nivel de staff
      if (filterLevel === 'basico') whereClause.staffBasico = true;
      if (filterLevel === 'avanzado') whereClause.staffAvanzado = true;
      if (filterLevel === 'liderato') whereClause.staffLiderato = true;
      if (filterLevel === 'servicio') whereClause.staffServicio = true;

      const encuestaProspectos = await prisma.participantSurvey.findMany({
        where: whereClause,
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              imagen: true,
              currentVisionLevel: true,
            }
          },
          Product: {
            select: {
              id: true,
              name: true,
              levelType: true,
              Vision: {
                select: {
                  id: true,
                  nombre: true,
                  Organization: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const encuesta of encuestaProspectos) {
        const existing = prospectosMap.get(encuesta.userId);
        
        // Si ya existe desde perfil, combinar intereses
        if (existing) {
          existing.source = 'ambos';
          existing.intereses.basico = existing.intereses.basico || (encuesta as any).staffBasico;
          existing.intereses.avanzado = existing.intereses.avanzado || (encuesta as any).staffAvanzado;
          existing.intereses.liderato = existing.intereses.liderato || (encuesta as any).staffLiderato;
          existing.intereses.servicio = existing.intereses.servicio || (encuesta as any).staffServicio;
          existing.producto = {
            id: encuesta.Product.id,
            nombre: encuesta.Product.name,
            vision: encuesta.Product.Vision?.nombre,
            organizacion: encuesta.Product.Vision?.Organization?.name,
          };
          existing.respuestas = {
            legado: (encuesta as any).legadoPersonal,
            aprendizaje: (encuesta as any).mayorAprendizaje,
            compromiso: (encuesta as any).compromisoComunidad,
            consejo: (encuesta as any).consejoFuturo,
          };
        } else {
          prospectosMap.set(encuesta.userId, {
            id: encuesta.id,
            source: 'encuesta',
            usuario: {
              id: encuesta.Usuario.id,
              nombre: encuesta.Usuario.nombre,
              email: encuesta.Usuario.email,
              telefono: encuesta.Usuario.telefono,
              imagen: encuesta.Usuario.imagen,
              nivel: encuesta.Usuario.currentVisionLevel,
            },
            producto: {
              id: encuesta.Product.id,
              nombre: encuesta.Product.name,
              vision: encuesta.Product.Vision?.nombre,
              organizacion: encuesta.Product.Vision?.Organization?.name,
            },
            intereses: {
              basico: (encuesta as any).staffBasico,
              avanzado: (encuesta as any).staffAvanzado,
              liderato: (encuesta as any).staffLiderato,
              servicio: (encuesta as any).staffServicio,
            },
            respuestas: {
              legado: (encuesta as any).legadoPersonal,
              aprendizaje: (encuesta as any).mayorAprendizaje,
              compromiso: (encuesta as any).compromisoComunidad,
              consejo: (encuesta as any).consejoFuturo,
            },
            createdAt: encuesta.createdAt,
          });
        }
      }
    }

    // Convertir a array y ordenar
    const prospectos = Array.from(prospectosMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Estadísticas
    const stats = {
      total: prospectos.length,
      porNivel: {
        basico: prospectos.filter(p => p.intereses?.basico).length,
        avanzado: prospectos.filter(p => p.intereses?.avanzado).length,
        liderato: prospectos.filter(p => p.intereses?.liderato).length,
        servicio: prospectos.filter(p => p.intereses?.servicio).length,
      },
      porFuente: {
        perfil: prospectos.filter(p => p.source === 'perfil').length,
        encuesta: prospectos.filter(p => p.source === 'encuesta').length,
        ambos: prospectos.filter(p => p.source === 'ambos').length,
      }
    };

    return NextResponse.json({
      success: true,
      prospectos,
      stats,
    });

  } catch (error) {
    logger.error('Error fetching staff prospects:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
