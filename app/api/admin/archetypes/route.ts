import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener todos los arquetipos del sistema (isSystemDefault = true)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Verificar que sea ADMINISTRADOR o ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR' && user?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden acceder a esta función' }, { status: 403 });
    }

    // Construir filtro - solo arquetipos del sistema
    const whereClause: any = {
      isSystemDefault: true
    };

    // Filtrar por categoría si se especifica
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    const archetypes = await prisma.archetype.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: {
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
    console.error('Error fetching system archetypes:', error);
    return NextResponse.json({ error: 'Error al obtener arquetipos del sistema' }, { status: 500 });
  }
}

// POST - Crear nuevo arquetipo del sistema
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Verificar que sea ADMINISTRADOR o ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR' && user?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear arquetipos del sistema' }, { status: 403 });
    }

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

    const archetype = await prisma.archetype.create({
      data: {
        trainerId: null, // Los del sistema no tienen trainer
        organizationId: null, // Los del sistema no tienen organización
        name,
        category: category || 'CUSTOM',
        maneraSerTag,
        maneraSerLabel,
        scriptFeedback,
        description,
        imageUrl,
        isSystemDefault: true, // Es del sistema
        isActive: true
      }
    });

    return NextResponse.json({ archetype }, { status: 201 });

  } catch (error) {
    console.error('Error creating system archetype:', error);
    return NextResponse.json({ error: 'Error al crear arquetipo del sistema' }, { status: 500 });
  }
}
