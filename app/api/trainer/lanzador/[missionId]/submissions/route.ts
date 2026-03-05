// API para obtener las submissions de una misión específica
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import logger from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { missionId } = await params
    const missionIdNum = parseInt(missionId)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ error: "Solo trainers pueden acceder" }, { status: 403 })
    }

    // Verificar que la misión pertenece al trainer
    const mission = await prisma.trainerMission.findUnique({
      where: { id: missionIdNum },
      include: {
        TrainerTaskTemplate: {
          include: {
            TrainerTaskQuestion: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    })

    if (!mission) {
      return NextResponse.json({ error: "Misión no encontrada" }, { status: 404 })
    }

    if (mission.trainerId !== userId) {
      return NextResponse.json({ error: "No tienes acceso a esta misión" }, { status: 403 })
    }

    // Obtener todas las submissions con datos del usuario y respuestas
    const submissions = await prisma.missionSubmission.findMany({
      where: { missionId: missionIdNum },
      include: {
        Usuario_MissionSubmission_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        MissionQuestionAnswer: {
          include: {
            TrainerTaskQuestion: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING primero, luego SUBMITTED, luego APPROVED
        { submittedAt: 'desc' }
      ]
    })

    // Formatear respuesta
    const formattedSubmissions = submissions.map(sub => {
      const user = sub.Usuario_MissionSubmission_userIdToUsuario
      return {
        id: sub.id,
        status: sub.status,
        textResponse: sub.textResponse,
        evidenceUrl: sub.evidenceUrl,
        learningNote: sub.learningNote,
        submittedAt: sub.submittedAt,
        pointsEarned: sub.pointsEarned,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          imagen: user.imagen
        },
        answers: sub.MissionQuestionAnswer.map(ans => ({
          questionId: ans.questionId,
          questionText: ans.TrainerTaskQuestion.questionText,
          questionType: ans.TrainerTaskQuestion.questionType,
          options: ans.TrainerTaskQuestion.options,
          textAnswer: ans.textAnswer,
          selectedOptions: ans.selectedOptions,
          scaleValue: ans.scaleValue,
          booleanAnswer: ans.booleanAnswer
        }))
      }
    })

    // Estadísticas
    const stats = {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 'PENDING').length,
      submitted: submissions.filter(s => s.status === 'SUBMITTED').length,
      approved: submissions.filter(s => s.status === 'APPROVED').length,
      rejected: submissions.filter(s => s.status === 'REJECTED').length
    }

    const template = mission.TrainerTaskTemplate
    return NextResponse.json({
      success: true,
      mission: {
        id: mission.id,
        title: template?.title || 'Sin título',
        type: template?.type || 'ACTION',
        questions: template?.TrainerTaskQuestion?.map(q => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options
        })) || []
      },
      submissions: formattedSubmissions,
      stats
    })

  } catch (error) {
    logger.error("Error al obtener submissions:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
