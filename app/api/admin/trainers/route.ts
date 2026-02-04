// API para obtener todos los Trainers del sistema (sin filtrar por organización)
// Los trainers son globales y pueden ser contratados por cualquier organización
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Roles que pueden ver la lista de trainers para asignarlos
    const allowedRoles = [
      'SCHOOL_ADMIN', 
      'DIRECTOR', 
      'ADMINISTRADOR',
      'COORDINATOR_BASIC',
      'COORDINATOR_ADVANCED',
      'COORDINADOR'
    ]
    if (!allowedRoles.includes(session.user.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener TODOS los trainers activos del sistema (sin filtrar por organización)
    // Un trainer puede tener rol: 'TRAINER' O el flag esEntrenador = true
    const trainers = await prisma.usuario.findMany({
      where: {
        isActive: true,
        OR: [
          { rol: 'TRAINER' },
          { esEntrenador: true }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        isActive: true,
        // Estadísticas de entrenamientos asignados
        ProductTrainer: {
          select: {
            id: true,
            name: true,
            levelType: true,
            startDate: true,
            endDate: true,
            Organization: {
              select: { id: true, name: true }
            }
          },
          where: {
            isActive: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    })

    // Formatear respuesta con estadísticas
    const trainersConStats = trainers.map(trainer => {
      const now = new Date()
      const entrenamientosActivos = trainer.ProductTrainer.filter(p => {
        if (!p.startDate || !p.endDate) return false
        return new Date(p.startDate) <= now && new Date(p.endDate) >= now
      })

      return {
        id: trainer.id,
        nombre: trainer.nombre,
        email: trainer.email,
        imagen: trainer.imagen,
        rol: 'TRAINER',
        isActive: trainer.isActive,
        stats: {
          totalAsignados: trainer.ProductTrainer.length,
          enCurso: entrenamientosActivos.length,
          organizaciones: [...new Set(trainer.ProductTrainer.map(p => p.Organization?.name).filter(Boolean))]
        }
      }
    })

    return NextResponse.json({
      success: true,
      trainers: trainersConStats,
      total: trainers.length
    })

  } catch (error) {
    console.error("Error al obtener trainers:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
