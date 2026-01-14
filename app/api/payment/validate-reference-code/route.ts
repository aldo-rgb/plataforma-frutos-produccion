import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/payment/validate-reference-code
// Valida un código de referencia para pago de Avanzado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { code, option, amount } = await request.json();

    if (!code || !option || !amount) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;

    // Obtener información del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { 
        AdvancedPreRegistrations: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario ya tiene un pago registrado para Avanzado
    const existingPayment = await prisma.advancedPreRegistration.findFirst({
      where: {
        userId: userId,
        status: 'PAID'
      }
    });

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Ya tienes un pago registrado para el Avanzado' },
        { status: 400 }
      );
    }

    // Verificar el código de referencia
    const validCode = await validateReferenceCode(code, amount, user.organizationId);

    if (!validCode.isValid) {
      return NextResponse.json(
        { success: false, error: validCode.error || 'Código inválido' },
        { status: 400 }
      );
    }

    // Determinar el tipo de inscripción basado en la opción seleccionada
    let paymentMethodDescription = 'REFERENCE_CODE';

    switch (option) {
      case 'advanced_promo':
        paymentMethodDescription = 'REFERENCE_CODE - PROMO';
        break;
      case 'advanced_regular':
        paymentMethodDescription = 'REFERENCE_CODE - REGULAR';
        break;
      case 'combo_full':
        paymentMethodDescription = 'REFERENCE_CODE - COMBO_FULL';
        break;
      case 'combo_deposit':
        paymentMethodDescription = 'REFERENCE_CODE - COMBO_DEPOSIT';
        break;
    }

    // Actualizar pre-registro existente si hay uno
    const preRegistration = user.AdvancedPreRegistrations[0];

    if (preRegistration) {
      await prisma.advancedPreRegistration.update({
        where: { id: preRegistration.id },
        data: {
          status: 'PAID',
          paymentAmount: amount,
          paymentMethod: paymentMethodDescription,
          transactionId: `REF-${code}-${Date.now()}`,
          paidAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: '¡Pago confirmado exitosamente!',
        registrationType: option
      });
    }

    // Si no hay pre-registro, el usuario debe tener uno para poder pagar
    // (Deben haber sido "declarados" primero)
    return NextResponse.json(
      { success: false, error: 'No tienes una pre-inscripción activa. Contacta a tu coordinador.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[validate-reference-code] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}

// Función para validar códigos de referencia
async function validateReferenceCode(
  code: string, 
  amount: number, 
  organizationId: number | null
): Promise<{ isValid: boolean; error?: string }> {
  // Normalizar código
  const normalizedCode = code.toUpperCase().trim();

  // Validación básica:
  // - Los códigos deben ser alfanuméricos
  // - Mínimo 6 caracteres
  // - Máximo 12 caracteres

  if (!/^[A-Z0-9]{6,12}$/.test(normalizedCode)) {
    return { isValid: false, error: 'Formato de código inválido' };
  }

  // Verificar si el código ya fue usado
  const usedCode = await prisma.advancedPreRegistration.findFirst({
    where: {
      transactionId: {
        contains: normalizedCode
      },
      status: 'PAID'
    }
  });

  if (usedCode) {
    return { isValid: false, error: 'Este código ya fue utilizado' };
  }

  // Por ahora, aceptamos códigos con formato válido
  // La validación real se hará cuando se implemente el sistema completo de códigos
  return { isValid: true };
}
