import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generar UUID sin dependencia externa
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      referrerName,
      referrerId,
      relationship,
      firstExhibitorId 
    } = body;

    // Validaciones
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Nombre, email y teléfono son requeridos' },
        { status: 400 }
      );
    }

    if (!relationship) {
      return NextResponse.json(
        { error: 'Relación es requerida' },
        { status: 400 }
      );
    }

    // Usar referrerId directamente si se proporcionó, si no buscar por nombre
    let referredById: number | null = referrerId ? parseInt(referrerId) : null;
    
    if (!referredById && referrerName && referrerName.trim()) {
      // Buscar usuario que coincida con el nombre
      const referrer = await prisma.usuario.findFirst({
        where: {
          nombre: { contains: referrerName.trim(), mode: 'insensitive' }
        },
        select: { id: true }
      });

      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Obtener organización del primer expositor
    let organizationId: number | null = null;
    if (firstExhibitorId) {
      const exhibitor = await prisma.usuario.findUnique({
        where: { id: parseInt(firstExhibitorId) },
        select: { organizationId: true }
      });
      organizationId = exhibitor?.organizationId || null;
    }

    // Generar fingerprint del dispositivo (simple)
    const deviceFingerprint = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear visitante
    const visitor = await prisma.expoVisitor.create({
      data: {
        token: generateUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        referredById,
        referralRelation: relationship,
        deviceFingerprint,
        organizationId
      }
    });

    return NextResponse.json({
      success: true,
      token: visitor.token,
      message: '¡Registro exitoso!'
    });

  } catch (error) {
    console.error('Error registrando visitante:', error);
    // Agregar más detalle del error
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error al registrar visitante', details: errorMessage },
      { status: 500 }
    );
  }
}
