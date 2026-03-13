import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Tasa de comisión para talleres: 20%
const WORKSHOP_COMMISSION_RATE = 0.20;

// POST - Registrar a alguien en un evento
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const id = parseInt(productId);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, email, telefono, comoTeEnteraste, invitedByUserId } = body;

    // Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y está activo
    const product = await prisma.schoolProduct.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        maxCapacity: true,
        currentEnrollment: true,
        organizationId: true,
        basePrice: true,
        promoPrice: true,
        type: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Este evento ya no está disponible' },
        { status: 404 }
      );
    }

    // Verificar capacidad
    if (product.maxCapacity && product.currentEnrollment >= product.maxCapacity) {
      return NextResponse.json(
        { success: false, error: 'Lo sentimos, el evento está lleno' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un registro con este email para este producto
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        productId: id,
        email: email.trim().toLowerCase(),
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'Ya estás registrado en este evento' },
        { status: 400 }
      );
    }

    // Verificar el usuario que invitó (si se proporcionó)
    let invitedBy: number | null = null;
    let inviterData: { id: number; referralCode: string | null; isGraduated: boolean } | null = null;
    
    if (invitedByUserId) {
      const inviter = await prisma.usuario.findUnique({
        where: { id: parseInt(invitedByUserId) },
        select: { 
          id: true, 
          referralCode: true, 
          isGraduated: true,
          nombre: true 
        },
      });
      
      if (inviter) {
        invitedBy = inviter.id;
        inviterData = inviter;
      }
    }

    // Crear el registro
    const registration = await prisma.eventRegistration.create({
      data: {
        productId: id,
        organizationId: product.organizationId,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono?.trim() || null,
        comoTeEnteraste: comoTeEnteraste || null,
        invitedByUserId: invitedBy,
        status: 'REGISTERED',
      },
    });

    // Incrementar el contador de inscritos
    await prisma.schoolProduct.update({
      where: { id },
      data: {
        currentEnrollment: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });

    // TODO: Enviar email de confirmación aquí

    return NextResponse.json({
      success: true,
      message: '¡Registro exitoso!',
      registration: {
        id: registration.id,
        nombre: registration.nombre,
        email: registration.email,
        invitedBy: inviterData?.nombre || null,
      },
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el registro' },
      { status: 500 }
    );
  }
}
