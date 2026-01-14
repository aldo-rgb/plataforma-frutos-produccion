// API para gestionar sesiones de "El Cruce"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

// Forzar modo dinámico para tiempo real
export const dynamic = 'force-dynamic'
export const revalidate = 0

const prisma = new PrismaClient()

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
    const organizationId = searchParams.get("organizationId")
    const active = searchParams.get("active")

    if (sessionId) {
      // Obtener sesión específica
      const crossingSession = await prisma.crossingSession.findUnique({
        where: { id: sessionId },
        include: {
          product: {
            select: { 
              id: true, 
              name: true, 
              levelType: true, 
              startDate: true, 
              endDate: true,
              organizationId: true,
              Organization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          },
          creator: {
            select: { id: true, nombre: true }
          }
        }
      })

      if (!crossingSession) {
        return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
      }

      // Obtener participantes en paralelo para mayor velocidad
      const [checkedInUsers, preRegistered] = await Promise.all([
        prisma.checkInRecord.findMany({
          where: { productId: crossingSession.productId },
          select: {
            userId: true,
            Usuario: {
              select: { 
                id: true, 
                nombre: true, 
                profileImage: true 
              }
            }
          },
          distinct: ['userId']
        }),
        prisma.advancedPreRegistration.findMany({
          where: { 
            currentProductId: crossingSession.productId,
            status: { in: ['PENDING', 'PAID'] }
          },
          select: {
            userId: true,
            status: true,
            user: {
              select: { 
                id: true, 
                nombre: true, 
                profileImage: true 
              }
            }
          }
        })
      ])

      const crossedUserIds = new Set(preRegistered.map(p => p.userId))

      // Formatear participantes
      const crossedParticipants = preRegistered.map(p => ({
        id: p.userId,
        name: p.user.nombre || 'Participante',
        image: p.user.profileImage,
        status: p.status
      }))

      const waitingParticipants = checkedInUsers
        .filter(u => !crossedUserIds.has(u.userId))
        .map(u => ({
          id: u.userId,
          name: u.Usuario.nombre || 'Participante',
          image: u.Usuario.profileImage
        }))

      // Obtener estadísticas de la Master Organización (optimizado con cache simple)
      // Estas estadísticas cambian muy poco, podemos hacer queries más ligeras
      let masterOrgStats = null
      const orgId = crossingSession.product.organizationId
      
      if (orgId) {
        try {
          // Query única para obtener org y master org info
          const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { 
              masterOrganizationId: true,
              MasterOrganization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          })

          if (org?.masterOrganizationId) {
            // Obtener todas las organizaciones y productos en UN solo query con conteo
            const allOrgIds = (await prisma.organization.findMany({
              where: { masterOrganizationId: org.masterOrganizationId },
              select: { id: true }
            })).map(o => o.id)

            // Obtener TODOS los productos de todas las orgs de una vez
            const allProducts = await prisma.schoolProduct.findMany({
              where: { organizationId: { in: allOrgIds } },
              select: { id: true, levelType: true }
            })

            // Agrupar por nivel (operación en memoria, muy rápida)
            const basicProductIds = allProducts.filter(p => p.levelType === 'BASIC').map(p => p.id)
            const advancedProductIds = allProducts.filter(p => p.levelType === 'ADVANCED').map(p => p.id)
            const plProductIds = allProducts.filter(p => p.levelType === 'PL').map(p => p.id)

            // Contar graduados EN PARALELO (solo si hay productos)
            const [basicGraduates, advancedGraduates, plGraduates] = await Promise.all([
              basicProductIds.length > 0 ? prisma.checkInRecord.groupBy({
                by: ['userId'],
                where: { productId: { in: basicProductIds } }
              }) : [],
              advancedProductIds.length > 0 ? prisma.checkInRecord.groupBy({
                by: ['userId'],
                where: { productId: { in: advancedProductIds } }
              }) : [],
              plProductIds.length > 0 ? prisma.checkInRecord.groupBy({
                by: ['userId'],
                where: { productId: { in: plProductIds } }
              }) : []
            ])

            masterOrgStats = {
              masterOrg: org.MasterOrganization,
              totalBasicGraduates: basicGraduates.length,
              totalAdvancedGraduates: advancedGraduates.length,
              totalPLGraduates: plGraduates.length
            }
          }
        } catch (err) {
          console.error("Error getting master org stats:", err)
          // No bloquear la respuesta si falla
        }
      }

      const response = NextResponse.json({ 
        session: crossingSession,
        participants: {
          crossed: crossedParticipants,
          waiting: waitingParticipants
        },
        masterOrgStats
      })
      
      // Deshabilitar cache para tiempo real
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      
      return response
    }

    // Buscar sesiones activas (para el widget)
    if (active === "true") {
      const where: any = {
        status: { in: ["WAITING", "ACTIVE", "PAUSED"] }
      }

      // Filtrar por organización si se especifica
      if (organizationId) {
        where.product = {
          organizationId: parseInt(organizationId)
        }
      }

      const activeSessions = await prisma.crossingSession.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, levelType: true, organizationId: true }
          },
          creator: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })

      return NextResponse.json({ sessions: activeSessions })
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

    return NextResponse.json({ error: "Se requiere sessionId, productId, o active=true" }, { status: 400 })

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
          select: { CheckInRecord: true }
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

    console.log("Datos para crear sesión:", {
      productId,
      targetLevel,
      targetProductId,
      totalParticipants,
      createdBy: session.user.id,
      userIdType: typeof session.user.id
    })

    // Crear nueva sesión
    const newSession = await prisma.crossingSession.create({
      data: {
        productId: Number(productId),
        targetLevel: targetLevel as "ADVANCED" | "PL",
        targetProductId: targetProductId ? Number(targetProductId) : null,
        status: "WAITING",
        totalParticipants: Number(totalParticipants),
        crossedCount: 0,
        soundEnabled: true,
        visualTheme: visualTheme || "quantum_fire",
        createdBy: Number(session.user.id)
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

  } catch (error: any) {
    console.error("Error al crear sesión:", error)
    console.error("Error details:", error?.message, error?.code)
    return NextResponse.json({ error: "Error interno", details: error?.message }, { status: 500 })
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
