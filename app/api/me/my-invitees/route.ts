import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener lista de usuarios invitados por el usuario actual
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Buscar usuarios que fueron invitados por el usuario actual
    const invitees = await prisma.usuario.findMany({
      where: {
        invitedBy: userId,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        isActive: true,
        createdAt: true,
        currentVisionLevel: true,
        // Verificar si está graduado
        graduatedFromBasic: true,
        graduatedFromAdvanced: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    // Mapear para simplificar la respuesta
    const mappedInvitees = invitees.map(inv => ({
      id: inv.id,
      nombre: inv.nombre,
      email: inv.email,
      imagen: inv.imagen,
      isActive: inv.isActive,
      createdAt: inv.createdAt,
      level: inv.currentVisionLevel || 'BASIC',
      isGraduated: !!(inv.graduatedFromBasic || inv.graduatedFromAdvanced),
      graduatedFromBasic: !!inv.graduatedFromBasic,
      graduatedFromAdvanced: !!inv.graduatedFromAdvanced,
    }));

    // Calcular stats
    const stats = {
      total: mappedInvitees.length,
      active: mappedInvitees.filter(i => i.isActive).length,
      graduated: mappedInvitees.filter(i => i.isGraduated).length,
      graduatedBasic: mappedInvitees.filter(i => i.graduatedFromBasic).length,
      graduatedAdvanced: mappedInvitees.filter(i => i.graduatedFromAdvanced).length,
    };

    return NextResponse.json({
      success: true,
      invitees: mappedInvitees,
      stats,
    });
  } catch (error) {
    console.error('Error fetching invitees:', error);
    return NextResponse.json({ error: 'Error al obtener invitados' }, { status: 500 });
  }
}
