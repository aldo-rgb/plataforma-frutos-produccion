import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener todos los arquetipos disponibles para el trainer
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeSystem = searchParams.get('includeSystem') !== 'false'; // Por defecto incluye los del sistema

    // Obtener usuario con su organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        organizationId: true,
        rol: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea TRAINER o DIRECTOR
    if (!['TRAINER', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'Solo trainers pueden acceder a arquetipos' }, { status: 403 });
    }

    // Construir filtro
    const whereClause: any = {
      isActive: true,
      OR: [
        { trainerId: userId }, // Sus propios personajes
        { isSystemDefault: true }, // Personajes del sistema
      ]
    };

    // Si tiene organización, también incluir los de la organización
    if (user.organizationId) {
      whereClause.OR.push({ organizationId: user.organizationId });
    }

    // Filtrar por categoría si se especifica
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    // Si no quiere los del sistema
    if (!includeSystem) {
      whereClause.OR = whereClause.OR.filter((c: any) => !c.isSystemDefault);
    }

    const archetypes = await prisma.archetype.findMany({
      where: whereClause,
      orderBy: [
        { isSystemDefault: 'desc' }, // Primero los del sistema
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: {
        Trainer: {
          select: { id: true, nombre: true }
        },
        _count: {
          select: { Assignments: true }
        }
      }
    });

    // Agrupar por categoría para la UI
    const groupedByCategory = archetypes.reduce((acc: any, arch) => {
      const cat = arch.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(arch);
      return acc;
    }, {});

    return NextResponse.json({
      archetypes,
      groupedByCategory,
      total: archetypes.length
    });

  } catch (error) {
    logger.error('Error fetching archetypes:', error);
    return NextResponse.json({ error: 'Error al obtener arquetipos' }, { status: 500 });
  }
}

// POST - Crear nuevo arquetipo personalizado
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    const { 
      name, 
      category, 
      maneraSerTag, 
      maneraSerLabel, 
      scriptFeedback, 
      description,
      imageUrl 
    } = body;

    // Validaciones
    if (!name || !maneraSerTag || !maneraSerLabel || !scriptFeedback) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: name, maneraSerTag, maneraSerLabel, scriptFeedback' 
      }, { status: 400 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, rol: true }
    });

    if (!user || !['TRAINER', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado para crear arquetipos' }, { status: 403 });
    }

    const archetype = await prisma.archetype.create({
      data: {
        trainerId: userId,
        organizationId: user.organizationId,
        name,
        category: category || 'CUSTOM',
        maneraSerTag,
        maneraSerLabel,
        scriptFeedback,
        description,
        imageUrl,
        isSystemDefault: false
      }
    });

    return NextResponse.json({ archetype }, { status: 201 });

  } catch (error) {
    logger.error('Error creating archetype:', error);
    return NextResponse.json({ error: 'Error al crear arquetipo' }, { status: 500 });
  }
}
