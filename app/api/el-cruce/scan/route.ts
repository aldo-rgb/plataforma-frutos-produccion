// API de Escaneo Rápido para Staff - "El Cruce"
// One-tap interaction: Escanea QR/NFC → Crea PreRegistro → Emite WebSocket

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { emitCrossing, emitCrossingStats, emitPreRegistrationAlert } from "@/lib/socket"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const staffId = parseInt(session.user.id)
    const body = await request.json()
    const { 
      sessionId,        // ID de la sesión de El Cruce activa
      participantCode,  // Código del gafete (QR o NFC)
      participantId,    // O directamente el ID del participante
      scanMethod = "QR" // QR, NFC, MANUAL
    } = body

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 })
    }

    if (!participantCode && !participantId) {
      return NextResponse.json(
        { error: "participantCode o participantId es requerido" },
        { status: 400 }
      )
    }

    // 1. Obtener la sesión de El Cruce
    const crossingSession = await prisma.crossingSession.findUnique({
      where: { id: sessionId },
      include: {
        product: {
          include: {
            Organization: true,
            Vision: true
          }
        }
      }
    })

    if (!crossingSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    if (crossingSession.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "La sesión no está activa", status: crossingSession.status },
        { status: 400 }
      )
    }

    // 2. Buscar al participante
    let participant
    if (participantId) {
      participant = await prisma.usuario.findUnique({
        where: { id: participantId },
        select: { id: true, nombre: true, email: true, image: true, badgeCode: true }
      })
    } else {
      // Buscar por código de gafete (badgeCode o referralCode)
      participant = await prisma.usuario.findFirst({
        where: {
          OR: [
            { badgeCode: participantCode },
            { referralCode: participantCode }
          ]
        },
        select: { id: true, nombre: true, email: true, image: true, badgeCode: true }
      })
    }

    if (!participant) {
      return NextResponse.json(
        { error: "Participante no encontrado", code: participantCode },
        { status: 404 }
      )
    }

    // 3. Verificar que el participante tiene enrollment en el producto actual
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participant.id,
        visionId: crossingSession.product.visionId!,
        level: crossingSession.product.levelType as any,
        enrollmentStatus: { in: ["ENROLLED", "ACTIVE", "IN_PROGRESS"] }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "El participante no está inscrito en este entrenamiento" },
        { status: 400 }
      )
    }

    // 4. Buscar producto destino (ADVANCED)
    let targetProduct
    if (crossingSession.targetProductId) {
      targetProduct = await prisma.schoolProduct.findUnique({
        where: { id: crossingSession.targetProductId }
      })
    } else {
      // Buscar próximo producto del nivel target
      targetProduct = await prisma.schoolProduct.findFirst({
        where: {
          visionId: crossingSession.product.visionId,
          levelType: crossingSession.targetLevel,
          isActive: true,
          startDate: { gte: new Date() }
        },
        orderBy: { startDate: "asc" }
      })
    }

    if (!targetProduct) {
      return NextResponse.json(
        { error: "No hay producto destino disponible" },
        { status: 400 }
      )
    }

    // 5. Verificar que no tiene pre-registro previo
    const existingPreReg = await prisma.advancedPreRegistration.findUnique({
      where: {
        userId_targetProductId: {
          userId: participant.id,
          targetProductId: targetProduct.id
        }
      }
    })

    if (existingPreReg) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        message: "Participante ya pre-registrado",
        participant: {
          id: participant.id,
          nombre: participant.nombre
        }
      })
    }

    // 6. Calcular precios y deadline
    // El deadline es 11:59 PM del último día del entrenamiento actual
    const promoDeadline = crossingSession.product.endDate 
      ? new Date(crossingSession.product.endDate)
      : new Date()
    promoDeadline.setHours(23, 59, 59, 999)

    const promoPrice = targetProduct.promoPrice || targetProduct.basePrice * 0.833 // ~$7500 de $9000
    const regularPrice = targetProduct.basePrice

    // 7. Crear el PreRegistro
    const preRegistration = await prisma.advancedPreRegistration.create({
      data: {
        userId: participant.id,
        currentProductId: crossingSession.productId,
        targetProductId: targetProduct.id,
        enrollmentId: enrollment.id,
        scannedByStaffId: staffId,
        scanMethod: scanMethod as any,
        status: "PENDING",
        promoPrice,
        regularPrice,
        promoDeadline
      }
    })

    // 8. Actualizar contador de la sesión
    const updatedSession = await prisma.crossingSession.update({
      where: { id: sessionId },
      data: {
        crossedCount: { increment: 1 }
      }
    })

    // 9. Emitir evento WebSocket a la pantalla gigante
    const crossedCount = updatedSession.crossedCount
    const totalParticipants = updatedSession.totalParticipants
    const remainingCount = totalParticipants - crossedCount

    // Evento de cruce para pantalla gigante
    emitCrossing(sessionId, {
      participantId: participant.id,
      participantName: participant.nombre,
      participantImage: participant.image,
      crossedCount,
      totalParticipants,
      timestamp: Date.now()
    })

    // Actualización de stats
    emitCrossingStats(sessionId, {
      crossedCount,
      totalParticipants,
      remainingCount,
      percentageCrossed: Math.round((crossedCount / totalParticipants) * 100)
    })

    // 10. Emitir alerta al dashboard del participante
    const countdownSeconds = Math.floor((promoDeadline.getTime() - Date.now()) / 1000)
    
    emitPreRegistrationAlert(participant.id.toString(), {
      preRegistrationId: preRegistration.id,
      targetProductName: targetProduct.name,
      promoPrice,
      regularPrice,
      promoDeadline: promoDeadline.toISOString(),
      countdown: countdownSeconds
    })

    // 11. Respuesta exitosa para el staff
    return NextResponse.json({
      success: true,
      message: "PRE-REGISTRO OK",
      participant: {
        id: participant.id,
        nombre: participant.nombre,
        image: participant.image
      },
      preRegistration: {
        id: preRegistration.id,
        promoPrice,
        regularPrice,
        promoDeadline
      },
      stats: {
        crossedCount,
        totalParticipants,
        remainingCount
      }
    })

  } catch (error) {
    console.error("Error en escaneo:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// GET: Verificar estado de un participante
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const participantCode = searchParams.get("code")
    const sessionId = searchParams.get("sessionId")

    if (!participantCode || !sessionId) {
      return NextResponse.json(
        { error: "code y sessionId son requeridos" },
        { status: 400 }
      )
    }

    // Buscar participante
    const participant = await prisma.usuario.findFirst({
      where: {
        OR: [
          { badgeCode: participantCode },
          { referralCode: participantCode }
        ]
      },
      select: { 
        id: true, 
        nombre: true, 
        email: true, 
        image: true,
        AdvancedPreRegistrations: {
          select: {
            id: true,
            status: true,
            targetProductId: true
          }
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ found: false })
    }

    // Obtener sesión para verificar producto destino
    const crossingSession = await prisma.crossingSession.findUnique({
      where: { id: sessionId }
    })

    const hasPreRegistration = participant.AdvancedPreRegistrations.some(
      pr => pr.targetProductId === crossingSession?.targetProductId
    )

    return NextResponse.json({
      found: true,
      participant: {
        id: participant.id,
        nombre: participant.nombre,
        image: participant.image
      },
      hasPreRegistration
    })

  } catch (error) {
    console.error("Error al verificar:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
