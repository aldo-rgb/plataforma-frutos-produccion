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

    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Obtener parámetros de filtrado
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // DISCIPLINE o MENTORSHIP
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (mentorId) {
      where.mentorId = parseInt(mentorId);
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Obtener bookings con información relacionada
    const [bookings, totalCount] = await Promise.all([
      prisma.callBooking.findMany({
        where,
        include: {
          Usuario_CallBooking_mentorIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              profileImage: true
            }
          },
          Usuario_CallBooking_studentIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              organizationId: true
            }
          }
        },
        orderBy: {
          scheduledAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.callBooking.count({ where })
    ]);

    // Calcular valor total de las llamadas mostradas
    const totalValue = bookings.reduce((sum, booking) => {
      if (booking.status === 'COMPLETED') {
        return sum + 90; // $90 por llamada completada
      }
      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      bookings: await Promise.all(bookings.map(async (booking) => {
        const mentor = booking.Usuario_CallBooking_mentorIdToUsuario;
        const student = booking.Usuario_CallBooking_studentIdToUsuario;
        
        // Obtener organización si existe
        let organizationName = 'Sin organización';
        if (student.organizationId) {
          const org = await prisma.organization.findUnique({
            where: { id: student.organizationId },
            select: { name: true }
          });
          if (org) organizationName = org.name;
        }
        
        return {
          id: booking.id,
          date: booking.scheduledAt,
          type: booking.type,
          mentor: {
            id: mentor.id,
            name: mentor.nombre,
            avatar: mentor.profileImage || mentor.imagen
          },
          student: {
            id: student.id,
            name: student.nombre,
            organization: organizationName
          },
          status: booking.status,
          value: (booking.status === 'COMPLETED') ? 90 : 0,
          notes: booking.notes
        };
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary: {
        totalValue,
        totalBookings: totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Error al obtener reservas' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
