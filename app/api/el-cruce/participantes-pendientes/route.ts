// API para obtener participantes que aún no han elegido cruzar
// (hicieron check-in en un entrenamiento BASIC pero no tienen pre-registro)
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const organizationId = searchParams.get("organizationId")

    // Obtener productos BASIC en curso (ya iniciados, no terminados, y NO completados)
    const now = new Date()
    
    const whereProduct: any = {
      levelType: "BASIC",
      isActive: true,
      startDate: { lte: now },
      // Excluir entrenamientos que ya terminaron (COMPLETED)
      trainingStatus: { not: 'COMPLETED' }
    }
    
    if (productId) {
      whereProduct.id = parseInt(productId)
    }
    
    if (organizationId) {
      whereProduct.organizationId = parseInt(organizationId)
    }

    // Obtener productos básicos en curso
    const basicProducts = await prisma.schoolProduct.findMany({
      where: whereProduct,
      select: { 
        id: true, 
        name: true,
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

    // Participantes que NO han cruzado (sin pre-registro)
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
    console.error("Error al obtener participantes pendientes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
