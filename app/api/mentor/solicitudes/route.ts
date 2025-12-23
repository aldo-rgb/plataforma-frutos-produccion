import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/mentor/solicitudes
 * Obtiene todas las solicitudes de mentoría del mentor actual
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

    // Obtener el perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { 
        id: true,
        enlaceVideoLlamada: true,
        tipoVideoLlamada: true
      }
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'No tienes un perfil de mentor' },
        { status: 403 }
      );
    }

    // Obtener todas las solicitudes del mentor
    const solicitudes = await prisma.solicitudMentoria.findMany({
      where: {
        perfilMentorId: perfilMentor.id
      },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true,
            imagen: true
          }
        },
        ServicioMentoria: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: [
        { estado: 'asc' }, // PENDIENTE primero
        { fechaSolicitada: 'asc' }
      ]
    });

    // Formatear datos
    const solicitudesFormateadas = solicitudes.map(sol => {
      let fecha = 'Por confirmar';
      let hora = '--';
      
      if (sol.fechaSolicitada) {
        fecha = new Date(sol.fechaSolicitada).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        if (sol.horaSolicitada) {
          hora = sol.horaSolicitada;
        }
      }

      return {
        id: sol.id,
        clienteNombre: sol.Usuario.nombre || 'Estudiante',
        clienteEmail: sol.Usuario.email,
        clienteImagen: sol.Usuario.imagen,
        servicioNombre: sol.ServicioMentoria.nombre || 'Sesión de Mentoría',
        fecha,
        hora,
        estado: sol.estado,
        monto: Number(sol.montoTotal),
        notas: sol.notas,
        createdAt: sol.createdAt.toISOString(),
        enlaceVideoLlamada: perfilMentor.enlaceVideoLlamada,
        tipoVideoLlamada: perfilMentor.tipoVideoLlamada || 'zoom'
      };
    });

    return NextResponse.json({
      success: true,
      solicitudes: solicitudesFormateadas
    });

  } catch (error: any) {
    console.error('❌ Error al obtener solicitudes:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener solicitudes',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
