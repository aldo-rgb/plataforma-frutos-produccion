// API para obtener participantes que aún no han elegido cruzar
// (hicieron check-in en un entrenamiento BASIC pero no tienen pre-registro)
// FILTRADO POR VISIÓN según el rol del usuario:
// - Coordinadores: visiones donde están asignados como staff
// - Game Changers: visiones donde están asignados
// - Trainers/Mentors: visiones donde están asignados como staff
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const visionIdParam = searchParams.get("visionId")
    
    const userId = session.user.id
    const userRole = session.user.rol || ''

    logger.debug(`[participantes-pendientes] userId=${userId}, role=${userRole}`)

    // Determinar las visiones a las que tiene acceso el usuario
    let allowedVisionIds: number[] = []
    
    // Roles de admin/escuela ven todo (o filtran por param)
    const isAdmin = ['ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(userRole)
    
    if (isAdmin) {
      // Admin puede ver todo o filtrar por param
      if (visionIdParam) {
        allowedVisionIds = [parseInt(visionIdParam)]
      }
      // Si no hay param, no filtramos (ve todo)
    } else if (['COORDINATOR_BASIC'].includes(userRole)) {
      // Coordinador Básico: ve todas las visiones donde está asignado
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { userId },
        select: { visionId: true }
      })
      allowedVisionIds = [...new Set(staffAssignments.map(s => s.visionId))]
      logger.debug(`[participantes-pendientes] COORDINATOR_BASIC userId=${userId}:`, allowedVisionIds)
    } else if (['COORDINATOR_ADVANCED', 'COORDINADOR'].includes(userRole)) {
      // Coordinador Avanzado: ve visiones donde está asignado (para promover de BASIC a ADVANCED)
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { userId },
        select: { visionId: true }
      })
      allowedVisionIds = [...new Set(staffAssignments.map(s => s.visionId))]
      logger.debug(`[participantes-pendientes] COORDINATOR_ADVANCED userId=${userId}:`, allowedVisionIds)
    } else if (['TRAINER'].includes(userRole)) {
      // TRAINER: Solo ve visiones donde está asignado como BASIC_TRAINER
      // (El Atravesar es para promover de BASIC a ADVANCED, solo trainers de BASIC lo necesitan)
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { 
          userId,
          role: 'BASIC_TRAINER' // Solo si está asignado como trainer de BÁSICO
        },
        select: { visionId: true }
      })
      allowedVisionIds = [...new Set(staffAssignments.map(s => s.visionId))]
      logger.debug(`[participantes-pendientes] TRAINER (BASIC_TRAINER only) userId=${userId}:`, allowedVisionIds)
    } else if (['MENTOR'].includes(userRole)) {
      // Mentores: visiones donde están asignados
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { userId },
        select: { visionId: true }
      })
      allowedVisionIds = [...new Set(staffAssignments.map(s => s.visionId))]
    } else if (['GAMECHANGER'].includes(userRole)) {
      // Game Changers: visiones donde están asignados via VisionGameChanger
      const gcAssignments = await prisma.visionGameChanger.findMany({
        where: { gameChangerId: userId },
        select: { visionId: true }
      })
      
      allowedVisionIds = [...new Set(gcAssignments.map(s => s.visionId))]
    }
    
    // Si el usuario especificó visionId y tiene acceso, usar ese
    if (visionIdParam) {
      const requestedVisionId = parseInt(visionIdParam)
      if (isAdmin || allowedVisionIds.includes(requestedVisionId)) {
        allowedVisionIds = [requestedVisionId]
      }
    }

    // Obtener productos BASIC de las visiones permitidas
    // Solo los que tienen trainingStatus != COMPLETED (aún relevantes para el cruce)
    const now = new Date()
    
    // Primero, obtener visiones donde el Avanzado ya inició (para excluir sus BASIC)
    const visionesConAvanzadoIniciado = await prisma.vision.findMany({
      where: {
        advancedStartDate: { lte: now }
      },
      select: { id: true }
    })
    const visionIdsAvanzadoIniciado = visionesConAvanzadoIniciado.map(v => v.id)
    
    const whereProduct: any = {
      levelType: "BASIC",
      isActive: true,
      // Excluir entrenamientos completados
      trainingStatus: { not: 'COMPLETED' },
      // Excluir BASIC de visiones donde el Avanzado ya inició
      visionId: { notIn: visionIdsAvanzadoIniciado }
    }
    
    if (productId) {
      whereProduct.id = parseInt(productId)
    }
    
    // Aplicar filtro de visión (combinar con el notIn existente)
    if (allowedVisionIds.length > 0) {
      // Filtrar allowedVisionIds para excluir las que ya iniciaron Avanzado
      const filteredVisionIds = allowedVisionIds.filter(id => !visionIdsAvanzadoIniciado.includes(id))
      if (filteredVisionIds.length === 0) {
        // Todas las visiones del usuario ya iniciaron Avanzado
        return NextResponse.json({
          participantes: [],
          stats: { total: 0, sinCruzar: 0, cruzaron: 0 }
        })
      }
      whereProduct.visionId = { in: filteredVisionIds }
    } else if (!isAdmin) {
      // Si no es admin y no tiene visiones asignadas, no mostrar nada
      logger.debug(`[participantes-pendientes] No vision assignments, returning empty`)
      return NextResponse.json({
        participantes: [],
        stats: { total: 0, sinCruzar: 0, cruzaron: 0 }
      })
    }

    logger.debug(`[participantes-pendientes] Filtering products with visionIds:`, allowedVisionIds)

    // Obtener productos básicos de las visiones permitidas
    const basicProducts = await prisma.schoolProduct.findMany({
      where: whereProduct,
      select: { 
        id: true, 
        name: true,
        visionId: true,
        organizationId: true,
        Organization: {
          select: { name: true }
        }
      }
    })

    if (basicProducts.length === 0) {
      return NextResponse.json({
        participantes: [],
        stats: { total: 0, sinCruzar: 0, cruzaron: 0 }
      })
    }

    const productIds = basicProducts.map(p => p.id)

    // Obtener en paralelo: check-ins y pre-registros
    const [checkIns, preRegistros] = await Promise.all([
      // Todos los que hicieron check-in en productos básicos
      prisma.checkInRecord.findMany({
        where: { productId: { in: productIds } },
        select: {
          userId: true,
          productId: true,
          Usuario: {
            select: { 
              id: true, 
              nombre: true, 
              email: true,
              profileImage: true,
              telefono: true
            }
          }
        },
        distinct: ['userId']
      }),
      // Todos los que ya tienen pre-registro (cruzaron)
      prisma.advancedPreRegistration.findMany({
        where: { 
          currentProductId: { in: productIds },
          status: { in: ['PENDING', 'PAID'] }
        },
        select: { userId: true }
      })
    ])

    // IDs de usuarios que ya cruzaron
    const cruzaronIds = new Set(preRegistros.map(p => p.userId))

    // Participantes que NO han dado el salto (sin pre-registro)
    const participantesSinCruzar = checkIns
      .filter(c => !cruzaronIds.has(c.userId))
      .map(c => {
        const producto = basicProducts.find(p => p.id === c.productId)
        return {
          id: c.userId,
          userId: c.userId, // Para el TOP FILE
          nombre: c.Usuario.nombre || 'Participante',
          email: c.Usuario.email,
          imagen: c.Usuario.profileImage,
          telefono: c.Usuario.telefono,
          productoId: c.productId,
          productoNombre: producto?.name || 'Entrenamiento',
          organizacion: producto?.Organization?.name
        }
      })

    return NextResponse.json({
      participantes: participantesSinCruzar,
      stats: {
        total: checkIns.length,
        sinCruzar: participantesSinCruzar.length,
        cruzaron: cruzaronIds.size
      }
    })

  } catch (error) {
    logger.error("Error al obtener participantes pendientes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
