// API para obtener historial de sesiones de El Atravezar
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET: Obtener historial de sesiones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar rol - solo DIRECTOR, TRAINER, COORDINADOR, SCHOOL_ADMIN, ADMINISTRADOR
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true 
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Solo SCHOOL_ADMIN y TRAINER pueden ver el historial
    const allowedRoles = [
      'SCHOOL_ADMIN',
      'TRAINER'
    ]

    if (!allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: "No autorizado para ver historial" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const visionId = searchParams.get("visionId")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Construir filtro
    const where: any = {}

    // Filtrar por organización del usuario
    if (usuario.organizationId) {
      where.product = {
        OR: [
          { organizationId: usuario.organizationId },
          { Vision: { organizationId: usuario.organizationId } }
        ]
      }
    }

    // Filtrar por producto específico
    if (productId) {
      where.productId = parseInt(productId)
    }

    // Filtrar por visión
    if (visionId) {
      where.product = {
        ...where.product,
        visionId: parseInt(visionId)
      }
    }

    // Obtener sesiones (todas, incluyendo completadas)
    const sessions = await prisma.crossingSession.findMany({
      where,
      include: {
        product: {
          select: { 
            id: true, 
            name: true, 
            levelType: true,
            startDate: true,
            endDate: true,
            Vision: {
              select: { id: true, nombre: true }
            }
          }
        },
        creator: {
          select: { id: true, nombre: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    // Calcular estadísticas globales
    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'COMPLETED').length,
      totalCrossed: sessions.reduce((acc, s) => acc + s.crossedCount, 0),
      totalParticipants: sessions.reduce((acc, s) => acc + s.totalParticipants, 0),
      averageConversionRate: 0
    }

    // Calcular tasa de conversión promedio
    const sessionsWithParticipants = sessions.filter(s => s.totalParticipants > 0)
    if (sessionsWithParticipants.length > 0) {
      const totalRate = sessionsWithParticipants.reduce((acc, s) => {
        return acc + (s.crossedCount / s.totalParticipants) * 100
      }, 0)
      stats.averageConversionRate = Math.round(totalRate / sessionsWithParticipants.length)
    }

    // Agregar duración calculada a cada sesión
    const sessionsWithDuration = sessions.map(session => {
      let duration = null
      if (session.startedAt && session.endedAt) {
        const start = new Date(session.startedAt)
        const end = new Date(session.endedAt)
        const diffMs = end.getTime() - start.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      }
      return {
        ...session,
        duration,
        creator: session.creator ? {
          firstName: session.creator.nombre?.split(' ')[0] || '',
          lastName: session.creator.nombre?.split(' ').slice(1).join(' ') || ''
        } : null
      }
    })

    return NextResponse.json({
      success: true,
      sessions: sessionsWithDuration,
      stats
    })

  } catch (error) {
    console.error("Error al obtener historial:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
