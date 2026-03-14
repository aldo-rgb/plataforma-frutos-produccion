import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Mapear VisionLevel a ProductLevelType
const levelToProductLevel: Record<string, string> = {
  'BASIC': 'BASIC',
  'ADVANCED': 'ADVANCED', 
  'PL': 'PL',
};

// Mapear nivel de ticket a nivel de enrollment
const ticketLevelToEnrollmentLevel: Record<string, string> = {
  'BASIC': 'BASIC',
  'ADVANCED': 'ADVANCED',
  'PL': 'PL',
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Buscar usuario con más datos
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        nombre: true, 
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener los enrollments del usuario con asistencia confirmada
    // para excluir esos tickets (ya fueron "usados")
    const attendedEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: user.id,
        attendanceStatus: 'ATTENDED',
      },
      select: {
        visionId: true,
        level: true,
      },
    });

    // Crear un Set de "visionId-level" para búsqueda rápida
    const attendedSet = new Set(
      attendedEnrollments.map(e => `${e.visionId}-${e.level}`)
    );

    // Obtener tickets relevantes del usuario
    // Excluimos tickets con paymentStatus UNPAID o PENDING que tengan más de 7 días
    // y tickets con status CANCELLED, EXPIRED, o TRANSFERRED
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: user.id,
        // Excluir tickets cancelados, expirados o transferidos
        status: {
          notIn: ['CANCELLED', 'EXPIRED', 'TRANSFERRED'],
        },
        // Mostrar solo tickets pagados, parciales, regalados, O pendientes recientes
        OR: [
          { paymentStatus: { in: ['PAID', 'PARTIAL', 'GIFT'] } },
          // Tickets pendientes solo si son recientes (últimos 7 días)
          {
            paymentStatus: { in: ['PENDING', 'UNPAID'] },
            createdAt: { gte: sevenDaysAgo },
          },
        ],
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend3EndDate: true,
          },
        },
        Organization: {
          select: {
            name: true,
            logoUrl: true,
            transfersEnabled: true,
          },
        },
      },
      orderBy: [
        { level: 'desc' }, // PL primero, luego ADVANCED, luego BASIC
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Filtrar tickets que ya fueron usados (usuario tiene asistencia en esa visión+nivel)
    // o cuya visión ya terminó
    const now = new Date();
    const filteredTickets = tickets.filter(ticket => {
      const enrollmentLevel = ticketLevelToEnrollmentLevel[ticket.level] || ticket.level;
      const key = `${ticket.visionId}-${enrollmentLevel}`;
      
      // Si el usuario ya asistió a este nivel en esta visión, excluir el ticket
      if (attendedSet.has(key)) {
        return false;
      }
      
      // Verificar si la visión ya terminó según el nivel del ticket
      let endDate: Date | null = null;
      if (ticket.level === 'BASIC') {
        endDate = ticket.Vision.endDate;
      } else if (ticket.level === 'ADVANCED') {
        endDate = ticket.Vision.advancedEndDate;
      } else if (ticket.level === 'PL') {
        endDate = ticket.Vision.plWeekend3EndDate;
      }
      
      // Si la fecha de fin ya pasó, el ticket está expirado
      if (endDate && new Date(endDate) < now) {
        return false;
      }
      
      return true;
    });

    // Para cada ticket, buscar el producto correspondiente para obtener la imagen
    const ticketsWithProducts = await Promise.all(
      filteredTickets.map(async (ticket) => {
        // Buscar el producto que corresponde a este ticket
        const product = await prisma.schoolProduct.findFirst({
          where: {
            visionId: ticket.visionId,
            levelType: levelToProductLevel[ticket.level] as any,
            organizationId: ticket.organizationId,
          },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
            location: true,
            type: true,
          },
        });

        return {
          id: ticket.id,
          type: ticket.type,
          level: ticket.level,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          costAtPurchase: ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0,
          amountPaid: ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0,
          isTransferable: ticket.isTransferable,
          validUntil: ticket.validUntil?.toISOString() || null,
          purchasePrice: ticket.purchasePrice ? parseFloat(ticket.purchasePrice.toString()) : null,
          createdAt: ticket.createdAt.toISOString(),
          vision: {
            id: ticket.Vision.id,
            nombre: ticket.Vision.nombre,
            // Fechas de BASIC
            startDate: ticket.Vision.startDate?.toISOString() || '',
            endDate: ticket.Vision.endDate?.toISOString() || null,
            // Fechas de ADVANCED
            advancedStartDate: ticket.Vision.advancedStartDate?.toISOString() || null,
            advancedEndDate: ticket.Vision.advancedEndDate?.toISOString() || null,
            // Fechas de PL (Liderato)
            plStartDate: ticket.Vision.plWeekend1StartDate?.toISOString() || null,
            plEndDate: ticket.Vision.plWeekend3EndDate?.toISOString() || null,
          },
          organization: {
            name: ticket.Organization.name,
            logoUrl: ticket.Organization.logoUrl,
            transfersEnabled: ticket.Organization.transfersEnabled,
          },
          product: product ? {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            description: product.description,
            location: product.location,
            type: product.type,
          } : null,
        };
      })
    );

    // Generar iniciales del usuario
    const userName = user.nombre || 'Usuario';
    const nameParts = userName.split(' ');
    const userInitials = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : userName.substring(0, 2).toUpperCase();

    // También obtener tickets de EventRegistration (eventos como Samurai Game, etc.)
    const eventRegistrations = await prisma.eventRegistration.findMany({
      where: {
        userId: user.id,
        paymentStatus: 'PAID',
        ticketUsed: false,
      },
      include: {
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
            location: true,
            type: true,
            startDate: true,
            endDate: true,
            visionId: true,
          }
        },
        Organization: {
          select: {
            name: true,
            logoUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filtrar registros de eventos que no hayan expirado
    const validEventRegistrations = eventRegistrations.filter(reg => {
      // Si el producto tiene fecha de fin y ya pasó, no mostrar
      if (reg.SchoolProduct.endDate && new Date(reg.SchoolProduct.endDate) < now) {
        return false;
      }
      return true;
    });

    // Convertir EventRegistrations a formato de ticket
    const eventTickets = validEventRegistrations.map(reg => ({
      id: `event-${reg.id}`,
      type: 'EVENT',
      level: 'EVENT',
      status: 'ACTIVE',
      paymentStatus: reg.paymentStatus,
      costAtPurchase: reg.amountPaid ? parseFloat(reg.amountPaid.toString()) : 0,
      amountPaid: reg.amountPaid ? parseFloat(reg.amountPaid.toString()) : 0,
      isTransferable: false,
      validUntil: reg.SchoolProduct.endDate?.toISOString() || null,
      purchasePrice: reg.amountPaid ? parseFloat(reg.amountPaid.toString()) : null,
      createdAt: reg.createdAt.toISOString(),
      ticketCode: reg.ticketCode,
      vision: {
        id: reg.SchoolProduct.visionId || 0,
        nombre: reg.SchoolProduct.name,
        startDate: reg.SchoolProduct.startDate?.toISOString() || '',
        endDate: reg.SchoolProduct.endDate?.toISOString() || null,
        advancedStartDate: null,
        advancedEndDate: null,
        plStartDate: null,
        plEndDate: null,
      },
      organization: {
        name: reg.Organization?.name || 'Impacto Cuántico',
        logoUrl: reg.Organization?.logoUrl || null,
        transfersEnabled: false,
      },
      product: {
        id: reg.SchoolProduct.id,
        name: reg.SchoolProduct.name,
        imageUrl: reg.SchoolProduct.imageUrl,
        description: reg.SchoolProduct.description,
        location: reg.SchoolProduct.location,
        type: reg.SchoolProduct.type,
      },
    }));

    // Combinar tickets de Vision + tickets de Eventos
    const allTickets = [...ticketsWithProducts, ...eventTickets];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: userName,
        initials: userInitials,
        photo: user.profileImage,
        memberSince: user.createdAt.toISOString(),
      },
      tickets: allTickets,
    });
  } catch (error) {
    logger.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tickets' },
      { status: 500 }
    );
  }
}
