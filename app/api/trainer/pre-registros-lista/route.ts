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

    // 2. Obtener productos via VisionStaff
    const visionStaffAssignments = await prisma.visionStaff.findMany({
      where: {
        userId: usuario.id,
        role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
      },
      select: { visionId: true }
    })

    const visionIds = [...new Set(visionStaffAssignments.map(v => v.visionId))]
    
    let productosViaVision: { id: number }[] = []
    if (visionIds.length > 0) {
      productosViaVision = await prisma.schoolProduct.findMany({
        where: {
          visionId: { in: visionIds },
          isActive: true
        },
        select: { id: true }
      })
    }

    const productIds = [...new Set([
      ...productosDirectos.map(p => p.id),
      ...productosViaVision.map(p => p.id)
    ])]

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        preRegistros: [],
        totals: { pending: 0, paid: 0 }
      })
    }

    // Si se pide PAID, buscar en vision_enrollments (los que ya están inscritos en ADVANCED)
    if (statusFilter === 'PAID') {
      // Obtener las visiones de los productos
      const productos = await prisma.schoolProduct.findMany({
        where: { id: { in: productIds } },
        select: { visionId: true, levelType: true }
      })
      
      const visionIdsFromProducts = productos
        .filter(p => p.visionId && p.levelType === 'ADVANCED')
        .map(p => p.visionId as number)
      
      // Si no hay productos ADVANCED, buscar todos los ADVANCED de la organización
      let finalVisionIds = visionIdsFromProducts
      if (finalVisionIds.length === 0 && usuario.organizationId) {
        const advancedProducts = await prisma.schoolProduct.findMany({
          where: {
            organizationId: usuario.organizationId,
            levelType: 'ADVANCED',
            isActive: true
          },
          select: { visionId: true }
        })
        finalVisionIds = advancedProducts.filter(p => p.visionId).map(p => p.visionId as number)
      }
      
      if (finalVisionIds.length === 0) {
        return NextResponse.json({
          success: true,
          preRegistros: [],
          totals: { pending: 0, paid: 0 }
        })
      }
      
      // Buscar enrollments de ADVANCED con status ENROLLED/ACTIVE
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: { in: finalVisionIds },
          level: 'ADVANCED',
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
        targetProduct: { id: 0, name: 'Avanzado', levelType: 'ADVANCED' },
        scannedBy: e.Usuario_vision_enrollments_invitedByToUsuario ? {
          id: e.Usuario_vision_enrollments_invitedByToUsuario.id,
          nombre: e.Usuario_vision_enrollments_invitedByToUsuario.nombre
        } : null
      }))
      
      // También contar pre-registros PENDING para el total
      const pendingCount = await prisma.advancedPreRegistration.count({
        where: {
          OR: [
            { currentProductId: { in: productIds } },
            { targetProductId: { in: productIds } }
          ],
          status: 'PENDING'
        }
      })
      
      return NextResponse.json({
        success: true,
        preRegistros: formattedEnrollments,
        totals: { pending: pendingCount, paid: formattedEnrollments.length }
      })
    }

    // Para PENDING o 'all', seguir con la lógica original de pre-registros
    // Construir filtro de status
    const statusWhere = statusFilter === 'all' 
      ? { status: { in: [PreRegistrationStatus.PENDING, PreRegistrationStatus.PAID] as PreRegistrationStatus[] } }
      : { status: statusFilter as PreRegistrationStatus }

    // Obtener pre-registros con información de usuario
    const preRegistros = await prisma.advancedPreRegistration.findMany({
      where: {
        OR: [
          { currentProductId: { in: productIds } },
          { targetProductId: { in: productIds } }
        ],
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
        // Buscar quienes ya están inscritos en ADVANCED
        const alreadyEnrolled = await prisma.vision_enrollments.findMany({
          where: {
            userId: { in: userIds },
            visionId: { in: targetVisionIds },
            level: 'ADVANCED',
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
