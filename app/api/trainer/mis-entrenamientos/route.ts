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

    // 1. Obtener productos donde este usuario es trainer directo (NO terminados)
    const productosDirectos = await prisma.schoolProduct.findMany({
      where: {
        trainerId: usuario.id,
        isActive: true,
        trainingStatus: { not: 'COMPLETED' }
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
            trainingStatus: { not: 'COMPLETED' }, // No mostrar terminados
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

    // Obtener inscritos por visión (vision_enrollments nivel BASIC)
    const visionIdsFromProducts = [...new Set(productos.filter(p => p.visionId).map(p => p.visionId!))]
    const inscritosPorVision = new Map<number, number>()
    const inscritosAdvancedPorVision = new Map<number, number>()
    const asistieronPorVision = new Map<number, number>()
    
    if (visionIdsFromProducts.length > 0) {
      // Inscritos en BASIC
      const enrollmentCounts = await prisma.vision_enrollments.groupBy({
        by: ['visionId'],
        where: {
          visionId: { in: visionIdsFromProducts },
          level: 'BASIC',
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        _count: { id: true }
      })
      
      enrollmentCounts.forEach(e => {
        inscritosPorVision.set(e.visionId, e._count.id)
      })

      // Asistieron en BASIC (attendanceStatus = 'ATTENDED')
      const attendedCounts = await prisma.vision_enrollments.groupBy({
        by: ['visionId'],
        where: {
          visionId: { in: visionIdsFromProducts },
          level: 'BASIC',
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
          attendanceStatus: 'ATTENDED'
        },
        _count: { id: true }
      })
      
      attendedCounts.forEach(e => {
        asistieronPorVision.set(e.visionId, e._count.id)
      })

      // Inscritos en ADVANCED (los que ya pagaron avanzado)
      const advancedEnrollmentCounts = await prisma.vision_enrollments.groupBy({
        by: ['visionId'],
        where: {
          visionId: { in: visionIdsFromProducts },
          level: 'ADVANCED',
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        },
        _count: { id: true }
      })
      
      advancedEnrollmentCounts.forEach(e => {
        inscritosAdvancedPorVision.set(e.visionId, e._count.id)
      })
    }
    
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

      // Para productos BASIC: participantesPagados = inscritos en ADVANCED de la misma visión
      // Para productos ADVANCED: usar el conteo de pre-registros pagados
      const esBASIC = p.levelType === 'BASIC'
      const pagadosAvanzado = esBASIC && p.visionId 
        ? (inscritosAdvancedPorVision.get(p.visionId) || 0)
        : (pagadosPorProducto.get(p.id) || 0)
      
      // Asistieron = vision_enrollments con attendanceStatus = 'ATTENDED'
      const asistieron = esBASIC && p.visionId
        ? (asistieronPorVision.get(p.visionId) || 0)
        : p._count.CheckInRecord

      return {
        ...p,
        estado,
        inscritos: p.visionId ? (inscritosPorVision.get(p.visionId) || 0) : (p.currentEnrollment || 0),
        checkedIn: asistieron,
        preRegistrosPendientes: pendientesPorProducto.get(p.id) || 0,
        participantesPagados: pagadosAvanzado
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

    // Obtener visionIds de los productos del trainer (solo los que realmente tiene asignados)
    const productVisionIds = new Set<number>()
    productos.forEach(p => {
      if (p.visionId) productVisionIds.add(p.visionId)
    })
    const allVisionIds = Array.from(productVisionIds)
    
    // Determinar qué niveles tiene asignados el trainer
    const trainerLevels = new Set(visionStaffAssignments.map(v => v.level))
    const isBasicTrainer = trainerLevels.has('BASIC')
    const isAdvancedTrainer = trainerLevels.has('ADVANCED')
    const isPLTrainer = trainerLevels.has('PL')
    
    // Filtrar productos por nivel del trainer
    const basicProducts = productos.filter(p => p.levelType === 'BASIC')
    const advancedProducts = productos.filter(p => p.levelType === 'ADVANCED')
    const plProducts = productos.filter(p => p.levelType === 'PL')

    // Total inscritos en la visión - solo si es trainer del nivel correspondiente
    let totalInscritosVision = 0
    if (allVisionIds.length > 0) {
      // Si es trainer de BÁSICO, mostrar inscritos en BÁSICO
      // Si es trainer de AVANZADO, mostrar inscritos en AVANZADO
      const levelToCount = isBasicTrainer ? 'BASIC' : (isAdvancedTrainer ? 'ADVANCED' : 'PL')
      totalInscritosVision = await prisma.vision_enrollments.count({
        where: {
          visionId: { in: allVisionIds },
          level: levelToCount,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
        }
      })
    }

    // Total confirmados - depende del nivel del trainer
    // Si es trainer BÁSICO: confirmados = pre-registros PAGADOS a AVANZADO (de sus productos BASIC)
    // Si es trainer AVANZADO: confirmados = inscritos ADVANCED en sus visiones
    // Si es trainer PL: confirmados = inscritos PL en sus visiones
    let totalConfirmadosAvanzado = 0
    if (allVisionIds.length > 0) {
      if (isBasicTrainer) {
        // Trainer de BÁSICO ve cuántos ya pagaron avanzado (desde sus productos BASIC)
        const basicProductIds = basicProducts.map(p => p.id)
        if (basicProductIds.length > 0) {
          totalConfirmadosAvanzado = await prisma.advancedPreRegistration.count({
            where: {
              currentProductId: { in: basicProductIds },
              status: 'PAID'
            }
          })
        }
      } else if (isAdvancedTrainer) {
        // Trainer de AVANZADO ve inscritos en ADVANCED
        totalConfirmadosAvanzado = await prisma.vision_enrollments.count({
          where: {
            visionId: { in: allVisionIds },
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        })
      } else if (isPLTrainer) {
        // Trainer de PL ve inscritos en PL
        totalConfirmadosAvanzado = await prisma.vision_enrollments.count({
          where: {
            visionId: { in: allVisionIds },
            level: 'PL',
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        })
      }
    }

    // Total pre-registros (declarados) - depende del nivel del trainer
    // Si es trainer BÁSICO: declarados = pre-registros PENDING a AVANZADO (de sus productos BASIC)
    // Si es trainer AVANZADO: declarados = pre-registros PENDING a PL (desde sus productos ADVANCED)
    let totalDeclarados = 0
    if (isBasicTrainer) {
      const basicProductIds = basicProducts.map(p => p.id)
      if (basicProductIds.length > 0) {
        totalDeclarados = await prisma.advancedPreRegistration.count({
          where: {
            currentProductId: { in: basicProductIds },
            status: 'PENDING'
          }
        })
      }
    } else if (isAdvancedTrainer) {
      // Para trainers de avanzado, mostrar pre-registros de ADVANCED a PL
      const advancedProductIds = advancedProducts.map(p => p.id)
      if (advancedProductIds.length > 0) {
        totalDeclarados = await prisma.advancedPreRegistration.count({
          where: {
            currentProductId: { in: advancedProductIds },
            status: 'PENDING'
          }
        })
      }
    }

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
        totalInscritos,
        // Nuevos stats para widgets
        totalInscritosVision,      // Inscritos en el nivel correspondiente
        totalDeclarados,           // Pre-registros PENDING
        totalConfirmadosAvanzado,  // Ya confirmados
        // Info del nivel del trainer para mostrar etiquetas correctas
        trainerLevel: isBasicTrainer ? 'BASIC' : (isAdvancedTrainer ? 'ADVANCED' : (isPLTrainer ? 'PL' : null)),
        isBasicTrainer,
        isAdvancedTrainer,
        isPLTrainer
      }
    })

  } catch (error) {
    console.error("Error al obtener entrenamientos del trainer:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
