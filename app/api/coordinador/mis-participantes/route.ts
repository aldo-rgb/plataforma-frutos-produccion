import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles de coordinador permitidos
const COORDINATOR_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

// Función para verificar si es coordinador (por rol o por flags)
function isCoordinator(user: any): boolean {
  // Verificar por rol
  if (COORDINATOR_ROLES.includes(user.rol)) return true;
  // Verificar por flags booleanos
  if (user.esCoordinador) return true;
  if (user.esCoordinadorBasico) return true;
  if (user.esCoordinadorAvanzado) return true;
  return false;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        organizationId: true,
        esCoordinador: true,
        esCoordinadorBasico: true,
        esCoordinadorAvanzado: true,
      }
    });

    if (!coordinador || !isCoordinator(coordinador)) {
      return NextResponse.json({ error: 'No autorizado - No es coordinador' }, { status: 403 });
    }

    logger.debug('✅ Coordinador:', coordinador.id, coordinador.nombre, 'OrgId:', coordinador.organizationId);

    // Obtener visiones de la organización del coordinador
    let visionesWhere: any = {};
    
    if (coordinador.organizationId) {
      visionesWhere.organizationId = coordinador.organizationId;
    } else {
      visionesWhere.coordinadorId = coordinador.id;
    }

    logger.debug('🔍 Buscando visiones con:', visionesWhere);

    // Obtener visiones
    const visiones = await prisma.vision.findMany({
      where: visionesWhere,
      select: { id: true, nombre: true }
    });

    logger.debug('✅ Visiones encontradas:', visiones.length);

    // Para cada visión, obtener participantes desde vision_enrollments
    const visionesConParticipantes = await Promise.all(
      visiones.map(async (vision) => {
        try {
          // Obtener enrollments de esta visión (usuarios activos)
          const enrollments = await prisma.vision_enrollments.findMany({
            where: {
              visionId: vision.id,
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
            },
            include: {
              Usuario_vision_enrollments_userIdToUsuario: {
                select: {
                  id: true,
                  nombre: true,
                  email: true,
                  rol: true,
                  profileImage: true,
                  puntosGamificacion: true,
                  puntosCuanticos: true,
                  experienciaXP: true,
                  completionStreak: true,
                  tier: true,
                  gameChangerId: true,
                  assignedMentorId: true,
                  // Game Changer asignado
                  Usuario_Usuario_gameChangerIdToUsuario: {
                    select: {
                      id: true,
                      nombre: true,
                      email: true,
                    }
                  },
                  // Mentor asignado
                  Usuario_Usuario_assignedMentorIdToUsuario: {
                    select: {
                      id: true,
                      nombre: true,
                      email: true,
                    }
                  },
                  // Carta de Frutos
                  CartaFrutos: {
                    select: {
                      id: true,
                      estado: true,
                      autorizadoMentor: true,
                      fechaCreacion: true
                    },
                    orderBy: { fechaCreacion: 'desc' },
                    take: 1
                  },
                  // Quiz Médico
                  MedicalForm: {
                    select: {
                      id: true,
                      consentAccepted: true,
                      hasAlerts: true,
                    }
                  },
                  // Quiz Avanzado
                  AdvancedQuestionnaire: {
                    select: {
                      id: true,
                      status: true,
                      completedAt: true,
                    }
                  },
                  // Negocio (Futuro Imposible)
                  BusinessProfile: {
                    select: {
                      id: true,
                      status: true,
                      headline: true,
                    }
                  },
                  // Capitanías asignadas
                  CaptainAssignments: {
                    where: {
                      status: 'ACCEPTED'
                    },
                    select: {
                      id: true,
                      status: true,
                      captaincy: {
                        select: {
                          roleType: true,
                          visionId: true,
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          logger.debug('  -', vision.nombre, ':', enrollments.length, 'enrollments');

          // Filtrar y mapear participantes
          const participantes = enrollments
            .filter(e => e.Usuario_vision_enrollments_userIdToUsuario && 
                         ['PARTICIPANTE', 'GAMECHANGER', 'STAFF'].includes(e.Usuario_vision_enrollments_userIdToUsuario.rol))
            .map(e => e.Usuario_vision_enrollments_userIdToUsuario!)
            .sort((a, b) => (b.puntosGamificacion || 0) - (a.puntosGamificacion || 0))
            .map((p: any, index: number) => ({
              id: p.id,
              nombre: p.nombre,
              email: p.email,
              profileImageUrl: p.profileImage,
              condecoraciones: [],
              puntosCultivo: p.puntosGamificacion || 0,
              puntosQuantum: p.puntosCuanticos || 0,
              xp: p.experienciaXP || 0,
              racha: p.completionStreak || 0,
              tier: p.tier || 'FREE',
              ranking: index + 1,
              // Carta de Objetivos
              cartaId: p.CartaFrutos?.[0]?.id || null,
              cartaEstado: p.CartaFrutos?.[0]?.estado || null,
              cartaAutorizada: p.CartaFrutos?.[0]?.autorizadoMentor === true,
              tieneCarta: !!(p.CartaFrutos?.[0]?.id),
              // Quiz Médico
              quizMedicoCompletado: !!(p.MedicalForm?.consentAccepted),
              quizMedicoAlerta: p.MedicalForm?.hasAlerts || false,
              // Quiz Avanzado
              quizAvanzadoCompletado: p.AdvancedQuestionnaire?.status === 'COMPLETED',
              quizAvanzadoEstado: p.AdvancedQuestionnaire?.status || null,
              // Futuro Imposible (Negocio)
              tieneNegocio: !!(p.BusinessProfile?.id),
              negocioStatus: p.BusinessProfile?.status || null,
              negocioNombre: p.BusinessProfile?.headline || null,
              // Game Changer asignado
              gameChangerId: p.gameChangerId || null,
              gameChangerNombre: p.Usuario_Usuario_gameChangerIdToUsuario?.nombre || null,
              tieneGameChanger: !!(p.gameChangerId),
              // Mentor asignado
              mentorId: p.assignedMentorId || null,
              mentorNombre: p.Usuario_Usuario_assignedMentorIdToUsuario?.nombre || null,
              tieneMentor: !!(p.assignedMentorId),
              // Capitanías asignadas
              capitanias: (p.CaptainAssignments || []).map((c: any) => ({
                roleType: c.captaincy?.roleType,
                status: c.status,
              })),
              tieneCapitanias: (p.CaptainAssignments || []).length > 0,
            }));

          return {
            visionId: vision.id,
            visionNombre: vision.nombre,
            participantes
          };
        } catch (visionError: any) {
          logger.error('Error procesando vision', vision.id, ':', visionError?.message);
          return {
            visionId: vision.id,
            visionNombre: vision.nombre,
            participantes: []
          };
        }
      })
    );

    // Filtrar visiones sin participantes
    const visionesConDatos = visionesConParticipantes.filter(v => v.participantes.length > 0);

    return NextResponse.json({
      success: true,
      visiones: visionesConDatos
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo participantes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener participantes',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
