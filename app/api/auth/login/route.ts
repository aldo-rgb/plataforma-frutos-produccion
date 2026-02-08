import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { loginSchema, validateData, getValidationErrorMessage } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - muy restrictivo para login
    const { result, response } = rateLimit(request, RateLimitPresets.auth);
    if (response) {
      logger.warn('Rate limit exceeded on login');
      return response;
    }

    const body = await request.json();

    // Validar datos con Zod
    const validation = validateData(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: getValidationErrorMessage(validation.details) },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
        isActive: true,
        PerfilMentor: {
          select: {
            id: true,
          },
        },
      },
    });

    // Verificar si existe el usuario
    if (!usuario) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo
    // EXCEPCIÓN: Si tiene rol MENTOR, permitir acceso aunque esté desactivado
    // para que pueda completar su perfil
    const isMentor = usuario.rol === 'MENTOR';
    if (!usuario.isActive && !isMentor) {
      return NextResponse.json(
        { error: 'Usuario desactivado. Contacta al coordinador.' },
        { status: 403 }
      );
    }

    // Verificar contraseña
    if (!usuario.password) {
      return NextResponse.json(
        { error: 'Usuario sin contraseña configurada' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Login exitoso
    return NextResponse.json({
      success: true,
      userId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    });

  } catch (error) {
    logger.error('Error en login', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
