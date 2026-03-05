// API para la Biblioteca Personal del Trainer - Gestión de plantillas de tareas
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import logger from '@/lib/logger';


// GET - Obtener todas las plantillas del trainer
export async function GET(request: NextRequest) {
  logger.debug('📚 GET /api/trainer/biblioteca iniciando...')
  try {
    const session = await getServerSession(authOptions)
    logger.debug('📚 Session:', session?.user)
    
    if (!session?.user?.id) {
      logger.debug('📚 No session user id')
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    logger.debug('📚 userId:', userId)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })
    logger.debug('📚 Usuario encontrado:', usuario)

    const trainerRoles = ['TRAINER', 'trainer', 'Trainer']
    if (!usuario || !trainerRoles.includes(usuario.rol)) {
      logger.debug('📚 Usuario no es trainer:', usuario?.rol)
      return NextResponse.json({ error: "Solo trainers pueden acceder" }, { status: 403 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const tag = searchParams.get('tag') || ''

    // Construir filtros
    const where: any = {
      trainerId: userId,
      isActive: true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (type) {
      where.type = type
    }

    if (tag) {
      where.tags = { has: tag }
    }

    // Obtener plantillas
    const templates = await prisma.trainerTaskTemplate.findMany({
      where,
      include: {
        Questions: {
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: { Missions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Obtener tags únicos para filtros
    const allTemplates = await prisma.trainerTaskTemplate.findMany({
      where: { trainerId: userId, isActive: true },
      select: { tags: true }
    })
    const allTags = [...new Set(allTemplates.flatMap(t => t.tags))]

    return NextResponse.json({
      success: true,
      templates: templates.map(t => ({
        ...t,
        usageCount: t._count.Missions
      })),
      filters: {
        tags: allTags,
        types: ['QUESTIONNAIRE', 'CONTENT', 'ACTION', 'REFLECTION']
      }
    })

  } catch (error: any) {
    logger.error("❌ Error al obtener biblioteca:", error)
    logger.error("❌ Error message:", error?.message)
    logger.error("❌ Error stack:", error?.stack)
    return NextResponse.json({ 
      error: "Error interno", 
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Crear nueva plantilla
export async function POST(request: NextRequest) {
  logger.debug('📚 POST /api/trainer/biblioteca - Creando plantilla...')
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    logger.debug('📚 userId:', userId, 'session:', session.user)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    logger.debug('📚 usuario encontrado:', usuario)

    const trainerRoles = ['TRAINER', 'trainer', 'Trainer']
    if (!usuario || !trainerRoles.includes(usuario.rol)) {
      logger.debug('📚 ERROR: Usuario no es TRAINER, rol actual:', usuario?.rol)
      return NextResponse.json({ error: "Solo trainers pueden crear plantillas" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      tags,
      requiresEvidence,
      evidenceType,
      contentUrl,
      contentTitle,
      pointsReward,
      estimatedMinutes,
      questions // Para cuestionarios
    } = body

    // Validaciones
    if (!title || !type) {
      return NextResponse.json({ error: "Título y tipo son requeridos" }, { status: 400 })
    }

    const validTypes = ['QUESTIONNAIRE', 'CONTENT', 'ACTION', 'REFLECTION']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de tarea inválido" }, { status: 400 })
    }

    logger.debug('📚 Creando plantilla con datos:', { title, type, tags, trainerId: userId })

    // Crear plantilla con preguntas si es cuestionario
    try {
      const template = await prisma.trainerTaskTemplate.create({
        data: {
          trainerId: userId,
          title,
          description: description || null,
          type: type as any,
          tags: tags || [],
          requiresEvidence: requiresEvidence ?? false,
          evidenceType: evidenceType || null,
          contentUrl: contentUrl || null,
          contentTitle: contentTitle || null,
          pointsReward: typeof pointsReward === 'number' ? pointsReward : 0,
          estimatedMinutes: typeof estimatedMinutes === 'number' ? estimatedMinutes : null,
          updatedAt: new Date(),
          Questions: type === 'QUESTIONNAIRE' && questions?.length > 0 ? {
            create: questions.map((q: any, index: number) => ({
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
          } : undefined
        },
        include: {
          Questions: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      })

      logger.debug('📚 Plantilla creada exitosamente:', template.id)

      return NextResponse.json({
        success: true,
        template
      })
    } catch (prismaError) {
      logger.error('📚 Error de Prisma al crear plantilla:', prismaError)
      throw prismaError
    }

  } catch (error) {
    logger.error("Error al crear plantilla:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
