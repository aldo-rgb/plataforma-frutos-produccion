// API del Lanzador de Tareas - Asignar tareas en vivo
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import logger from '@/lib/logger';


// GET - Obtener misiones activas del trainer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ error: "Solo trainers pueden acceder" }, { status: 403 })
    }

    // Obtener parámetros
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const visionId = searchParams.get('visionId')

    // Construir filtros
    const where: any = {
      trainerId: userId
    }

    if (status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (visionId) {
      where.visionId = parseInt(visionId)
    }

    // Obtener misiones
    const missions = await prisma.trainerMission.findMany({
      where,
      include: {
        TrainerTaskTemplate: {
          select: {
            id: true,
            title: true,
            type: true,
            pointsReward: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            levelType: true
          }
        },
        _count: {
          select: {
            MissionSubmission: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas de entrega para cada misión
    const missionsWithStats = await Promise.all(missions.map(async (mission) => {
      const submissionStats = await prisma.missionSubmission.groupBy({
        by: ['status'],
        where: { missionId: mission.id },
        _count: true
      })

      const stats = {
        total: mission._count.MissionSubmission,
        pending: 0,
        submitted: 0,
        approved: 0,
        rejected: 0
      }

      submissionStats.forEach(s => {
        const key = s.status.toLowerCase() as keyof typeof stats
        if (key in stats) {
          stats[key] = s._count
        }
      })

      return {
        id: mission.id,
        title: mission.TrainerTaskTemplate?.title || 'Sin título',
        description: mission.trainerMessage,
        type: mission.TrainerTaskTemplate?.type || 'ACTION',
        status: mission.status,
        releaseAt: mission.releaseAt,
        dueAt: mission.deadlineAt,
        bonusPoints: mission.bonusPoints || 0,
        template: mission.TrainerTaskTemplate ? {
          title: mission.TrainerTaskTemplate.title,
          type: mission.TrainerTaskTemplate.type
        } : null,
        vision: mission.Vision ? {
          name: mission.Vision.nombre
        } : null,
        squad: null, // Por ahora no tenemos squads
        _count: mission._count,
        submittedCount: stats.submitted + stats.approved,
        totalParticipants: stats.total,
        stats
      }
    }))

    return NextResponse.json({
      success: true,
      missions: missionsWithStats
    })

  } catch (error) {
    logger.error("Error al obtener misiones:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST - Lanzar nueva misión
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ error: "Solo trainers pueden lanzar misiones" }, { status: 403 })
    }

    const body = await request.json()
    const {
      templateId,
      visionId,
      productId,
      squadId,
      releaseType, // "immediate" o "scheduled"
      releaseAt,
      deadlineAt,
      trainerMessage,
      bonusPoints,
      bonusDeadline
    } = body

    // Validaciones
    if (!templateId) {
      return NextResponse.json({ error: "Plantilla requerida" }, { status: 400 })
    }

    // Verificar que la plantilla existe y pertenece al trainer
    const template = await prisma.trainerTaskTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template || template.trainerId !== userId || !template.isActive) {
      return NextResponse.json({ error: "Plantilla no válida" }, { status: 400 })
    }

    // Verificar scope (visión/producto)
    if (visionId) {
      // Verificar que el trainer tiene acceso a esta visión
      const visionStaff = await prisma.visionStaff.findFirst({
        where: {
          visionId,
          userId,
          role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
        }
      })

      // También verificar productos donde es trainer directo
      const productWithTrainer = await prisma.schoolProduct.findFirst({
        where: {
          visionId,
          trainerId: userId
        }
      })

      if (!visionStaff && !productWithTrainer) {
        return NextResponse.json({ error: "Sin acceso a esta visión" }, { status: 403 })
      }
    }

    // Determinar fecha de liberación
    const now = new Date()
    let finalReleaseAt = now
    let finalStatus: 'SCHEDULED' | 'ACTIVE' = 'ACTIVE'

    if (releaseType === 'scheduled' && releaseAt) {
      finalReleaseAt = new Date(releaseAt)
      if (finalReleaseAt > now) {
        finalStatus = 'SCHEDULED'
      }
    }

    // Crear la misión
    const mission = await prisma.trainerMission.create({
      data: {
        templateId,
        trainerId: userId,
        visionId: visionId || null,
        productId: productId || null,
        squadId: squadId || null,
        releaseType: releaseType || 'immediate',
        releaseAt: finalReleaseAt,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        status: finalStatus,
        trainerMessage: trainerMessage || null,
        bonusPoints: bonusPoints || null,
        bonusDeadline: bonusDeadline ? new Date(bonusDeadline) : null,
        updatedAt: new Date()
      },
      include: {
        TrainerTaskTemplate: true,
        Vision: true,
        SchoolProduct: true
      }
    })

    // Incrementar contador de uso de la plantilla
    await prisma.trainerTaskTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    })

    // Si es liberación inmediata, crear submissions para participantes
    if (finalStatus === 'ACTIVE') {
      await createSubmissionsForMission(mission.id, visionId, productId, squadId, userId)
    }

    return NextResponse.json({
      success: true,
      mission,
      message: finalStatus === 'SCHEDULED' 
        ? `Misión programada para ${finalReleaseAt.toLocaleString()}`
        : 'Misión lanzada exitosamente'
    })

  } catch (error) {
    logger.error("Error al lanzar misión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// Función auxiliar para crear submissions para participantes
// SOLO para usuarios con asistencia confirmada (attendanceStatus = 'ATTENDED')
// Determina el nivel basándose en el rol del trainer en VisionStaff
async function createSubmissionsForMission(
  missionId: number,
  visionId: number | null,
  productId: number | null,
  squadId: string | null,
  trainerId: number
) {
  try {
    let participantIds: number[] = []

    // Primero determinar el nivel del trainer basándose en su rol en VisionStaff
    let trainerLevel: string | null = null
    
    if (visionId) {
      const staffRole = await prisma.visionStaff.findFirst({
        where: { 
          userId: trainerId, 
          visionId,
          role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
        },
        select: { role: true }
      })
      
      if (staffRole) {
        // Mapear rol de staff a nivel de enrollment
        const roleToLevel: Record<string, string> = {
          'BASIC_TRAINER': 'BASIC',
          'ADVANCED_TRAINER': 'ADVANCED',
          'PL_TRAINER': 'PL'
        }
        trainerLevel = roleToLevel[staffRole.role] || null
      }
    }

    if (squadId) {
      // Obtener miembros del squad específico QUE TIENEN ASISTENCIA
      const members = await prisma.smallGroupMember.findMany({
        where: { 
          groupId: squadId, 
          isActive: true
        },
        select: { userId: true }
      })
      
      // Filtrar solo los que tienen asistencia en el nivel del trainer
      const group = await prisma.smallGroup.findUnique({
        where: { id: squadId },
        select: { productId: true, SchoolProduct: { select: { visionId: true } } }
      })
      
      if (group?.SchoolProduct && trainerLevel) {
        const attendedUsers = await prisma.vision_enrollments.findMany({
          where: {
            visionId: group.SchoolProduct.visionId,
            level: trainerLevel,
            attendanceStatus: 'ATTENDED',
            userId: { in: members.map(m => m.userId) }
          },
          select: { userId: true }
        })
        participantIds = attendedUsers.map(e => e.userId)
      }
    } else if (productId) {
      // Obtener el producto para saber la visión
      const product = await prisma.schoolProduct.findUnique({
        where: { id: productId },
        select: { visionId: true, name: true }
      })
      
      if (product && trainerLevel) {
        // Obtener usuarios con asistencia confirmada en el nivel del trainer
        const enrollments = await prisma.vision_enrollments.findMany({
          where: {
            visionId: product.visionId,
            level: trainerLevel,
            attendanceStatus: 'ATTENDED'
          },
          select: { userId: true },
          distinct: ['userId']
        })
        participantIds = enrollments.map(e => e.userId)
      }
    } else if (visionId && trainerLevel) {
      // Para toda la visión, obtener usuarios con asistencia en el nivel del trainer
      const enrollments = await prisma.vision_enrollments.findMany({
        where: { 
          visionId,
          level: trainerLevel,
          attendanceStatus: 'ATTENDED'
        },
        select: { userId: true },
        distinct: ['userId']
      })
      participantIds = enrollments.map(e => e.userId)
    }

    // Crear submissions en batch
    if (participantIds.length > 0) {
      await prisma.missionSubmission.createMany({
        data: participantIds.map(userId => ({
          missionId,
          userId,
          status: 'PENDING',
          updatedAt: new Date() // Campo requerido
        })),
        skipDuplicates: true
      })
    }

    logger.debug(`✅ Creadas ${participantIds.length} submissions para misión ${missionId} (nivel: ${trainerLevel}, solo usuarios con asistencia confirmada)`)
  } catch (error) {
    logger.error("Error creando submissions:", error)
  }
}
