import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener datos completos del usuario incluyendo organización
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        profileImage: true,
        organizationId: true,
        assignedMentorId: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: usuario.id,
        rol: usuario.rol,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        profileImage: usuario.profileImage,
        organizationId: usuario.organizationId,
        Organization: usuario.Organization,
        assignedMentorId: usuario.assignedMentorId,
        assignedMentor: usuario.Usuario_Usuario_assignedMentorIdToUsuario
      }
    });

  } catch (error) {
    logger.error('Error al obtener perfil del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nombre, telefono, profileImage } = body;

    // Validar que al menos un campo venga
    if (!nombre && telefono === undefined && profileImage === undefined) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Construir objeto de actualización solo con campos presentes
    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage || null;

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        profileImage: true,
        rol: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: usuarioActualizado
    });

  } catch (error) {
    logger.error('Error al actualizar perfil:', error);
    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
