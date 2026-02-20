// API para gestionar campañas de Time Capsule
// Solo COORDINADOR y SCHOOL_ADMIN pueden crear/gestionar

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN', 'ADMINISTRADOR'];

// GET - Listar campañas de la organización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    const campaigns = await prisma.timeCapsuleCampaign.findMany({
      where: {
        organizationId: user.organizationId!,
        ...(visionId ? { visionId: parseInt(visionId) } : {})
      },
      include: {
        Vision: { select: { id: true, nombre: true } },
        _count: { select: { Messages: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Crear nueva campaña
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      visionId, 
      name, 
      slug, 
      description,
      startDate,
      closeDate,
      notifyDaysBefore = 5,
      pointsPerMessage = 100
    } = body;

    // Validar que la visión pertenezca a la organización
    const vision = await prisma.vision.findFirst({
      where: { 
        id: visionId, 
        organizationId: user.organizationId! 
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar slug único
    const existingSlug = await prisma.timeCapsuleCampaign.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 });
    }

    const campaign = await prisma.timeCapsuleCampaign.create({
      data: {
        visionId,
        organizationId: user.organizationId!,
        name,
        slug,
        description,
        startDate: new Date(startDate),
        closeDate: new Date(closeDate),
        notifyDaysBefore,
        pointsPerMessage,
        isActive: true,
        isReleased: false
      },
      include: {
        Vision: { select: { id: true, nombre: true } }
      }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
