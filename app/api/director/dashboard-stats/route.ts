import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Organization: true
      }
    });

    if (!usuario || (usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'DIRECTOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Si es director, filtrar por su organización
    const whereClause = usuario.rol === 'DIRECTOR' && usuario.organizationId
      ? { organizationId: usuario.organizationId }
      : {};

    // Total de participantes
    const totalParticipantes = await prisma.usuario.count({
      where: {
        ...whereClause,
        rol: 'PARTICIPANTE'
      }
    });

    // Cartas pendientes de autorización
    const cartasPendientes = await prisma.cartaFrutos.count({
      where: {
        Usuario: whereClause,
        estado: 'PENDIENTE'
      }
    });

    // Cartas autorizadas
    const cartasAutorizadas = await prisma.cartaFrutos.count({
      where: {
        Usuario: whereClause,
        estado: 'AUTORIZADA'
      }
    });

    // Llamadas pendientes
    const llamadasPendientes = await prisma.callBooking.count({
      where: {
        Usuario_CallBooking_studentIdToUsuario: whereClause,
        status: 'PENDING'
      }
    });

    // Alertas activas
    const alertasActivas = await prisma.mentorAlert.count({
      where: {
        Usuario_MentorAlert_userIdToUsuario: whereClause,
        status: 'ACTIVE'
      }
    });

    // Participantes en riesgo (más de 2 llamadas perdidas)
    const participantesRiesgo = await prisma.usuario.count({
      where: {
        ...whereClause,
        rol: 'PARTICIPANTE',
        llamadasPerdidas: {
          gte: 2
        }
      }
    });

    return NextResponse.json({
      totalParticipantes,
      cartasPendientes,
      cartasAutorizadas,
      llamadasPendientes,
      alertasActivas,
      participantesRiesgo
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
