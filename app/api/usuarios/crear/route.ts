import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendOrganicWelcomeMessage } from '@/lib/whatsapp';
import { sendOrganicWelcomeEmail } from '@/lib/email';
import logger from '@/lib/logger';


// Roles permitidos para registro público (sin autenticación)
// Roles privilegiados como ADMIN, SCHOOL_ADMIN, COORDINADOR, TRAINER requieren proceso administrativo
const ALLOWED_PUBLIC_ROLES = ['MENTOR', 'PARTICIPANTE', 'LIDER'];

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, password, telefono, rol } = await request.json();

    // Validar datos
    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // SEGURIDAD: Validar que el rol sea permitido para registro público
    if (!ALLOWED_PUBLIC_ROLES.includes(rol)) {
      logger.warn(`⚠️ Intento de crear usuario con rol no permitido: ${rol} - email: ${email}`);
      return NextResponse.json(
        { error: 'Rol no permitido para registro público' },
        { status: 403 }
      );
    }

    // Verificar que el email no exista
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    // Los mentores se crean inactivos por defecto (requieren completar perfil y aprobación)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        telefono: telefono || null,
        rol,
        isActive: rol !== 'MENTOR', // MENTOR = false, otros roles = true
        llamadasPerdidas: 0,
        puntosCuanticos: 0,
        onboardingOrigin: 'ORGANIC_SIGNUP',
        wizardCompleted: false,
        requirePasswordChange: false, // Usuario creó su propia contraseña
      },
    });

    // NOTA: El ciclo de 90 días se creará automáticamente cuando su carta sea aprobada

    // Enviar mensaje de WhatsApp de bienvenida (si tiene teléfono)
    if (telefono && telefono.trim()) {
      try {
        await sendOrganicWelcomeMessage(telefono, nombre);
        logger.debug(`📱 WhatsApp enviado a ${nombre} (${telefono})`);
      } catch (error) {
        logger.warn('⚠️ No se pudo enviar WhatsApp:', error);
        // No fallar la creación del usuario si WhatsApp falla
      }
    }

    // Enviar correo de bienvenida
    try {
      await sendOrganicWelcomeEmail(email, nombre);
      logger.debug(`📧 Email de bienvenida enviado a ${nombre} (${email})`);
    } catch (error) {
      logger.warn('⚠️ No se pudo enviar email:', error);
      // No fallar la creación del usuario si el email falla
    }

    return NextResponse.json({
      success: true,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
      },
    });

  } catch (error) {
    logger.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
