import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo coordinadores pueden ver esta lista
    const coordinatorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'TRAINER'];
    if (!coordinatorRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar que el usuario tiene organización asignada
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No tienes una organización asignada' }, { status: 400 });
    }

    // Obtener todos los formularios médicos de la organización del coordinador
    const forms = await prisma.medicalForm.findMany({
      where: {
        Usuario: {
          organizationId: user.organizationId
        }
      },
      select: {
        id: true,
        userId: true,
        hasAlerts: true,
        createdAt: true,
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { hasAlerts: 'desc' }, // Primero los que tienen alertas
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ 
      success: true,
      forms,
      total: forms.length,
      withAlerts: forms.filter(f => f.hasAlerts).length,
      organizationId: user.organizationId
    });

  } catch (error) {
    console.error('Error fetching medical forms list:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
