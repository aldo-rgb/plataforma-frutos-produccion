import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';


// GET - Obtener todos los usuarios (para admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Determinar filtros según el rol
    let whereClause: any = {};
    
    if (currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'ADMIN') {
      // Admin puede ver todos
      whereClause = {};
    } else if (currentUser.rol === 'DIRECTOR' || currentUser.rol === 'SCHOOL_ADMIN') {
      // Director/School Admin solo ve usuarios de su organización
      if (!currentUser.organizationId) {
        return NextResponse.json({ error: 'Director sin organización asignada' }, { status: 400 });
      }
      whereClause = {
        organizationId: currentUser.organizationId,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      };
    } else if (currentUser.rol === 'COORDINADOR') {
      // Coordinador solo ve usuarios de sus visiones
      const visiones = await prisma.vision.findMany({
        where: { coordinadorId: currentUser.id },
        select: { id: true }
      });
      
      const visionIds = visiones.map(v => v.id);
      
      if (visionIds.length === 0) {
        return NextResponse.json({ usuarios: [] });
      }

      whereClause = {
        OR: [
          {
            VisionParticipante_VisionParticipante_participanteIdToUsuario: {
              some: {
                visionId: { in: visionIds }
              }
            }
          },
          {
            GameChangerEnVisiones: {
              some: {
                visionId: { in: visionIds }
              }
            }
          }
        ]
      };
    } else {
      // Otros roles solo ven usuarios activos
      whereClause = { isActive: true };
    }
    
    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        vision: true,
        rol: true,
        isActive: true,
        PerfilMentor: {
          select: {
            id: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({ usuarios });

  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Actualizar contraseña de usuario (solo ADMINISTRADOR)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId y newPassword son requeridos' },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña (en producción usar bcrypt)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    const usuario = await prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Contraseña actualizada para ${usuario.nombre}`,
      usuario
    });

  } catch (error) {
    logger.error('Error al actualizar contraseña:', error);
    return NextResponse.json(
      { error: 'Error al actualizar contraseña' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
