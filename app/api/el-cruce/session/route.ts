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

      // Obtener el producto de PL de la misma organización (para Tu Vida)
      const plProduct = await prisma.schoolProduct.findFirst({
        where: {
          organizationId: crossingSession.product.organizationId,
          levelType: 'PL'
        },
        select: { id: true }
      })

      // Obtener participantes en paralelo para mayor velocidad
      const [checkedInUsers, preRegistered, plTicketHolders] = await Promise.all([
        // Usuarios que hicieron check-in en el producto actual (Avanzado)
        prisma.checkInRecord.findMany({
          where: { productId: crossingSession.productId },
          select: {
            userId: true,
            Usuario: {
              select: { 
                id: true, 
                nombre: true, 
                profileImage: true,
                goals: true,
                CartaFrutos: {
                  take: 1,
                  orderBy: { fechaCreacion: 'desc' },
                  select: {
                    id: true,
                    estado: true,
                    // Todas las declaraciones del wizard
                    finanzasDeclaracion: true,
                    relacionesDeclaracion: true,
                    talentosDeclaracion: true,
                    saludDeclaracion: true,
                    pazMentalDeclaracion: true,
                    ocioDeclaracion: true,
                    servicioTransDeclaracion: true,
                    servicioComunDeclaracion: true,
                    // Todas las metas
                    Meta: {
                      orderBy: { orden: 'asc' },
                      select: { metaPrincipal: true, categoria: true }
                    }
                  }
                }
              }
            }
          },
          distinct: ['userId']
        }),
        // Pre-registros de avanzado (los que están en proceso de cruzar)
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
                profileImage: true,
                goals: true,
                CartaFrutos: {
                  take: 1,
                  orderBy: { fechaCreacion: 'desc' },
                  select: {
                    id: true,
                    estado: true,
                    finanzasDeclaracion: true,
                    relacionesDeclaracion: true,
                    talentosDeclaracion: true,
                    saludDeclaracion: true,
                    pazMentalDeclaracion: true,
                    ocioDeclaracion: true,
                    servicioTransDeclaracion: true,
                    servicioComunDeclaracion: true,
                    Meta: {
                      orderBy: { orden: 'asc' },
                      select: { metaPrincipal: true, categoria: true }
                    }
                  }
                }
              }
            }
          }
        }),
        // Usuarios que ya tienen ticket de PL pagado (Tu Vida)
        plProduct ? prisma.ticket.findMany({
          where: {
            productId: plProduct.id,
            status: { in: ['PAID', 'ACTIVE', 'USED'] },
            levelType: 'PL'
          },
          select: {
            userId: true,
            user: {
              select: { 
                id: true, 
                nombre: true, 
                profileImage: true,
                goals: true,
                CartaFrutos: {
                  take: 1,
                  orderBy: { fechaCreacion: 'desc' },
                  select: {
                    id: true,
                    estado: true,
                    finanzasDeclaracion: true,
                    relacionesDeclaracion: true,
                    talentosDeclaracion: true,
                    saludDeclaracion: true,
                    pazMentalDeclaracion: true,
                    ocioDeclaracion: true,
                    servicioTransDeclaracion: true,
                    servicioComunDeclaracion: true,
                    Meta: {
                      orderBy: { orden: 'asc' },
                      select: { metaPrincipal: true, categoria: true }
                    }
                  }
                }
              }
            }
          }
        }) : []
      ])

      // IDs de usuarios que ya cruzaron (pre-registros + tickets de PL)
      const preRegisteredUserIds = new Set(preRegistered.map(p => p.userId))
      const plTicketUserIds = new Set(plTicketHolders.map(p => p.userId))
      const crossedUserIds = new Set([...preRegisteredUserIds, ...plTicketUserIds])

      // ═══════════════════════════════════════════════════════════════
      // EXTRAER PALABRAS CLAVE DE LAS METAS DEL WIZARD
      // ═══════════════════════════════════════════════════════════════
      
      // Palabras comunes que NO son importantes (stop words en español)
      const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
        'y', 'o', 'que', 'en', 'con', 'por', 'para', 'es', 'son', 'ser', 'estar',
        'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'yo', 'soy', 'me', 'te', 'se',
        'a', 'e', 'i', 'u', 'como', 'más', 'muy', 'si', 'no', 'lo', 'le', 'les',
        'ya', 'cada', 'todo', 'toda', 'todos', 'todas', 'este', 'esta', 'esto',
        'donde', 'cuando', 'porque', 'quien', 'cual', 'qué', 'hay', 'ha', 'he',
        'tener', 'tengo', 'tiene', 'quiero', 'voy', 'hacer', 'hago', 'hace',
        'día', 'vida', 'gran', 'grande', 'nuevo', 'nueva', 'mejor', 'bien',
        'momento', 'forma', 'manera', 'nivel', 'manera', 'vez', 'través', 'año', 'años'
      ])

      // Palabras importantes relacionadas con metas (priorizarlas)
      const importantPatterns = [
        // Dinero y finanzas
        /\$[\d,]+|\d+[\s,]*(?:mil(?:lones?)?|mdp|mxn|usd|dólares?|pesos)/gi,
        /\b(dinero|millonario|abundancia|riqueza|fortuna|patrimonio|ingresos?|ganancias?|inversión|inversiones|ahorro|ahorros)\b/gi,
        // Posesiones
        /\b(casa|departamento|depa|terreno|rancho|propiedad|propiedades|carro|auto|coche|camioneta|tesla|mercedes|bmw|porsche|ferrari)\b/gi,
        // Viajes y experiencias
        /\b(viaje|viajes|viajar|europa|asia|japón|disney|crucero|playa|vacaciones|aventura)\b/gi,
        // Salud y bienestar
        /\b(salud|fitness|gym|gimnasio|peso|kilos|músculo|maratón|correr|ejercicio|energía)\b/gi,
        // Familia y relaciones
        /\b(familia|hijos?|esposa?|pareja|matrimonio|boda|amor|relación|papá|mamá|padres)\b/gi,
        // Negocios y carrera
        /\b(negocio|negocios|empresa|emprendimiento|startup|jefe|director|gerente|líder|equipo|cliente|clientes|ventas)\b/gi,
        // Educación
        /\b(universidad|maestría|doctorado|certificación|curso|título|graduación|estudiar|carrera)\b/gi,
        // Metas específicas
        /\b(libertad|independencia|éxito|logro|meta|sueño|objetivo|propósito|misión|visión|impacto)\b/gi
      ]

      // Función para extraer palabras clave de texto
      const extractKeywords = (text: string): string[] => {
        if (!text || typeof text !== 'string') return []
        
        const keywords: string[] = []
        
        // Primero buscar patrones importantes (cantidades de dinero, posesiones específicas)
        importantPatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            matches.forEach(match => {
              const clean = match.trim().toLowerCase()
              if (clean.length > 2 && !keywords.includes(clean)) {
                keywords.push(clean)
              }
            })
          }
        })
        
        // Luego extraer otras palabras significativas (sustantivos largos)
        const words = text
          .toLowerCase()
          .replace(/[^\wáéíóúñü\s]/g, ' ')
          .split(/\s+/)
          .filter(word => 
            word.length >= 4 && 
            !stopWords.has(word) &&
            !keywords.includes(word)
          )
        
        // Agregar palabras únicas que no están ya en keywords
        words.forEach(word => {
          if (!keywords.includes(word) && keywords.length < 20) {
            keywords.push(word)
          }
        })
        
        return keywords
      }

      // Función para obtener datos completos del wizard
      const getWizardKeywords = (user: any): { hasWizard: boolean; keywords: string[] } => {
        const carta = user?.CartaFrutos?.[0]
        
        // Si no tiene carta o está en borrador, no tiene wizard completo
        if (!carta || carta.estado === 'BORRADOR') {
          return { hasWizard: false, keywords: [] }
        }
        
        const allKeywords: string[] = []
        
        // Extraer de todas las declaraciones del wizard
        const declaraciones = [
          carta.finanzasDeclaracion,
          carta.relacionesDeclaracion,
          carta.talentosDeclaracion,
          carta.saludDeclaracion,
          carta.pazMentalDeclaracion,
          carta.ocioDeclaracion,
          carta.servicioTransDeclaracion,
          carta.servicioComunDeclaracion
        ]
        
        declaraciones.forEach(dec => {
          if (dec) {
            const kw = extractKeywords(dec)
            kw.forEach(k => {
              if (!allKeywords.includes(k)) allKeywords.push(k)
            })
          }
        })
        
        // Extraer de todas las metas
        if (carta.Meta && Array.isArray(carta.Meta)) {
          carta.Meta.forEach((meta: any) => {
            if (meta.metaPrincipal) {
              const kw = extractKeywords(meta.metaPrincipal)
              kw.forEach(k => {
                if (!allKeywords.includes(k)) allKeywords.push(k)
              })
            }
          })
        }
        
        // Si tiene al menos 3 keywords, consideramos que tiene wizard válido
        const hasWizard = allKeywords.length >= 3
        
        return { hasWizard, keywords: allKeywords.slice(0, 15) } // Máximo 15 palabras
      }

      // Helper para obtener salto cuántico (meta principal)
      const getSaltoQuantico = (user: any) => {
        // Prioridad: Meta de la Carta > goals del usuario > default
        const cartaMeta = user?.CartaFrutos?.[0]?.Meta?.[0]?.metaPrincipal
        return cartaMeta || user?.goals || 'Mi gran sueño'
      }

      // Formatear participantes cruzados (pre-registros + tickets de PL)
      const crossedFromPreReg = preRegistered.map(p => {
        const wizardData = getWizardKeywords(p.user)
        return {
          id: p.userId,
          name: p.user.nombre || 'Participante',
          image: p.user.profileImage,
          saltoQuantico: getSaltoQuantico(p.user),
          hasWizard: wizardData.hasWizard,
          keywords: wizardData.keywords,
          status: p.status,
          source: 'preregistration'
        }
      })
      
      // Agregar usuarios con ticket de PL que no están en pre-registros
      const crossedFromTickets = plTicketHolders
        .filter(t => !preRegisteredUserIds.has(t.userId))
        .map(t => {
          const wizardData = getWizardKeywords(t.user)
          return {
            id: t.userId,
            name: t.user.nombre || 'Participante',
            image: t.user.profileImage,
            saltoQuantico: getSaltoQuantico(t.user),
            hasWizard: wizardData.hasWizard,
            keywords: wizardData.keywords,
            status: 'PAID',
            source: 'pl_ticket'
          }
        })
      
      const crossedParticipants = [...crossedFromPreReg, ...crossedFromTickets]

      const waitingParticipants = checkedInUsers
        .filter(u => !crossedUserIds.has(u.userId))
        .map(u => {
          const wizardData = getWizardKeywords(u.Usuario)
          return {
            id: u.userId,
            name: u.Usuario.nombre || 'Participante',
            image: u.Usuario.profileImage,
            saltoQuantico: getSaltoQuantico(u.Usuario),
            hasWizard: wizardData.hasWizard,
            keywords: wizardData.keywords
          }
        })

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
        status: { in: ["WAITING", "ACTIVE", "PAUSED"] },
        // Solo mostrar sesiones de productos que están EN CURSO
        product: {
          trainingStatus: 'IN_PROGRESS'
        }
      }

      // Filtrar por organización si se especifica
      if (organizationId) {
        where.product = {
          ...where.product,
          organizationId: parseInt(organizationId)
        }
      }

      const activeSessions = await prisma.crossingSession.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, levelType: true, organizationId: true, trainingStatus: true }
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

    // Verificar que el entrenamiento está EN CURSO
    if (product.trainingStatus !== 'IN_PROGRESS') {
      return NextResponse.json({ 
        error: "Solo puedes crear sesiones de El Atravesar para entrenamientos en curso",
        currentStatus: product.trainingStatus
      }, { status: 400 })
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
