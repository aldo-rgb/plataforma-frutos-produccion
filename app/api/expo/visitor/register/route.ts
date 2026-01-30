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

    // Buscar referidor si se proporcionó nombre
    let referredById: number | null = null;
    if (referrerName && referrerName.trim()) {
      const searchTerms: string[] = referrerName.trim().toLowerCase().split(' ');
      
      // Buscar usuario que coincida
      const referrer = await prisma.usuario.findFirst({
        where: {
          AND: searchTerms.map((term: string) => ({
            OR: [
              { nombre: { contains: term, mode: 'insensitive' as const } },
              { apellido: { contains: term, mode: 'insensitive' as const } }
            ]
          }))
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
    return NextResponse.json(
      { error: 'Error al registrar visitante' },
      { status: 500 }
    );
  }
}
