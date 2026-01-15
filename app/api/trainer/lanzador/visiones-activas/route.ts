// API para obtener visiones activas del trainer (para el selector del lanzador)
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener visiones donde el trainer tiene productos EN CURSO asignados
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

    const now = new Date()
    
    // Obtener productos donde es trainer directo y están EN CURSO (no terminados)
    const productsAsTrainer = await prisma.schoolProduct.findMany({
      where: {
        trainerId: userId,
        isActive: true,
        trainingStatus: { not: 'COMPLETED' }, // No mostrar visiones terminadas
        // Producto en curso: startDate <= now <= endDate (con margen de 1 día)
        startDate: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        endDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            isActive: true,
            Organization: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // Agrupar por visión
    const visionMap = new Map()

    productsAsTrainer.forEach(product => {
      if (product.Vision) {
        const vId = product.Vision.id
        if (!visionMap.has(vId)) {
          visionMap.set(vId, {
            id: product.Vision.id,
            nombre: product.Vision.nombre,
            organizacion: product.Vision.Organization?.name || '',
            isActive: product.Vision.isActive,
            productos: [{
              id: product.id,
              name: product.name,
              levelType: product.levelType,
              startDate: product.startDate,
              endDate: product.endDate
            }]
          })
        } else {
          const existing = visionMap.get(vId)
          existing.productos.push({
            id: product.id,
            name: product.name,
            levelType: product.levelType,
            startDate: product.startDate,
            endDate: product.endDate
          })
        }
      }
    })

    const visiones = Array.from(visionMap.values())
    
    console.log('🚀 Visiones activas para trainer:', userId, visiones.map(v => ({ id: v.id, nombre: v.nombre })))

    return NextResponse.json({
      success: true,
      visiones
    })

  } catch (error) {
    console.error("Error al obtener visiones activas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
