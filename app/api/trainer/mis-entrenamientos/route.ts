// API para obtener los entrenamientos asignados a un Trainer
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔍 Session user:', session?.user)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    console.log('🔍 User ID from session:', userId)

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, nombre: true, email: true }
    })

    console.log('🔍 Usuario encontrado:', usuario)

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ error: "Solo trainers pueden acceder" }, { status: 403 })
    }

    // 1. Obtener productos donde este usuario es trainer directo
    const productosDirectos = await prisma.schoolProduct.findMany({
      where: {
        trainerId: usuario.id,
        isActive: true
      },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        },
        Organization: {
          select: { id: true, name: true, logoUrl: true }
        },
        _count: {
          select: {
            CheckInRecord: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    // 2. Obtener visiones donde es staff (TRAINER roles)
    const visionStaffAssignments = await prisma.visionStaff.findMany({
      where: {
        userId: usuario.id,
        role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
      },
      select: {
        visionId: true,
        role: true,
        level: true,
        plWeekendNumber: true
      }
    })

    // 3. Obtener productos de esas visiones según el nivel
    const visionIds = [...new Set(visionStaffAssignments.map(v => v.visionId))]
    
    let productosViaStaff: typeof productosDirectos = []
    if (visionIds.length > 0) {
      // Determinar qué niveles tiene asignados y sus condiciones de búsqueda
      const levels = [...new Set(visionStaffAssignments.map(v => v.level))]
      
      // Crear condiciones de OR solo para niveles válidos
      const levelConditions: { name: { contains: string } }[] = []
      levels.forEach(level => {
        if (level === 'BASIC') levelConditions.push({ name: { contains: 'Básico' } })
        if (level === 'ADVANCED') levelConditions.push({ name: { contains: 'Avanzado' } })
        if (level === 'PL') levelConditions.push({ name: { contains: 'Liderato' } })
      })
      
      // Solo buscar si hay condiciones válidas
      if (levelConditions.length > 0) {
        productosViaStaff = await prisma.schoolProduct.findMany({
          where: {
            visionId: { in: visionIds },
            isActive: true,
            trainerId: null, // Solo productos sin trainer directo asignado
            OR: levelConditions
          },
          include: {
            Vision: {
              select: { id: true, nombre: true }
            },
            Organization: {
              select: { id: true, name: true, logoUrl: true }
            },
            _count: {
              select: {
                CheckInRecord: true
              }
            }
          },
          orderBy: { startDate: 'asc' }
        })
      }
    }

    // Combinar y eliminar duplicados
    const productosMap = new Map<number, typeof productosDirectos[0]>()
    productosDirectos.forEach(p => productosMap.set(p.id, p))
    productosViaStaff.forEach(p => {
      if (!productosMap.has(p.id)) {
        productosMap.set(p.id, p)
      }
    })
    const productos = Array.from(productosMap.values())

    console.log('🔍 Productos directos:', productosDirectos.length)
    console.log('🔍 Productos via staff:', productosViaStaff.length)
    console.log('🔍 Total productos:', productos.length)

    // Clasificar productos por estado
    const now = new Date()
    
    // Obtener pre-registros para todos los productos
    const productIds = productos.map(p => p.id)
    
    // Pre-registros pendientes (donde este producto es el ORIGEN - currentProductId)
    const preRegistrosPendientes = await prisma.advancedPreRegistration.groupBy({
      by: ['currentProductId'],
      where: {
        currentProductId: { in: productIds },
        status: 'PENDING'
      },
      _count: { id: true }
    })
    
    // Pre-registros pagados (participantes inscritos y pagados en producto DESTINO - targetProductId)
    const preRegistrosPagados = await prisma.advancedPreRegistration.groupBy({
      by: ['targetProductId'],
      where: {
        targetProductId: { in: productIds },
        status: 'PAID'
      },
      _count: { id: true }
    })
    
    // Crear maps para acceso rápido
    const pendientesPorProducto = new Map(
      preRegistrosPendientes.map(p => [p.currentProductId, p._count.id])
    )
    const pagadosPorProducto = new Map(
      preRegistrosPagados.map(p => [p.targetProductId, p._count.id])
    )
    
    const productosConEstado = productos.map(p => {
      let estado = 'PROXIMO'
      if (p.startDate && p.endDate) {
        const start = new Date(p.startDate)
        const end = new Date(p.endDate)
        if (now >= start && now <= end) {
          estado = 'EN_CURSO'
        } else if (now > end) {
          estado = 'FINALIZADO'
        }
      } else if (p.startDate) {
        const start = new Date(p.startDate)
        if (now >= start) {
          estado = 'EN_CURSO'
        }
      }

      return {
        ...p,
        estado,
        inscritos: p.currentEnrollment || 0,
        checkedIn: p._count.CheckInRecord,
        preRegistrosPendientes: pendientesPorProducto.get(p.id) || 0,
        participantesPagados: pagadosPorProducto.get(p.id) || 0
      }
    })

    // Separar por estado
    const enCurso = productosConEstado.filter(p => p.estado === 'EN_CURSO')
    const proximos = productosConEstado.filter(p => p.estado === 'PROXIMO')
    const finalizados = productosConEstado.filter(p => p.estado === 'FINALIZADO')

    // Calcular totales de pre-registros
    const totalPreRegistrosPendientes = enCurso.reduce((acc, p) => acc + p.preRegistrosPendientes, 0)
    const totalParticipantesPagados = [...enCurso, ...proximos].reduce((acc, p) => acc + p.participantesPagados, 0)
    const totalInscritos = enCurso.reduce((acc, p) => acc + p.inscritos, 0)

    return NextResponse.json({
      success: true,
      trainer: {
        id: usuario.id,
        nombre: usuario.nombre
      },
      entrenamientos: {
        enCurso,
        proximos,
        finalizados: finalizados.slice(0, 10) // Solo últimos 10 finalizados
      },
      stats: {
        totalAsignados: productos.length,
        enCurso: enCurso.length,
        proximos: proximos.length,
        finalizados: finalizados.length,
        totalPreRegistrosPendientes,
        totalParticipantesPagados,
        totalInscritos
      }
    })

  } catch (error) {
    console.error("Error al obtener entrenamientos del trainer:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
