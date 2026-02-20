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
        Mission: {
          include: {
            Template: {
              include: {
                Questions: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            },
            Trainer: {
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
        QuestionAnswers: true,
        Reviewer: {
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
      reviewer: sub.Reviewer,
      mission: {
        id: sub.Mission.id,
        releaseAt: sub.Mission.releaseAt,
        deadlineAt: sub.Mission.deadlineAt,
        trainerMessage: sub.Mission.trainerMessage,
        bonusPoints: sub.Mission.bonusPoints,
        bonusDeadline: sub.Mission.bonusDeadline,
        trainer: sub.Mission.Trainer,
        vision: sub.Mission.Vision ? {
          id: sub.Mission.Vision.id,
          name: sub.Mission.Vision.nombre
        } : null
      },
      template: {
        id: sub.Mission.Template.id,
        title: sub.Mission.Template.title,
        type: sub.Mission.Template.type,
        instructions: sub.Mission.Template.instructions,
        tags: sub.Mission.Template.tags,
        pointsReward: sub.Mission.Template.pointsReward,
        requiresEvidence: sub.Mission.Template.requiresEvidence,
        questions: sub.Mission.Template.Questions.map((q: any) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          isRequired: q.isRequired,
          order: q.orderIndex,
          // Incluir respuesta existente si hay
          answer: sub.QuestionAnswers.find((a: any) => a.questionId === q.id)
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
        Mission: {
          include: {
            Template: {
              include: {
                Questions: true
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
    const mission = submission.Mission
    let earnedBonus = false
    if (mission.bonusPoints && mission.bonusDeadline) {
      const bonusDeadline = new Date(mission.bonusDeadline)
      if (new Date() <= bonusDeadline) {
        earnedBonus = true
      }
    }

    // Calcular puntos ganados
    const basePoints = mission.Template.pointsReward || 0
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
        earnedBonus: earnedBonus
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
          puntosConocimiento: { increment: totalPoints }
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
