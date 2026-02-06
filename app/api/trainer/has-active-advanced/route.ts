// API para verificar si un trainer tiene un avanzado vigente asignado
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ hasActiveAdvanced: false }, { status: 200 })
    }

    const userId = Number(session.user.id)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ hasActiveAdvanced: false }, { status: 200 })
    }

    // Buscar si tiene asignaciones de staff como ADVANCED_TRAINER en visiones activas
    const activeAdvancedAssignment = await prisma.visionStaff.findFirst({
      where: {
        userId: usuario.id,
        role: 'ADVANCED_TRAINER',
        level: 'ADVANCED',
        Vision: {
          isActive: true
        }
      },
      select: {
        id: true,
        visionId: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
            advancedEndDate: true
          }
        }
      }
    })

    // También verificar si es trainer directo de un producto ADVANCED activo y no completado
    const activeAdvancedProduct = await prisma.schoolProduct.findFirst({
      where: {
        trainerId: usuario.id,
        levelType: 'ADVANCED',
        isActive: true,
        trainingStatus: { not: 'COMPLETED' }
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        trainingStatus: true
      }
    })

    const hasActiveAdvanced = !!(activeAdvancedAssignment || activeAdvancedProduct)

    return NextResponse.json({ 
      hasActiveAdvanced,
      debug: {
        viaStaff: !!activeAdvancedAssignment,
        viaProduct: !!activeAdvancedProduct,
        staffData: activeAdvancedAssignment,
        productData: activeAdvancedProduct
      }
    })

  } catch (error) {
    logger.error('Error checking active advanced:', error)
    return NextResponse.json({ hasActiveAdvanced: false }, { status: 200 })
  }
}
