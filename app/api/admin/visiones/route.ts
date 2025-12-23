import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Listar todas las visiones
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (usuario?.rol !== 'ADMIN' && usuario?.rol !== 'STAFF') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Como las tablas Vision y visionId no existen aún, retornamos vacío por ahora
    // Cuando se ejecute la migración, se descomentará este código:
    
    /*
    const visiones = await prisma.vision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usuarios: true }
        }
      }
    });

    return NextResponse.json({ visiones });
    */

    // Por ahora, retornar array vacío
    return NextResponse.json({ 
      visiones: [],
      message: 'Sistema de visiones pendiente de migración. Ejecuta la migración 20251218_ciclos_hibridos primero.'
    });

  } catch (error) {
    console.error('Error loading visiones:', error);
    return NextResponse.json({ error: 'Error al cargar visiones' }, { status: 500 });
  }
}

// POST - Crear nueva visión
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (usuario?.rol !== 'ADMIN' && usuario?.rol !== 'STAFF') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validar que endDate sea después de startDate
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'La fecha fin debe ser posterior a la fecha inicio' }, { status: 400 });
    }

    /*
    const nuevaVision = await prisma.vision.create({
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'ACTIVE',
        coordinatorId: usuario.id
      }
    });

    // Log de acción admin
    await prisma.adminActionLog.create({
      data: {
        adminId: usuario.id,
        targetVisionId: nuevaVision.id,
        actionType: 'CREATE_VISION',
        details: {
          name,
          startDate,
          endDate
        }
      }
    });

    return NextResponse.json({ success: true, vision: nuevaVision });
    */

    return NextResponse.json({ 
      error: 'Sistema de visiones pendiente de migración. Ejecuta la migración 20251218_ciclos_hibridos primero.',
      migracionRequerida: true
    }, { status: 503 });

  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json({ error: 'Error al crear visión' }, { status: 500 });
  }
}
