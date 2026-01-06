import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Listar organizaciones master activas (endpoint público para formulario de registro)
export async function GET(req: NextRequest) {
  try {
    const masterOrgs = await prisma.masterOrganization.findMany({
      where: {
        isActive: true
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        isActive: true,
        _count: {
          select: {
            Organizations: true
          }
        }
      }
    });

    const masterOrgsFormatted = masterOrgs.map(mo => ({
      id: mo.id,
      name: mo.name,
      description: mo.description,
      logoUrl: mo.logoUrl,
      isActive: mo.isActive,
      organizationCount: mo._count.Organizations
    }));

    return NextResponse.json(masterOrgsFormatted);
  } catch (error) {
    console.error('Error loading public master organizations:', error);
    return NextResponse.json(
      { error: 'Error al cargar agrupaciones' },
      { status: 500 }
    );
  }
}
