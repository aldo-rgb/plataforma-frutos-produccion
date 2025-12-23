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

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Sistema de Visiones con jerarquía implementado
    const visiones = await prisma.vision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        GameChangers: {
          include: {
            GameChanger: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        },
        Participantes: {
          include: {
            Participante: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            },
            GameChanger: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        _count: {
          select: { 
            GameChangers: true,
            Participantes: true
          }
        }
      }
    });

    return NextResponse.json({ visiones });

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

    if (usuario?.rol !== 'COORDINADOR' && usuario?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Crear visión con el coordinador que la crea
    const nuevaVision = await prisma.vision.create({
      data: {
        nombre: name,
        descripcion: description || null,
        coordinadorId: usuario.id,
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      vision: nuevaVision 
    });

  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json({ error: 'Error al crear visión' }, { status: 500 });
  }
}
