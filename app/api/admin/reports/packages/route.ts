import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Obtener todos los mentores con sus perfiles
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        profileImage: true,
        PerfilMentor: true
      }
    });

    // Para cada mentor, obtener sus paquetes y alumnos
    const mentoresConPaquetes = await Promise.all(
      mentores.map(async (mentor) => {
        // Obtener órdenes de paquetes completadas para este mentor
        const orders = await prisma.mentorPackageOrder.findMany({
          where: {
            mentorId: mentor.id,
            status: 'COMPLETED'
          },
          include: {
            Vision: {
              include: {
                Organization: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            Usuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          },
          orderBy: {
            paidAt: 'desc'
          }
        });

        // Obtener alumnos asignados directamente a este mentor
        const alumnosDirectos = await prisma.usuario.count({
          where: {
            assignedMentorId: mentor.id
          }
        });

        // Obtener llamadas completadas para este mentor  
        const completedCalls = await prisma.callBooking.count({
          where: {
            mentorId: mentor.id,
            status: 'COMPLETED'
          }
        });

        // Crear lista de paquetes con información detallada
        const packages = orders.map(order => {
          return {
            orderId: order.id,
            client: order.Vision?.Organization?.name || 'Cliente Individual',
            participant: order.Usuario.nombre,
            participantEmail: order.Usuario.email,
            package: `Paquete ${order.cantidad} Sesiones`,
            visionId: order.visionId,
            visionName: order.Vision?.nombre || 'Sin visión',
            progress: {
              used: 0, // Se calculará desde CallBooking si es necesario
              total: order.cantidad
            },
            purchaseDate: order.paidAt || order.createdAt,
            totalValue: order.precioTotal,
            currency: order.currency,
            status: order.status
          };
        });

        // Calcular ventas totales del mes
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const monthlyRevenue = await prisma.mentorPackageOrder.aggregate({
          where: {
            status: 'COMPLETED',
            paidAt: {
              gte: thisMonth
            },
            mentorId: mentor.id
          },
          _sum: {
            precioTotal: true
          }
        });

        // Calcular alumnos activos (órdenes completadas con sesiones pendientes + alumnos directos)
        const activeStudentsFromOrders = await prisma.mentorPackageOrder.count({
          where: {
            mentorId: mentor.id,
            status: 'COMPLETED',
            CallBooking: {
              some: {
                status: 'PENDING'
              }
            }
          }
        });

        const activeStudents = alumnosDirectos + activeStudentsFromOrders;

        // Calcular tasa de retención (alumnos activos vs total histórico)
        const totalHistoricStudents = orders.length + alumnosDirectos;
        const retentionRate = totalHistoricStudents > 0 
          ? (activeStudents / totalHistoricStudents) * 100 
          : 100;

        return {
          mentor: {
            id: mentor.id,
            name: mentor.nombre,
            email: mentor.email,
            avatar: mentor.profileImage || mentor.imagen,
            available: mentor.PerfilMentor?.disponible || false,
            acceptingClients: mentor.PerfilMentor?.acceptingNewClients || false,
            rating: mentor.PerfilMentor?.calificacionPromedio || 0
          },
          summary: {
            activeStudents,
            monthlySales: monthlyRevenue._sum.precioTotal || 0,
            retentionRate: parseFloat(retentionRate.toFixed(1)),
            totalPackages: packages.length
          },
          packages
        };
      })
    );

    // Ordenar por ventas mensuales (mayor a menor)
    mentoresConPaquetes.sort((a, b) => b.summary.monthlySales - a.summary.monthlySales);

    return NextResponse.json({
      success: true,
      mentors: mentoresConPaquetes,
      totalMentors: mentoresConPaquetes.length
    });

  } catch (error) {
    logger.error('Error fetching mentor packages:', error);
    return NextResponse.json(
      { error: 'Error al obtener paquetes de mentores' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
