// API para ver el detalle completo de una bitácora específica
// Solo accesible para TRAINER asignado, SCHOOL_ADMIN, ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);
    const participantId = parseInt(params.id);

    // Verificar rol del usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { id: currentUserId },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo roles permitidos pueden ver
    const allowedRoles = ['TRAINER', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!allowedRoles.includes(currentUser.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para ver esta información' }, { status: 403 });
    }

    // Si es TRAINER, verificar que sea el trainer asignado del participante
    if (currentUser.rol === 'TRAINER') {
      // Buscar si el participante está en algún producto donde este usuario es trainer
      const enrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: participantId,
          level: 'ADVANCED',
        },
        include: {
          Vision: {
            include: {
              SchoolProduct: {
                where: {
                  level: 'ADVANCED',
                  trainerId: currentUserId,
                }
              }
            }
          }
        }
      });

      if (!enrollment || enrollment.Vision.SchoolProduct.length === 0) {
        return NextResponse.json({ 
          error: 'No tienes acceso a la bitácora de este participante' 
        }, { status: 403 });
      }
    }

    // Obtener la bitácora completa
    const questionnaire = await prisma.advancedQuestionnaire.findUnique({
      where: { userId: participantId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            telefono: true,
            birthdate: true,
            profession: true,
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          }
        },
        ReviewedBy: {
          select: {
            id: true,
            nombre: true,
          }
        }
      }
    });

    if (!questionnaire) {
      return NextResponse.json({ 
        error: 'Este participante no ha iniciado su bitácora',
        exists: false,
      }, { status: 404 });
    }

    // Calcular edad si hay birthdate
    let age = null;
    if (questionnaire.Usuario.birthdate) {
      const today = new Date();
      const birth = new Date(questionnaire.Usuario.birthdate);
      age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    // Formatear respuesta para el trainer
    const response = {
      participant: {
        id: questionnaire.Usuario.id,
        nombre: questionnaire.Usuario.nombre,
        email: questionnaire.Usuario.email,
        imagen: questionnaire.Usuario.imagen,
        telefono: questionnaire.Usuario.telefono,
        edad: age,
        profesion: questionnaire.Usuario.profession,
      },
      vision: questionnaire.Vision,
      status: questionnaire.status,
      completedAt: questionnaire.completedAt,
      lastSavedAt: questionnaire.lastSavedAt,
      currentDimension: questionnaire.currentDimension,
      
      // FLAGS DE ALERTA
      alerts: {
        suicideRisk: questionnaire.suicideRiskFlag,
        flagReviewedAt: questionnaire.flagReviewedAt,
        flagReviewedBy: questionnaire.ReviewedBy,
      },

      // DIMENSIÓN 1: RAÍCES Y RELACIONES
      dimension1: {
        title: 'Raíces y Relaciones',
        data: {
          estadoCivil: questionnaire.maritalStatus,
          relacionPareja: questionnaire.partnerRelationship,
          calificacionPareja: questionnaire.partnerRelationshipScore,
          tieneHijos: questionnaire.hasChildren,
          datosHijos: questionnaire.childrenData,
          relacionPadres: questionnaire.parentsRelationship,
          cantidadHermanos: questionnaire.siblingsCount,
          relacionHermanos: questionnaire.siblingsRelationship,
          tieneAcompanante: questionnaire.hasCompanion,
          nombreAcompanante: questionnaire.companionName,
          relacionAcompanante: questionnaire.companionRelation,
        }
      },

      // DIMENSIÓN 2: CUERPO Y SOMBRA
      dimension2: {
        title: 'El Cuerpo y la Sombra',
        data: {
          estadoSalud: questionnaire.healthStatus,
          medicamentos: questionnaire.currentMedications,
          embarazo: questionnaire.isPregnant,
          intentoSuicidio: questionnaire.hasSuicideAttempt,
          razonSuicidio: questionnaire.suicideAttemptReason,
        }
      },

      // DIMENSIÓN 3: LÍNEA DE VIDA
      dimension3: {
        title: 'Línea de Vida',
        data: {
          ninez: {
            evento: questionnaire.childhoodEvent,
            significado: questionnaire.childhoodMeaning,
          },
          adolescencia: {
            evento: questionnaire.adolescenceEvent,
            significado: questionnaire.adolescenceMeaning,
          },
          adultez: {
            evento: questionnaire.adulthoodEvent,
            significado: questionnaire.adulthoodMeaning,
          },
          influenciaActual: questionnaire.eventsInfluence,
        }
      },

      // DIMENSIÓN 4: ESPEJOS Y CREENCIAS
      dimension4: {
        title: 'Espejos y Creencias',
        data: {
          percepcionExterna: questionnaire.externalPerception,
          percepcionAmigos: questionnaire.friendsPerception,
          creenciasReligiosas: questionnaire.religiousBeliefs,
          educacionCreencias: questionnaire.educationBeliefs,
          trabajo: questionnaire.workDescription,
          detonantes: questionnaire.triggers,
        }
      },

      // DIMENSIÓN 5: PROPÓSITO
      dimension5: {
        title: 'El Propósito',
        data: {
          proposito: questionnaire.lifePurpose,
        }
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting bitacora detail:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH: Marcar flag como revisado
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);
    const participantId = parseInt(params.id);
    const body = await request.json();

    // Verificar que sea trainer/admin
    const currentUser = await prisma.usuario.findUnique({
      where: { id: currentUserId },
      select: { rol: true }
    });

    const allowedRoles = ['TRAINER', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!currentUser || !allowedRoles.includes(currentUser.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Marcar flag como revisado
    const updated = await prisma.advancedQuestionnaire.update({
      where: { userId: participantId },
      data: {
        flagReviewedAt: new Date(),
        flagReviewedBy: currentUserId,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Flag marcado como revisado',
      reviewedAt: updated.flagReviewedAt,
    });

  } catch (error) {
    console.error('Error updating flag:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
