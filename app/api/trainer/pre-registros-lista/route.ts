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
            profileImage: true
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
            levelType: true
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

    // Contar totales
    const pending = preRegistros.filter(p => p.status === 'PENDING').length
    const paid = preRegistros.filter(p => p.status === 'PAID').length

    // Formatear respuesta
    const formattedPreRegistros = preRegistros.map(pr => ({
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
      scannedBy: pr.scannedByStaff
    }))

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
