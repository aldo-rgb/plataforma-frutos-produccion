import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, password, organizationCode } = body;

    // Validaciones
    if (!nombre || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor completa todos los campos' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Buscar organización si se proporcionó código
    let organizationId = null;
    if (organizationCode) {
      const organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { slug: organizationCode },
            { id: !isNaN(Number(organizationCode)) ? parseInt(organizationCode) : 0 }
          ]
        }
      });

      if (organization) {
        organizationId = organization.id;
      }
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: 'PARTICIPANTE',
        tier: 'BASIC',
        organizationId,
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: newUser.id
    });

  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
