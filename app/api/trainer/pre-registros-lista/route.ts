import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PreRegistrationStatus } from '@prisma/client'

/**
 * GET /api/trainer/pre-registros-lista
 * 
 * Obtiene la lista detallada de pre-registros (pendientes y pagados)
 * para los productos asignados al trainer
 * 
 * Query params:
 * - status: 'PENDING' | 'PAID' | 'all' (default: 'all')
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar permisos - solo trainers y roles superiores
    const allowedRoles = ['TRAINER', 'SCHOOL_ADMIN', 'COORDINATOR', 'COORDINATOR_BASIC', 
                         'COORDINATOR_ADVANCED', 'COORDINATOR_PL', 'DIRECTOR', 'ADMINISTRADOR']
    if (!allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'

    // 1. Obtener productos donde es trainer directo
    const productosDirectos = await prisma.schoolProduct.findMany({
      where: {
        trainerId: usuario.id,
        isActive: true
      },
      select: { id: true }
    })

    // 2. Obtener productos via VisionStaff y determinar nivel del trainer
    const visionStaffAssignments = await prisma.visionStaff.findMany({
      where: {
        userId: usuario.id,
        role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
      },
      select: { visionId: true, level: true, role: true }
    })

    const visionIds = [...new Set(visionStaffAssignments.map(v => v.visionId))]
    
    // Determinar qué nivel de trainer es
    const trainerLevels = new Set(visionStaffAssignments.map(v => v.level))
    const isBasicTrainer = trainerLevels.has('BASIC')
    const isAdvancedTrainer = trainerLevels.has('ADVANCED')
    const isPLTrainer = trainerLevels.has('PL')
    
    let productosViaVision: { id: number; levelType: string }[] = []
    if (visionIds.length > 0) {
      productosViaVision = await prisma.schoolProduct.findMany({
        where: {
          visionId: { in: visionIds },
          isActive: true
        },
        select: { id: true, levelType: true }
      })
    }

    // Filtrar productos por nivel del trainer
    const basicProductIds = productosViaVision.filter(p => p.levelType === 'BASIC').map(p => p.id)
    const advancedProductIds = productosViaVision.filter(p => p.levelType === 'ADVANCED').map(p => p.id)
    const plProductIds = productosViaVision.filter(p => p.levelType === 'PL').map(p => p.id)

    // Determinar qué productos usar como "currentProductId" según el nivel del trainer
    // - Trainer BASIC: ver pre-registros desde productos BASIC (hacia ADVANCED)
    // - Trainer ADVANCED: ver pre-registros desde productos ADVANCED (hacia PL)
    let relevantCurrentProductIds: number[] = []
    if (isAdvancedTrainer) {
      relevantCurrentProductIds = advancedProductIds
    } else if (isBasicTrainer) {
      relevantCurrentProductIds = basicProductIds
    } else {
      // Fallback: usar todos los productos
      relevantCurrentProductIds = [...basicProductIds, ...advancedProductIds]
    }

    if (relevantCurrentProductIds.length === 0) {
      return NextResponse.json({
        success: true,
        preRegistros: [],
        totals: { pending: 0, paid: 0 }
      })
    }

    // Si se pide PAID, buscar en vision_enrollments (los que ya están inscritos en el siguiente nivel)
    if (statusFilter === 'PAID') {
      // Para trainer ADVANCED: buscar inscritos en PL
      // Para trainer BASIC: buscar inscritos en ADVANCED
      const targetLevel = isAdvancedTrainer ? 'PL' : 'ADVANCED'
      
      if (visionIds.length === 0) {
        return NextResponse.json({
          success: true,
          preRegistros: [],
          totals: { pending: 0, paid: 0 }
        })
      }
      
      // Buscar enrollments del nivel target con status ENROLLED/ACTIVE
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: { in: visionIds },
          level: targetLevel,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              imagen: true,
              profileImage: true
            }
          },
          Usuario_vision_enrollments_invitedByToUsuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Formatear como pre-registros para mantener compatibilidad
      const targetLevelName = isAdvancedTrainer ? 'PL' : 'Avanzado'
      const formattedEnrollments = enrollments.map(e => ({
        id: e.id.toString(),
        status: 'PAID',
        scannedAt: e.createdAt,
        promoPrice: null,
        regularPrice: null,
        promoDeadline: null,
        paidAt: e.createdAt,
        paymentAmount: null,
        paymentMethod: null,
        user: {
          id: e.Usuario_vision_enrollments_userIdToUsuario?.id || 0,
          nombre: e.Usuario_vision_enrollments_userIdToUsuario?.nombre || 'Sin nombre',
          email: e.Usuario_vision_enrollments_userIdToUsuario?.email || '',
          telefono: e.Usuario_vision_enrollments_userIdToUsuario?.telefono || null,
          imagen: e.Usuario_vision_enrollments_userIdToUsuario?.imagen || 
                  e.Usuario_vision_enrollments_userIdToUsuario?.profileImage || null
        },
        currentProduct: null,
        targetProduct: { id: 0, name: targetLevelName, levelType: targetLevel },
        scannedBy: e.Usuario_vision_enrollments_invitedByToUsuario ? {
          id: e.Usuario_vision_enrollments_invitedByToUsuario.id,
          nombre: e.Usuario_vision_enrollments_invitedByToUsuario.nombre
        } : null
      }))
      
      // También contar pre-registros PENDING para el total
      const pendingCount = await prisma.advancedPreRegistration.count({
        where: {
          currentProductId: { in: relevantCurrentProductIds },
          status: 'PENDING'
        }
      })
      
      return NextResponse.json({
        success: true,
        preRegistros: formattedEnrollments,
        totals: { pending: pendingCount, paid: formattedEnrollments.length }
      })
    }

    // Para PENDING o 'all', seguir con la lógica de pre-registros
    // Solo buscar por currentProductId (desde donde vienen los usuarios)
    // Construir filtro de status
    const statusWhere = statusFilter === 'all' 
      ? { status: { in: [PreRegistrationStatus.PENDING, PreRegistrationStatus.PAID] as PreRegistrationStatus[] } }
      : { status: statusFilter as PreRegistrationStatus }

    // Obtener pre-registros con información de usuario
    // Solo buscar por currentProductId (desde donde vienen los usuarios según el nivel del trainer)
    const preRegistros = await prisma.advancedPreRegistration.findMany({
      where: {
        currentProductId: { in: relevantCurrentProductIds },
        ...statusWhere
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            imagen: true,
            profileImage: true,
            // Obtener el Game Changer del usuario usando la relación directa
            gameChangerId: true,
            Usuario_Usuario_gameChangerIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        },
        currentProduct: {
          select: {
            id: true,
            name: true,
            levelType: true
          }
        },
        targetProduct: {
          select: {
            id: true,
            name: true,
            levelType: true,
            visionId: true
          }
        },
        scannedByStaff: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { scannedAt: 'desc' }
    })

    // Para PENDING: excluir los que ya están inscritos en ADVANCED
    let filteredPreRegistros = preRegistros
    if (statusFilter === 'PENDING') {
      // Obtener los userIds de los pre-registros
      const userIds = preRegistros.map(pr => pr.user.id)
      
      // Obtener los visionIds de los productos target
      const targetVisionIds = preRegistros
        .filter(pr => pr.targetProduct?.visionId)
        .map(pr => pr.targetProduct!.visionId as number)
      
      if (userIds.length > 0 && targetVisionIds.length > 0) {
        // Buscar quienes ya están inscritos en el nivel target
        // Para trainer BASIC: verificar inscritos en ADVANCED
        // Para trainer ADVANCED: verificar inscritos en PL
        const checkLevel = isAdvancedTrainer ? 'PL' : 'ADVANCED'
        const alreadyEnrolled = await prisma.vision_enrollments.findMany({
          where: {
            userId: { in: userIds },
            visionId: { in: targetVisionIds },
            level: checkLevel,
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          },
          select: { userId: true }
        })
        
        const enrolledUserIds = new Set(alreadyEnrolled.map(e => e.userId))
        
        // Filtrar los pre-registros excluyendo los que ya pagaron
        filteredPreRegistros = preRegistros.filter(pr => !enrolledUserIds.has(pr.user.id))
      }
    }

    // Contar totales
    const pending = filteredPreRegistros.filter(p => p.status === 'PENDING').length
    const paid = filteredPreRegistros.filter(p => p.status === 'PAID').length

    // Formatear respuesta
    const formattedPreRegistros = filteredPreRegistros.map(pr => {
      // Obtener el Game Changer del usuario usando la relación directa
      const gameChanger = pr.user.Usuario_Usuario_gameChangerIdToUsuario || null

      return {
        id: pr.id,
        status: pr.status,
        scannedAt: pr.scannedAt,
        promoPrice: pr.promoPrice,
        regularPrice: pr.regularPrice,
        promoDeadline: pr.promoDeadline,
        paidAt: pr.paidAt,
        paymentAmount: pr.paymentAmount,
        paymentMethod: pr.paymentMethod,
        user: {
          id: pr.user.id,
          nombre: pr.user.nombre,
          email: pr.user.email,
          telefono: pr.user.telefono,
          imagen: pr.user.imagen || pr.user.profileImage
        },
        currentProduct: pr.currentProduct,
        targetProduct: pr.targetProduct,
        scannedBy: pr.scannedByStaff,
        gameChanger: gameChanger
      }
    })

    return NextResponse.json({
      success: true,
      preRegistros: formattedPreRegistros,
      totals: { pending, paid }
    })

  } catch (error) {
    console.error('Error obteniendo lista de pre-registros:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
