import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    const result: { emailExists: boolean; phoneExists: boolean } = {
      emailExists: false,
      phoneExists: false
    };

    // Verificar si el email ya existe
    if (email && email.trim()) {
      const existingEmail = await prisma.usuario.findFirst({
        where: { 
          email: email.toLowerCase().trim() 
        },
        select: { id: true }
      });
      result.emailExists = !!existingEmail;
    }

    // Verificar si el teléfono ya existe
    if (phone && phone.trim()) {
      // Limpiar el teléfono de caracteres especiales para comparar
      const cleanPhone = phone.replace(/\D/g, '');
      
      if (cleanPhone.length >= 10) {
        const existingPhone = await prisma.usuario.findFirst({
          where: { 
            OR: [
              { telefono: cleanPhone },
              { telefono: phone.trim() },
              // Buscar también con los últimos 10 dígitos
              { telefono: { endsWith: cleanPhone.slice(-10) } }
            ]
          },
          select: { id: true }
        });
        result.phoneExists = !!existingPhone;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking existence:', error);
    return NextResponse.json(
      { error: 'Error al verificar datos' },
      { status: 500 }
    );
  }
}
