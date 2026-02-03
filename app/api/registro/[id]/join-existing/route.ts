import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API para que usuarios EXISTENTES se unan a un liderato específico
 * Solo requiere email para verificar que existe
 * Un usuario puede estar en múltiples lideratos a la vez
 */
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'El correo electrónico es obligatorio' },
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
        coordinadorId: true,
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

    // Buscar el usuario por email
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'No existe una cuenta con este correo electrónico', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verificar si ya está en este liderato (VisionParticipante)
    const existingParticipant = await prisma.visionParticipante.findUnique({
      where: {
        visionId_participanteId: {
          visionId: vision.id,
          participanteId: existingUser.id
        }
      }
    });

    if (existingParticipant) {
      return NextResponse.json(
        { success: false, error: 'Ya estás registrado en este liderato', code: 'ALREADY_ENROLLED' },
        { status: 409 }
      );
    }

    // Verificar si ya tiene enrollment en esta visión
    const existingEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        visionId: vision.id,
        userId: existingUser.id
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en este liderato', code: 'ALREADY_ENROLLED' },
        { status: 409 }
      );
    }

    // Agregar a VisionParticipante (legacy)
    await prisma.visionParticipante.create({
      data: {
        visionId: vision.id,
        participanteId: existingUser.id
      }
    });

    // Crear enrollment en nivel PL (Liderato)
    if (vision.coordinadorId) {
      await prisma.vision_enrollments.create({
        data: {
          visionId: vision.id,
          userId: existingUser.id,
          coordinatorId: vision.coordinadorId,
          level: 'PL', // Nivel Liderato
          enrollmentStatus: 'ENROLLED',
          paymentStatus: 'PAID', // Ya son usuarios existentes
          attendanceStatus: 'PENDING',
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Te has unido exitosamente a ${vision.nombre}`,
      userId: existingUser.id,
      userName: existingUser.nombre,
      visionName: vision.nombre
    });

  } catch (error) {
    console.error('Error al unirse a liderato:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
