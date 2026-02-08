// API para gestionar Pre-Registros de Avanzado
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import logger from '@/lib/logger';


// GET: Obtener pre-registros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const productId = searchParams.get("productId")
    const status = searchParams.get("status")

    const where: any = {}

    // Si es para un usuario específico (su propio dashboard)
    if (userId) {
      where.userId = parseInt(userId)
    }

    // Si es para un producto específico (vista coordinador)
    if (productId) {
      where.targetProductId = parseInt(productId)
    }

    // Filtrar por status
    if (status) {
      where.status = status
    }

    const preRegistrations = await prisma.advancedPreRegistration.findMany({
      where,
      include: {
        Usuario: {
          select: { id: true, nombre: true, email: true, imagen: true, telefono: true }
        },
        SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct: {
          select: { id: true, name: true, levelType: true }
        },
        SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct: {
          select: { id: true, name: true, levelType: true, startDate: true, basePrice: true }
        },
        Usuario_AdvancedPreRegistration_scannedByStaffIdToUsuario: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { scannedAt: "desc" }
    })

    // Calcular stats
    const stats = {
      total: preRegistrations.length,
      pending: preRegistrations.filter((pr: any) => pr.status === "PENDING").length,
      paid: preRegistrations.filter((pr: any) => pr.status === "PAID").length,
      expired: preRegistrations.filter((pr: any) => pr.status === "EXPIRED").length
    }

    // Calcular countdown para cada pre-registro pendiente
    const now = Date.now()
    const preRegistrationsWithCountdown = preRegistrations.map((pr: any) => ({
      ...pr,
      countdownSeconds: pr.status === "PENDING" 
        ? Math.max(0, Math.floor((new Date(pr.promoDeadline).getTime() - now) / 1000))
        : null,
      isExpiringSoon: pr.status === "PENDING" && 
        new Date(pr.promoDeadline).getTime() - now < 3600000 // menos de 1 hora
    }))

    return NextResponse.json({
      preRegistrations: preRegistrationsWithCountdown,
      stats
    })

  } catch (error) {
    logger.error("Error al obtener pre-registros:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PATCH: Actualizar pre-registro (marcar como pagado, cancelar, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { preRegistrationId, status, paymentAmount, paymentMethod, transactionId } = body

    if (!preRegistrationId) {
      return NextResponse.json({ error: "preRegistrationId es requerido" }, { status: 400 })
    }

    const updateData: any = {}

    if (status) {
      updateData.status = status
      
      if (status === "PAID") {
        updateData.paidAt = new Date()
        if (paymentAmount) updateData.paymentAmount = paymentAmount
        if (paymentMethod) updateData.paymentMethod = paymentMethod
        if (transactionId) updateData.transactionId = transactionId
      }
    }

    const updated = await prisma.advancedPreRegistration.update({
      where: { id: preRegistrationId },
      data: updateData,
      include: {
        Usuario: {
          select: { id: true, nombre: true }
        },
        SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      preRegistration: updated
    })

  } catch (error) {
    logger.error("Error al actualizar pre-registro:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// Cron job endpoint para expirar pre-registros vencidos
export async function PUT(request: NextRequest) {
  try {
    // Verificar secret key para cron
    const { searchParams } = new URL(request.url)
    const cronSecret = searchParams.get("secret")
    
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Expirar pre-registros cuyo deadline ya pasó
    const expired = await prisma.advancedPreRegistration.updateMany({
      where: {
        status: "PENDING",
        promoDeadline: { lt: new Date() }
      },
      data: {
        status: "EXPIRED"
      }
    })

    return NextResponse.json({
      success: true,
      expiredCount: expired.count
    })

  } catch (error) {
    logger.error("Error en cron de expiración:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
