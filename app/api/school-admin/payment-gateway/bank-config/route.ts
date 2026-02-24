import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST - Guardar configuración bancaria para transferencias
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      bankName, 
      bankAccountClabe, 
      bankAccountHolder, 
      bankAccountNumber,
      transferWhatsappNumber 
    } = body;

    // Validar campos requeridos
    if (!bankName || !bankAccountClabe || !bankAccountHolder) {
      return NextResponse.json({ 
        error: 'Banco, CLABE y Beneficiario son requeridos' 
      }, { status: 400 });
    }

    // Validar CLABE (18 dígitos)
    if (bankAccountClabe && !/^\d{18}$/.test(bankAccountClabe.replace(/\s/g, ''))) {
      return NextResponse.json({ 
        error: 'La CLABE debe tener 18 dígitos' 
      }, { status: 400 });
    }

    // Obtener el organizationId del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    // Actualizar organización con datos bancarios
    const organization = await prisma.organization.update({
      where: { id: usuario.organizationId },
      data: {
        bankName,
        bankAccountClabe: bankAccountClabe.replace(/\s/g, ''),
        bankAccountHolder,
        bankAccountNumber: bankAccountNumber || null,
        transferWhatsappNumber: transferWhatsappNumber || null,
      },
      select: {
        id: true,
        bankName: true,
        bankAccountClabe: true,
        bankAccountHolder: true,
        bankAccountNumber: true,
        transferWhatsappNumber: true,
      },
    });

    logger.info(`Configuración bancaria actualizada para organización ${usuario.organizationId}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración bancaria guardada',
      bankConfig: {
        bankName: organization.bankName,
        bankAccountClabe: organization.bankAccountClabe,
        bankAccountHolder: organization.bankAccountHolder,
        bankAccountNumber: organization.bankAccountNumber,
        transferWhatsappNumber: organization.transferWhatsappNumber,
      },
    });
  } catch (error) {
    logger.error('Error saving bank config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
