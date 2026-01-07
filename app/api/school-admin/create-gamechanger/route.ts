import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nombre, email } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Obtener organización del director
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 403 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    let userId: number;

    if (existingUser) {
      // Usuario existe - verificar organización
      if (existingUser.organizationId && existingUser.organizationId !== director.organizationId) {
        // Usuario pertenece a OTRA organización
        return NextResponse.json(
          { success: false, error: 'Este usuario pertenece a otra organización' },
          { status: 403 }
        );
      }

      // Usuario SIN organización (LOBO_SOLITARIO) o de la MISMA organización
      if (!existingUser.organizationId) {
        // Incorporar lobo solitario a la organización
        await prisma.usuario.update({
          where: { id: existingUser.id },
          data: {
            organizationId: director.organizationId,
            rol: 'GAMECHANGER',
            updatedAt: new Date(),
          },
        });
        
        userId = existingUser.id;

        return NextResponse.json({
          success: true,
          userId,
          message: 'Lobo Solitario incorporado a la organización como Game Changer',
          isExisting: true,
          wasLoboSolitario: true,
        });
      }

      // Usuario de la misma organización - solo convertir rol si es necesario
      if (existingUser.rol !== 'GAMECHANGER') {
        await prisma.usuario.update({
          where: { id: existingUser.id },
          data: {
            rol: 'GAMECHANGER',
            updatedAt: new Date(),
          },
        });
      }

      userId = existingUser.id;

      return NextResponse.json({
        success: true,
        userId,
        message: 'Usuario convertido a Game Changer exitosamente',
        isExisting: true,
      });
    } else {
      // Usuario no existe - crear nuevo con contraseña Quantum123
      const hashedPassword = await bcrypt.hash('Quantum123', 10);

      const newUser = await prisma.usuario.create({
        data: {
          nombre,
          email: email.toLowerCase(),
          password: hashedPassword,
          rol: 'GAMECHANGER',
          organizationId: director.organizationId,
          isActive: true,
        },
      });

      userId = newUser.id;

      return NextResponse.json({
        success: true,
        userId,
        message: 'Game Changer creado exitosamente',
        isExisting: false,
        defaultPassword: 'Quantum123',
      });
    }

  } catch (error) {
    console.error('Error creating/converting game changer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
