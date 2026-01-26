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
      where: { email: session.user.email }
    });

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    
    if (!usuario || !coordinadorRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Buscar usuarios relacionados
    let whereClause: any = {};
    
    if (usuario.organizationId) {
      whereClause.organizationId = usuario.organizationId;
    } else {
      whereClause.coordinadorId = usuario.id;
    }

    // Obtener usuarios participantes/gamechangers con sus avatares generados
    const usuarios = await prisma.usuario.findMany({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
        isActive: true
      },
      select: { 
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        AvatarGenerationAttempt: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Separar usuarios que completaron el avatar (paso 5) de los que no
    const completados = usuarios.filter(u => u.AvatarGenerationAttempt.length > 0);
    const pendientes = usuarios.filter(u => u.AvatarGenerationAttempt.length === 0);

    // Formatear respuesta
    const completadosList = completados.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      profileImage: u.profileImage,
      fechaCompletado: u.AvatarGenerationAttempt[0]?.createdAt
    }));

    const pendientesList = pendientes.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      profileImage: u.profileImage
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total: usuarios.length,
        completados: completados.length,
        pendientes: pendientes.length,
        porcentajeCompletado: usuarios.length > 0 
          ? Math.round((completados.length / usuarios.length) * 100) 
          : 0
      },
      completadosList,
      pendientesList
    });

  } catch (error: any) {
    console.error('Error en carta-status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de cartas', details: error.message },
      { status: 500 }
    );
  }
}
