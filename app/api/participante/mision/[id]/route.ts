// API para obtener y actualizar una submission de misión del trainer
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import logger from '@/lib/logger';


// GET - Obtener detalles de la submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { id } = await params
    const submissionId = parseInt(id)

    // Obtener la submission con todos los detalles
    const submission = await prisma.missionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        TrainerMission: {
          include: {
            TrainerTaskTemplate: {
              include: {
                TrainerTaskQuestion: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            },
            Usuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            },
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        MissionQuestionAnswer: true,
        Usuario_MissionSubmission_reviewedByToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: "Misión no encontrada" }, { status: 404 })
    }

    // Verificar que la submission pertenece al usuario
    if (submission.userId !== userId) {
      return NextResponse.json({ error: "No autorizado para ver esta misión" }, { status: 403 })
    }

    // Formatear respuesta - usar any para evitar problemas de tipos con Prisma
    const sub = submission as any
    const response = {
      id: sub.id,
      missionId: sub.missionId,
      status: sub.status,
      textResponse: sub.textResponse,
      evidenceUrl: sub.evidenceUrl,
      learningNote: sub.learningNote,
      submittedAt: sub.submittedAt,
      reviewedAt: sub.reviewedAt,
      reviewNote: sub.reviewNote,
      pointsEarned: sub.pointsEarned,
      earnedBonus: sub.earnedBonus,
      reviewer: sub.Usuario_MissionSubmission_reviewedByToUsuario,
      mission: {
        id: sub.TrainerMission.id,
        releaseAt: sub.TrainerMission.releaseAt,
        deadlineAt: sub.TrainerMission.deadlineAt,
        trainerMessage: sub.TrainerMission.trainerMessage,
        bonusPoints: sub.TrainerMission.bonusPoints,
        bonusDeadline: sub.TrainerMission.bonusDeadline,
        trainer: sub.TrainerMission.Usuario,
        vision: sub.TrainerMission.Vision ? {
          id: sub.TrainerMission.Vision.id,
          name: sub.TrainerMission.Vision.nombre
        } : null
      },
      template: {
        id: sub.TrainerMission.TrainerTaskTemplate.id,
        title: sub.TrainerMission.TrainerTaskTemplate.title,
        type: sub.TrainerMission.TrainerTaskTemplate.type,
        instructions: sub.TrainerMission.TrainerTaskTemplate.description,
        tags: sub.TrainerMission.TrainerTaskTemplate.tags,
        pointsReward: sub.TrainerMission.TrainerTaskTemplate.pointsReward,
        requiresEvidence: sub.TrainerMission.TrainerTaskTemplate.requiresEvidence,
        questions: sub.TrainerMission.TrainerTaskTemplate.TrainerTaskQuestion.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          isRequired: q.isRequired,
          order: q.orderIndex,
          // Incluir respuesta existente si hay
          answer: sub.MissionQuestionAnswer.find((a: any) => a.questionId === q.id)
        }))
      }
    }

    return NextResponse.json({
      success: true,
      submission: response
    })

  } catch (error) {
    logger.error("Error al obtener submission:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Enviar/completar la misión
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { id } = await params
    const submissionId = parseInt(id)

    // Verificar que la submission existe y pertenece al usuario
    const submission = await prisma.missionSubmission.findUnique({
      where: { id: submissionId },
      include: {
        TrainerMission: {
          include: {
            TrainerTaskTemplate: {
              include: {
                TrainerTaskQuestion: true
              }
            }
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: "Misión no encontrada" }, { status: 404 })
    }

    if (submission.userId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Verificar que no esté ya completada/aprobada
    if (submission.status === 'APPROVED') {
      return NextResponse.json({ error: "Esta misión ya fue completada" }, { status: 400 })
    }

    const body = await request.json()
    const { textResponse, evidenceUrl, learningNote, answers } = body

    // Verificar si aplica para bonus (si hay deadline de bonus)
    const mission = submission.TrainerMission
    let earnedBonus = false
    if (mission.bonusPoints && mission.bonusDeadline) {
      const bonusDeadline = new Date(mission.bonusDeadline)
      if (new Date() <= bonusDeadline) {
        earnedBonus = true
      }
    }

    // Calcular puntos ganados
    const basePoints = mission.TrainerTaskTemplate.pointsReward || 0
    const bonusPoints = earnedBonus ? (mission.bonusPoints || 0) : 0
    const totalPoints = basePoints + bonusPoints

    // Actualizar la submission - Las misiones del trainer se completan directamente (sin revisión)
    const updatedSubmission = await prisma.missionSubmission.update({
      where: { id: submissionId },
      data: {
        textResponse: textResponse || null,
        evidenceUrl: evidenceUrl || null,
        learningNote: learningNote || null,
        status: 'APPROVED', // Se marca como completada directamente
        submittedAt: new Date(),
        reviewedAt: new Date(), // Auto-aprobada
        pointsEarned: totalPoints,
        earnedBonus: earnedBonus,
        updatedAt: new Date() // Campo requerido
      }
    })

    // Guardar respuestas a preguntas si las hay
    if (answers && answers.length > 0) {
      for (const answer of answers) {
        await prisma.missionQuestionAnswer.upsert({
          where: {
            submissionId_questionId: {
              submissionId: submissionId,
              questionId: answer.questionId
            }
          },
          update: {
            textAnswer: answer.textAnswer || null,
            selectedOptions: answer.selectedOptions || [],
            scaleValue: answer.scaleValue || null,
            booleanAnswer: answer.booleanAnswer
          },
          create: {
            submissionId: submissionId,
            questionId: answer.questionId,
            textAnswer: answer.textAnswer || null,
            selectedOptions: answer.selectedOptions || [],
            scaleValue: answer.scaleValue || null,
            booleanAnswer: answer.booleanAnswer
          }
        })
      }
    }

    // Otorgar puntos al usuario
    if (totalPoints > 0) {
      await prisma.usuario.update({
        where: { id: userId },
        data: {
          puntosCuanticos: { increment: totalPoints }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "¡Misión completada!",
      earnedBonus,
      pointsEarned: totalPoints
    })

  } catch (error) {
    logger.error("Error al enviar misión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
