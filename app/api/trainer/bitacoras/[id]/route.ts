// API para ver el detalle completo de una bitácora específica
// Solo accesible para TRAINER asignado, SCHOOL_ADMIN, ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const currentUserId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const participantId = parseInt(id);

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
      let hasAccess = false;

      // Opción 1: Verificar acceso como trainer de ADVANCED (via trainerId)
      const advancedEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: participantId,
          level: 'ADVANCED',
        },
        select: {
          visionId: true,
        }
      });

      if (advancedEnrollment) {
        const isAdvancedTrainer = await prisma.schoolProduct.findFirst({
          where: {
            visionId: advancedEnrollment.visionId,
            trainerId: currentUserId,
            levelType: 'ADVANCED',
          }
        });

        if (isAdvancedTrainer) {
          hasAccess = true;
        }
      }

      // Opción 2: Verificar acceso como trainer de PL (via VisionStaff)
      if (!hasAccess) {
        const plEnrollment = await prisma.vision_enrollments.findFirst({
          where: {
            userId: participantId,
            level: 'PL',
            attendanceStatus: 'ATTENDED', // Solo PL que asistieron
          },
          select: {
            visionId: true,
          }
        });

        if (plEnrollment) {
          const isPLTrainer = await prisma.visionStaff.findFirst({
            where: {
              visionId: plEnrollment.visionId,
              userId: currentUserId,
              role: 'PL_TRAINER',
            }
          });

          if (isPLTrainer) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ 
          error: 'No tienes acceso a la bitácora de este participante' 
        }, { status: 403 });
      }
    }

    // Obtener la bitácora
    const questionnaire = await prisma.advancedQuestionnaire.findUnique({
      where: { userId: participantId },
    });

    if (!questionnaire) {
      return NextResponse.json({ 
        error: 'Este participante no ha iniciado su bitácora',
        exists: false,
      }, { status: 404 });
    }

    // Obtener info del usuario
    const participant = await prisma.usuario.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        telefono: true,
        birthdate: true,
        profession: true,
      }
    });

    // Obtener perfil completo para ocupación
    const perfilCompleto = await prisma.perfilCompleto.findUnique({
      where: { usuarioId: participantId },
      select: {
        ocupacion: true,
      }
    });

    // Obtener visión si existe
    const vision = questionnaire.visionId 
      ? await prisma.vision.findUnique({
          where: { id: questionnaire.visionId },
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          }
        })
      : null;

    // Obtener LegacyCapture del participante (contrato y fotos del cierre)
    const legacyCapture = await prisma.legacyCaptureSession.findFirst({
      where: {
        participantId: participantId,
        visionId: questionnaire.visionId || undefined,
        level: 'ADVANCED',
      },
      select: {
        contractPhotoUrl: true,
        contractDeclaration: true,
        photoWithGCUrl: true,
        photoWithSquadUrl: true,
        photoBlueWallUrl: true,
        lullabyTitle: true,
        lullabyArtist: true,
        status: true,
        completedAt: true,
      }
    });

    // Obtener BusinessProfile del participante (Futuro Imposible)
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: participantId },
      select: {
        id: true,
        headline: true,
        website: true,
        status: true,
        isVerified: true,
        isPLGraduate: true,
        category: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Obtener quién revisó el flag
    const reviewedBy = questionnaire.flagReviewedBy
      ? await prisma.usuario.findUnique({
          where: { id: questionnaire.flagReviewedBy },
          select: {
            id: true,
            nombre: true,
          }
        })
      : null;

    // Calcular edad si hay birthdate
    let age = null;
    if (participant?.birthdate) {
      const today = new Date();
      const birth = new Date(participant.birthdate);
      age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    // Formatear respuesta para el trainer
    const response = {
      participant: {
        id: participant?.id || participantId,
        nombre: participant?.nombre || 'Usuario',
        email: participant?.email || '',
        imagen: participant?.imagen || null,
        telefono: participant?.telefono || null,
        edad: age,
        profesion: participant?.profession || perfilCompleto?.ocupacion || null,
        ocupacion: perfilCompleto?.ocupacion || null,
      },
      vision: vision,
      status: questionnaire.status,
      completedAt: questionnaire.completedAt,
      lastSavedAt: questionnaire.lastSavedAt,
      currentDimension: questionnaire.currentDimension,
      
      // FLAGS DE ALERTA
      alerts: {
        suicideRisk: questionnaire.suicideRiskFlag,
        flagReviewedAt: questionnaire.flagReviewedAt,
        flagReviewedBy: reviewedBy,
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

      // LEGACY CAPTURE (Contrato y fotos del cierre)
      legacyCapture: legacyCapture ? {
        contractPhotoUrl: legacyCapture.contractPhotoUrl,
        contractDeclaration: legacyCapture.contractDeclaration,
        photoWithGCUrl: legacyCapture.photoWithGCUrl,
        photoWithSquadUrl: legacyCapture.photoWithSquadUrl,
        photoBlueWallUrl: legacyCapture.photoBlueWallUrl,
        lullabyTitle: legacyCapture.lullabyTitle,
        lullabyArtist: legacyCapture.lullabyArtist,
        status: legacyCapture.status,
        completedAt: legacyCapture.completedAt,
      } : null,

      // FUTURO IMPOSIBLE (BusinessProfile)
      businessProfile: businessProfile ? {
        id: businessProfile.id,
        headline: businessProfile.headline,
        website: businessProfile.website,
        status: businessProfile.status,
        isVerified: businessProfile.isVerified,
        isPLGraduate: businessProfile.isPLGraduate,
        category: businessProfile.category,
      } : null,
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error getting bitacora detail:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH: Marcar flag como revisado
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const currentUserId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const participantId = parseInt(id);

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
    logger.error('Error updating flag:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
