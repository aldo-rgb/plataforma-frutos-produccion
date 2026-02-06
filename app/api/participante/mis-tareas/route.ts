import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger';

// GET: Obtener las misiones activas del participante
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, SUBMITTED, APPROVED, REJECTED
    const visionId = searchParams.get('visionId')

    // Obtener las misiones asignadas al usuario
    const submissions = await prisma.missionSubmission.findMany({
      where: {
        userId,
        ...(status && { status }),
        mission: {
          ...(visionId && { visionId: parseInt(visionId) }),
          status: { in: ['ACTIVE', 'COMPLETED'] },
          releaseAt: { lte: new Date() } // Solo misiones ya liberadas
        }
      },
      include: {
        mission: {
          include: {
            template: {
              include: {
                Questions: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            },
            vision: {
              select: { name: true }
            },
            trainer: {
              select: { nombre: true }
            }
          }
        },
        answers: true
      },
      orderBy: [
        { status: 'asc' }, // PENDING primero
        { mission: { releaseAt: 'desc' } }
      ]
    })

    // Agrupar por estado
    const pending = submissions.filter(s => s.status === 'PENDING')
    const submitted = submissions.filter(s => s.status === 'SUBMITTED')
    const reviewed = submissions.filter(s => ['APPROVED', 'REJECTED'].includes(s.status))

    return NextResponse.json({
      success: true,
      submissions,
      counts: {
        pending: pending.length,
        submitted: submitted.length,
        reviewed: reviewed.length,
        total: submissions.length
      },
      pendingTasks: pending.map(s => ({
        submissionId: s.id,
        missionId: s.mission.id,
        title: s.mission.customTitle || s.mission.template.title,
        description: s.mission.customDescription || s.mission.template.description,
        type: s.mission.type,
        dueAt: s.mission.dueAt,
        pointsReward: s.mission.template.pointsReward + (s.mission.bonusPoints || 0),
        estimatedMinutes: s.mission.template.estimatedMinutes,
        requiresEvidence: s.mission.template.requiresEvidence,
        evidenceType: s.mission.template.evidenceType,
        visionName: s.mission.vision.name,
        trainerName: s.mission.trainer?.nombre || null,
        isUrgent: s.mission.dueAt
          ? new Date(s.mission.dueAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
          : false,
        questions: s.mission.template.Questions.map(q => ({
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          isRequired: q.isRequired,
          options: q.options as string[],
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel
        }))
      }))
    })
  } catch (error) {
    logger.error('Error fetching participant tasks:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener tareas' },
      { status: 500 }
    )
  }
}

// POST: Enviar una entrega de misión
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()
    const { submissionId, evidenceText, evidenceUrl, answers } = body

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'ID de entrega requerido' },
        { status: 400 }
      )
    }

    // Verificar que la entrega pertenece al usuario y está pendiente
    const submission = await prisma.missionSubmission.findFirst({
      where: {
        id: submissionId,
        userId,
        status: 'PENDING'
      },
      include: {
        mission: {
          include: {
            template: {
              include: {
                Questions: true
              }
            }
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'Entrega no encontrada o ya fue enviada' },
        { status: 404 }
      )
    }

    // Verificar fecha límite
    if (submission.mission.dueAt && new Date(submission.mission.dueAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'La fecha límite de esta misión ya pasó' },
        { status: 400 }
      )
    }

    // Validar respuestas de cuestionario si aplica
    if (submission.mission.type === 'QUESTIONNAIRE' && answers) {
      const requiredQuestions = submission.mission.template.Questions.filter(q => q.isRequired)

      for (const question of requiredQuestions) {
        const answer = answers.find((a: any) => a.questionId === question.id)
        if (!answer || !answer.answerText) {
          return NextResponse.json(
            { success: false, error: `La pregunta "${question.questionText}" es requerida` },
            { status: 400 }
          )
        }
      }
    }

    // Actualizar la entrega
    const updatedSubmission = await prisma.missionSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'SUBMITTED',
        evidenceText,
        evidenceUrl,
        submittedAt: new Date(),
        // Crear respuestas si es cuestionario
        ...(answers && answers.length > 0 && {
          answers: {
            createMany: {
              data: answers.map((a: any) => ({
                questionId: a.questionId,
                answerText: a.answerText,
                selectedOptions: a.selectedOptions || []
              }))
            }
          }
        })
      },
      include: {
        mission: {
          select: {
            template: {
              select: { pointsReward: true }
            },
            bonusPoints: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: '¡Misión enviada correctamente!',
      pointsPotential: updatedSubmission.mission.template.pointsReward +
        (updatedSubmission.mission.bonusPoints || 0)
    })
  } catch (error) {
    logger.error('Error submitting mission:', error)
    return NextResponse.json(
      { success: false, error: 'Error al enviar la entrega' },
      { status: 500 }
    )
  }
}
