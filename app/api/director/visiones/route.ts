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

    console.log('👤 Usuario encontrado:', {
      id: usuario?.id,
      nombre: usuario?.nombre,
      rol: usuario?.rol,
      organizationId: usuario?.organizationId
    });

    if (!usuario || (usuario.rol !== 'DIRECTOR' && usuario.rol !== 'SCHOOL_ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!usuario.organizationId) {
      console.log('⚠️ Director sin organizationId asignado');
      return NextResponse.json({ error: 'Director sin organización asignada' }, { status: 400 });
    }

    console.log('🔍 Director', usuario.id, 'cargando visiones de organización', usuario.organizationId);

    // Obtener todas las visiones de la organización del director
    const visiones = await prisma.vision.findMany({
      where: {
        organizationId: usuario.organizationId
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('✅ Visiones encontradas:', visiones.length);
    console.log('📋 Detalle de visiones:', visiones.map(v => ({
      id: v.id,
      nombre: v.nombre,
      isActive: v.isActive,
      organizationId: v.organizationId,
      coordinador: v.Usuario?.nombre,
      participantes: v._count.VisionParticipante,
      mentores: v._count.VisionMentor,
      gamechangers: v._count.VisionGameChanger
    })));

    return NextResponse.json({
      success: true,
      visiones
    });
  } catch (error) {
    console.error('❌ Error fetching director visiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
