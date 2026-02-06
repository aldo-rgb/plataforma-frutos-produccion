import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Listar todas las organizaciones master
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const masterOrgs = await prisma.masterOrganization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
            totalLicenses: true,
            activeLicenses: true,
            createdAt: true
          }
        }
      }
    });

    const masterOrgsWithCount = masterOrgs.map(mo => ({
      ...mo,
      organizationCount: mo.Organization.length,
      totalLicenses: mo.Organization.reduce((sum, org) => sum + org.totalLicenses, 0)
    }));

    return NextResponse.json(masterOrgsWithCount);
  } catch (error: any) {
    logger.error('Error obteniendo master organizations:', error);
    return NextResponse.json(
      { error: 'Error al obtener organizaciones master' },
      { status: 500 }
    );
  }
}

// POST: Crear nueva organización master
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, logoUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Verificar que no exista una master org con el mismo nombre
    const existing = await prisma.masterOrganization.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una organización master con este nombre' },
        { status: 400 }
      );
    }

    const masterOrg = await prisma.masterOrganization.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        createdBy: user.id,
        updatedAt: new Date()
      },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(masterOrg, { status: 201 });
  } catch (error: any) {
    logger.error('Error creando master organization:', error);
    return NextResponse.json(
      { error: 'Error al crear organización master' },
      { status: 500 }
    );
  }
}
