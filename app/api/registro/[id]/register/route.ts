import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, email, telefono, password } = body;

    // Validaciones
    if (!nombre || !email || !telefono || !password) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de correo inválido' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y está activa
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        maxParticipantes: true,
        isActive: true,
        organizationId: true,
        _count: {
          select: {
            VisionParticipante: true
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    if (!vision.isActive) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no está activa' },
        { status: 403 }
      );
    }

    // Verificar límite de participantes
    if (vision.maxParticipantes && vision._count.VisionParticipante >= vision.maxParticipantes) {
      return NextResponse.json(
        { success: false, error: 'Se ha alcanzado el límite de participantes para esta visión' },
        { status: 403 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este correo electrónico ya está registrado' },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obtener el primer admin/coordinador de la organización para usar como assignedBy
    const adminUser = await prisma.usuario.findFirst({
      where: {
        organizationId: vision.organizationId,
        rol: { in: ['ADMINISTRADOR', 'COORDINADOR', 'SCHOOL_ADMIN'] },
        isActive: true
      },
      select: { id: true }
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'No hay administradores activos en esta organización' },
        { status: 500 }
      );
    }

    // Crear usuario con tier FREE (registro vía QR)
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email,
        telefono,
        password: hashedPassword,
        rol: 'PARTICIPANTE',
        tier: 'FREE',
        isActive: true,
        organizationId: vision.organizationId
      }
    });

    // Asignar a la visión
    await prisma.visionParticipante.create({
      data: {
        visionId: vision.id,
        participanteId: newUser.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: newUser.id
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el registro' },
      { status: 500 }
    );
  }
}
