import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/student/mis-sesiones
 * Obtiene todas las sesiones de mentoría del estudiante actual
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener todas las solicitudes del estudiante
    const solicitudes = await prisma.solicitudMentoria.findMany({
      where: {
        clienteId: session.user.id
      },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: {
                nombre: true,
                imagen: true
              }
            }
          }
        },
        ServicioMentoria: {
          select: {
            nombre: true,
            tipo: true
          }
        },
        ResenasMentoria: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear datos para el frontend
    const sesiones = solicitudes.map(solicitud => {
      const hasReview = solicitud.ResenasMentoria !== null;
      
      // Formatear fecha y hora
      let fecha = 'Por confirmar';
      let hora = '--';
      
      if (solicitud.fechaSolicitada) {
        fecha = new Date(solicitud.fechaSolicitada).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        if (solicitud.horaSolicitada) {
          hora = solicitud.horaSolicitada;
        }
      }

      return {
        id: solicitud.id,
        mentorName: solicitud.PerfilMentor.Usuario.nombre || 'Mentor',
        mentorImage: solicitud.PerfilMentor.Usuario.imagen || '',
        serviceName: solicitud.ServicioMentoria.nombre || 'Sesión de Mentoría',
        fecha,
        hora,
        estado: solicitud.estado,
        precio: Number(solicitud.montoTotal),
        hasReview,
        perfilMentorId: solicitud.perfilMentorId,
        enlaceVideoLlamada: (solicitud.PerfilMentor as any)?.enlaceVideoLlamada || null,
        tipoVideoLlamada: (solicitud.PerfilMentor as any)?.tipoVideoLlamada || 'zoom'
      };
    });

    return NextResponse.json({
      success: true,
      sesiones
    });

  } catch (error: any) {
    console.error('❌ Error al obtener sesiones:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener sesiones',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
