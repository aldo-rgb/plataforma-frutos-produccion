import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - Obtener todos los usuarios (para admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Si no es admin, devolver solo usuarios activos sin rol
    const esAdmin = session?.user?.rol === 'ADMINISTRADOR';
    
    const usuarios = await prisma.usuario.findMany({
      where: esAdmin ? {} : { isActive: true },
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
    console.error('Error al obtener usuarios:', error);
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
    console.error('Error al actualizar contraseña:', error);
    return NextResponse.json(
      { error: 'Error al actualizar contraseña' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
