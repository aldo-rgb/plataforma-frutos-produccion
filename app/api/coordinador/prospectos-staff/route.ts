import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Solo coordinadores y SCHOOL_ADMIN pueden acceder
    if (!['SCHOOL_ADMIN', 'COORDINADOR'].includes(usuario.rol || '')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Obtener prospectos de staff (usuarios con quiereSerStaff = true)
    const prospectos = await prisma.perfilCompleto.findMany({
      where: {
        quiereSerStaff: true,
        usuario: {
          organizationId: usuario.organizationId
        }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true,
            rol: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Formatear datos para el frontend
    const prospectosFormateados = prospectos.map(p => ({
      id: p.usuario.id,
      nombre: p.usuario.nombre,
      email: p.usuario.email,
      telefono: p.usuario.telefono || p.whatsapp,
      profileImage: p.usuario.profileImage,
      rol: p.usuario.rol,
      tallaCamiseta: p.tallaCamiseta,
      ciudad: p.ciudad,
      estado: p.estado,
      ocupacion: p.ocupacion,
      fechaRegistro: p.usuario.createdAt,
      fechaSolicitud: p.updatedAt
    }));

    return NextResponse.json({
      success: true,
      prospectos: prospectosFormateados,
      total: prospectosFormateados.length
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/coordinador/prospectos-staff:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cargar prospectos' },
      { status: 500 }
    );
  }
}
