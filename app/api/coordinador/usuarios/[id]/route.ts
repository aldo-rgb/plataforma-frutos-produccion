import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userId = parseInt(params.id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    // Obtener el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        licenseCode: true,
        assignedMentorId: true,
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              select: {
                id: true,
                coordinadorId: true
              }
            }
          }
        },
        GameChangerEnVisiones: {
          include: {
            Vision: {
              select: {
                id: true,
                coordinadorId: true
              }
            }
          }
        },
        LicenseAssignments: {
          where: {
            isActive: true
          },
          select: {
            licenseCode: true,
            activatedAt: true
          },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el coordinador tenga acceso a este usuario
    const visionesDelUsuario = [
      ...usuario.ParticipanteEnVisiones.map(p => p.Vision),
      ...usuario.GameChangerEnVisiones.map(gc => gc.Vision)
    ];

    const tieneAcceso = visionesDelUsuario.some(v => v.coordinadorId === coordinador.id);

    if (!tieneAcceso) {
      return NextResponse.json(
        { error: 'No tienes acceso a este usuario' },
        { status: 403 }
      );
    }

    // Formatear respuesta usando LicenseAssignments si no tiene licenseCode directo
    const licenseCode = usuario.licenseCode || usuario.LicenseAssignments?.[0]?.licenseCode || null;

    return NextResponse.json({
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        tier: usuario.tier,
        licenseCode,
        assignedMentorId: usuario.assignedMentorId
      }
    });
  } catch (error) {
    console.error('❌ Error fetching usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
