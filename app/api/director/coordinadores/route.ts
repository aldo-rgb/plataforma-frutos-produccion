import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener coordinadores de la organización
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const directorId = parseInt(session.user.id);

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener coordinadores de la organización
    const coordinadores = await prisma.usuario.findMany({
      where: {
        organizationId: director.organizationId,
        rol: 'COORDINADOR'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        isActive: true,
        createdAt: true,
        VisionesCoordinadas: {
          select: {
            id: true,
            nombre: true,
            Participantes: {
              select: {
                participanteId: true
              }
            },
            GameChangers: {
              select: {
                gameChangerId: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Procesar datos
    const coordinadoresConInfo = coordinadores.map(coord => ({
      ...coord,
      totalVisiones: coord.VisionesCoordinadas.length,
      totalParticipantes: coord.VisionesCoordinadas.reduce((acc, v) => 
        acc + v.Participantes.length + v.GameChangers.length, 0
      )
    }));

    return NextResponse.json({
      success: true,
      coordinadores: coordinadoresConInfo
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo coordinadores:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener coordinadores',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo coordinador
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const directorId = parseInt(session.user.id);
    const body = await request.json();

    const { nombre, email, password } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Crear coordinador
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const coordinador = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: 'COORDINADOR',
        organizationId: director.organizationId,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      coordinador,
      message: 'Coordinador creado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error creando coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear coordinador',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
