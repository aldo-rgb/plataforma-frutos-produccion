// API para gestionar una plantilla específica
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener una plantilla específica
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const templateId = parseInt(id)
    const userId = Number(session.user.id)

    const template = await prisma.trainerTaskTemplate.findUnique({
      where: { id: templateId },
      include: {
        Questions: {
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: { Missions: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
    }

    // Verificar que pertenece al trainer
    if (template.trainerId !== userId) {
      return NextResponse.json({ error: "Sin acceso a esta plantilla" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        usageCount: template._count.Missions
      }
    })

  } catch (error) {
    console.error("Error al obtener plantilla:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PUT - Actualizar plantilla
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const templateId = parseInt(id)
    const userId = Number(session.user.id)

    // Verificar propiedad
    const existing = await prisma.trainerTaskTemplate.findUnique({
      where: { id: templateId }
    })

    if (!existing || existing.trainerId !== userId) {
      return NextResponse.json({ error: "Sin acceso a esta plantilla" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      tags,
      requiresEvidence,
      evidenceType,
      contentUrl,
      contentTitle,
      pointsReward,
      estimatedMinutes,
      questions
    } = body

    // Actualizar plantilla
    const template = await prisma.trainerTaskTemplate.update({
      where: { id: templateId },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        tags: tags || existing.tags,
        requiresEvidence: requiresEvidence ?? existing.requiresEvidence,
        evidenceType: evidenceType !== undefined ? evidenceType : existing.evidenceType,
        contentUrl: contentUrl !== undefined ? contentUrl : existing.contentUrl,
        contentTitle: contentTitle !== undefined ? contentTitle : existing.contentTitle,
        pointsReward: pointsReward ?? existing.pointsReward,
        estimatedMinutes: estimatedMinutes !== undefined ? estimatedMinutes : existing.estimatedMinutes
      }
    })

    // Actualizar preguntas si es cuestionario
    if (existing.type === 'QUESTIONNAIRE' && questions) {
      // Eliminar preguntas existentes y crear nuevas
      await prisma.trainerTaskQuestion.deleteMany({
        where: { templateId }
      })

      if (questions.length > 0) {
        await prisma.trainerTaskQuestion.createMany({
          data: questions.map((q: any, index: number) => ({
            templateId,
            questionText: q.questionText,
            questionType: q.questionType || 'OPEN',
            isRequired: q.isRequired ?? true,
            orderIndex: index,
            options: q.options || [],
            scaleMin: q.scaleMin || 1,
            scaleMax: q.scaleMax || 10,
            scaleMinLabel: q.scaleMinLabel || null,
            scaleMaxLabel: q.scaleMaxLabel || null
          }))
        })
      }
    }

    // Obtener plantilla actualizada
    const updated = await prisma.trainerTaskTemplate.findUnique({
      where: { id: templateId },
      include: {
        Questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      template: updated
    })

  } catch (error) {
    console.error("Error al actualizar plantilla:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// DELETE - Eliminar plantilla (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const templateId = parseInt(id)
    const userId = Number(session.user.id)

    // Verificar propiedad
    const existing = await prisma.trainerTaskTemplate.findUnique({
      where: { id: templateId }
    })

    if (!existing || existing.trainerId !== userId) {
      return NextResponse.json({ error: "Sin acceso a esta plantilla" }, { status: 403 })
    }

    // Soft delete
    await prisma.trainerTaskTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: "Plantilla eliminada"
    })

  } catch (error) {
    console.error("Error al eliminar plantilla:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
