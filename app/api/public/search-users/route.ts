import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Buscar usuarios por nombre (para el campo "¿Quién te invitó?")
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const orgId = searchParams.get('orgId');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    // Buscar usuarios que coincidan con el nombre
    const users = await prisma.usuario.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { referralCode: { equals: query.toUpperCase() } },
        ],
        isActive: true,
        // Si se proporciona orgId, filtrar por organización
        ...(orgId ? { organizationId: parseInt(orgId) } : {}),
      },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        referralCode: true,
        isGraduated: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
      orderBy: [
        { isGraduated: 'desc' }, // Graduados primero (pueden recibir comisión)
        { nombre: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        imagen: u.imagen,
        referralCode: u.referralCode,
        isGraduated: u.isGraduated,
        organizationName: u.Organization_Usuario_organizationIdToOrganization?.name,
      })),
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar usuarios' },
      { status: 500 }
    );
  }
}
