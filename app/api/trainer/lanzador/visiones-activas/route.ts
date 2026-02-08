// API para obtener visiones activas del trainer (para el selector del lanzador)
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import logger from '@/lib/logger';

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

    // También obtener visiones donde es trainer via VisionStaff (PL_TRAINER, ADVANCED_TRAINER, BASIC_TRAINER)
    const visionStaffAssignments = await prisma.visionStaff.findMany({
      where: {
        userId: userId,
        role: { in: ['PL_TRAINER', 'ADVANCED_TRAINER', 'BASIC_TRAINER'] }
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            isActive: true,
            Organization: {
              select: { id: true, name: true }
            },
            // Obtener productos de la visión para verificar fechas
            SchoolProduct: {
              where: {
                isActive: true,
                trainingStatus: { not: 'COMPLETED' },
                startDate: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
                endDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
              },
              select: {
                id: true,
                name: true,
                levelType: true,
                startDate: true,
                endDate: true
              }
            }
          }
        }
      }
    })

    // Agrupar por visión
    const visionMap = new Map()

    // Agregar productos donde es trainer directo
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

    // Agregar visiones donde es trainer via VisionStaff
    visionStaffAssignments.forEach(staff => {
      if (staff.Vision && staff.Vision.SchoolProduct && staff.Vision.SchoolProduct.length > 0) {
        const vId = staff.Vision.id
        if (!visionMap.has(vId)) {
          visionMap.set(vId, {
            id: staff.Vision.id,
            nombre: staff.Vision.nombre,
            organizacion: staff.Vision.Organization?.name || '',
            isActive: staff.Vision.isActive,
            staffRole: staff.role, // Indicar que es via VisionStaff
            productos: staff.Vision.SchoolProduct.map(p => ({
              id: p.id,
              name: p.name,
              levelType: p.levelType,
              startDate: p.startDate,
              endDate: p.endDate
            }))
          })
        }
        // Si ya existe la visión, no duplicar (trainer directo tiene prioridad)
      }
    })

    const visiones = Array.from(visionMap.values())
    
    logger.debug('🚀 Visiones activas para trainer:', userId, visiones.map(v => ({ id: v.id, nombre: v.nombre })))

    return NextResponse.json({
      success: true,
      visiones
    })

  } catch (error) {
    logger.error("Error al obtener visiones activas:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
