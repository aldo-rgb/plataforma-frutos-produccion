import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

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

    if (!user || (user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR')) {
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
        PerfilMentor: {
          select: {
            id: true,
            disponible: true,
            acceptingNewClients: true,
            maxDisciplineClients: true,
            calificacionPromedio: true
          }
        }
      }
    });

    // Para cada mentor, obtener sus paquetes y alumnos
    const mentoresConPaquetes = await Promise.all(
      mentores.map(async (mentor) => {
        // Obtener visiones donde este mentor está asignado
        const visionMentors = await prisma.visionMentor.findMany({
          where: {
            mentorId: mentor.id
          },
          include: {
            Vision: {
              include: {
                Organization: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                MentorPackageOrder: {
                  where: {
                    status: 'COMPLETED'
                  }
                }
              }
            }
          }
        });

        // Obtener alumnos activos de disciplina
        const activeStudents = await prisma.programEnrollment.count({
          where: {
            mentorId: mentor.id,
            status: 'ACTIVE'
          }
        });

        // Calcular llamadas completadas y pendientes
        const [completedCalls, totalScheduled] = await Promise.all([
          prisma.callBooking.count({
            where: {
              mentorId: mentor.id,
              callType: 'DISCIPLINE',
              status: 'COMPLETED'
            }
          }),
          prisma.callBooking.count({
            where: {
              mentorId: mentor.id,
              callType: 'DISCIPLINE',
              status: {
                in: ['SCHEDULED', 'COMPLETED']
              }
            }
          })
        ]);

        // Agrupar por organizaciones/visiones
        const packages = visionMentors.map(vm => {
          const order = vm.Vision.MentorPackageOrder[0]; // Primera orden completada
          
          return {
            client: vm.Vision.Organization?.name || 'Sin organización',
            package: `Paquete Disciplina (Visión)`,
            visionId: vm.Vision.id,
            visionName: vm.Vision.nombre,
            progress: {
              used: completedCalls,
              total: totalScheduled
            },
            purchaseDate: vm.createdAt,
            totalValue: order?.precioTotal || 0,
            status: vm.Vision.isActive ? 'ACTIVE' : 'INACTIVE'
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

        // Calcular tasa de retención (alumnos activos vs total histórico)
        const totalHistoricStudents = await prisma.programEnrollment.count({
          where: {
            mentorId: mentor.id
          }
        });

        const retentionRate = totalHistoricStudents > 0 
          ? (activeStudents / totalHistoricStudents) * 100 
          : 100;

        return {
          mentor: {
            id: mentor.id,
            name: mentor.nombre,
            email: mentor.email,
            avatar: mentor.imagen,
            available: mentor.PerfilMentor[0]?.disponible || false,
            acceptingClients: mentor.PerfilMentor[0]?.acceptingNewClients || false,
            rating: mentor.PerfilMentor[0]?.calificacionPromedio || 0
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
    console.error('Error fetching mentor packages:', error);
    return NextResponse.json(
      { error: 'Error al obtener paquetes de mentores' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
