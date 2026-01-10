// API para gestionar sesiones de "El Cruce"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET: Obtener sesión activa o por ID
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const productId = searchParams.get("productId")

    if (sessionId) {
      // Obtener sesión específica
      const crossingSession = await prisma.crossingSession.findUnique({
        where: { id: sessionId },
        include: {
          product: {
            select: { id: true, name: true, levelType: true, startDate: true, endDate: true }
          },
          creator: {
            select: { id: true, nombre: true }
          }
        }
      })

      if (!crossingSession) {
        return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
      }

      return NextResponse.json({ session: crossingSession })
    }

    if (productId) {
      // Buscar sesión activa para este producto
      const activeSession = await prisma.crossingSession.findFirst({
        where: {
          productId: parseInt(productId),
          status: { in: ["WAITING", "ACTIVE", "PAUSED"] }
        },
        include: {
          product: {
            select: { id: true, name: true, levelType: true }
          }
        },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json({ session: activeSession })
    }

    return NextResponse.json({ error: "Se requiere sessionId o productId" }, { status: 400 })

  } catch (error) {
    console.error("Error al obtener sesión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Crear nueva sesión de El Cruce
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { productId, targetLevel, targetProductId, visualTheme } = body

    if (!productId || !targetLevel) {
      return NextResponse.json(
        { error: "productId y targetLevel son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el producto existe
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      include: {
        Vision: true,
        _count: {
          select: { CheckInRecord: { where: { status: "CHECKED_IN" } } }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    // Verificar que no hay sesión activa para este producto
    const existingSession = await prisma.crossingSession.findFirst({
      where: {
        productId,
        status: { in: ["WAITING", "ACTIVE", "PAUSED"] }
      }
    })

    if (existingSession) {
      return NextResponse.json(
        { error: "Ya existe una sesión activa para este producto", existingSession },
        { status: 409 }
      )
    }

    // Obtener total de participantes (los que hicieron check-in)
    const totalParticipants = product._count.CheckInRecord

    // Crear nueva sesión
    const newSession = await prisma.crossingSession.create({
      data: {
        productId,
        targetLevel,
        targetProductId: targetProductId || null,
        status: "WAITING",
        totalParticipants,
        crossedCount: 0,
        soundEnabled: true,
        visualTheme: visualTheme || "quantum_fire",
        createdBy: parseInt(session.user.id)
      },
      include: {
        product: {
          select: { id: true, name: true, levelType: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      session: newSession,
      message: "Sesión de El Cruce creada"
    })

  } catch (error) {
    console.error("Error al crear sesión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PATCH: Actualizar estado de sesión
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, status, soundEnabled, visualTheme } = body

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 })
    }

    const updateData: any = {}
    
    if (status) {
      updateData.status = status
      if (status === "ACTIVE" && !updateData.startedAt) {
        updateData.startedAt = new Date()
      }
      if (status === "COMPLETED") {
        updateData.endedAt = new Date()
      }
    }
    
    if (typeof soundEnabled === "boolean") {
      updateData.soundEnabled = soundEnabled
    }
    
    if (visualTheme) {
      updateData.visualTheme = visualTheme
    }

    const updated = await prisma.crossingSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      session: updated
    })

  } catch (error) {
    console.error("Error al actualizar sesión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// DELETE: Cerrar/eliminar sesión
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 })
    }

    await prisma.crossingSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: "Sesión finalizada"
    })

  } catch (error) {
    console.error("Error al cerrar sesión:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
