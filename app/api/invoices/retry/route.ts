/**
 * API para reintentar generación de factura
 * POST /api/invoices/retry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createEventInvoice } from '@/lib/facturapi';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo admins pueden reintentar facturas
    if (session.user.rol !== 'ADMINISTRADOR' && session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Sin permisos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'registrationId es requerido' },
        { status: 400 }
      );
    }

    // Obtener el registro
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: parseInt(registrationId) },
      include: {
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos de organización para SCHOOL_ADMIN
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });

      if (admin?.organizationId !== registration.SchoolProduct.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a este registro' },
          { status: 403 }
        );
      }
    }

    // Verificar que requiere factura
    if (!registration.requiresInvoice) {
      return NextResponse.json(
        { success: false, error: 'Este registro no requiere factura' },
        { status: 400 }
      );
    }

    // Solo permitir reintento si hay error o está pendiente
    if (registration.invoiceStatus === 'COMPLETED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La factura ya fue generada exitosamente',
          invoiceId: registration.invoiceId,
        },
        { status: 400 }
      );
    }

    // Validar datos mínimos
    if (!registration.invoiceRfc || !registration.invoiceName || 
        !registration.invoiceZipCode || !registration.invoiceRegime) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos de facturación' },
        { status: 400 }
      );
    }

    // Marcar como procesando
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        invoiceStatus: 'PROCESSING',
        invoiceError: null,
      },
    });

    logger.info('🔄 Reintentando generación de factura:', {
      registrationId: registration.id,
      previousStatus: registration.invoiceStatus,
      previousError: registration.invoiceError,
    });

    // Generar la factura
    const result = await createEventInvoice({
      registrationId: registration.id,
      organizationId: registration.organizationId,
      rfc: registration.invoiceRfc,
      legalName: registration.invoiceName,
      taxSystem: registration.invoiceRegime,
      zipCode: registration.invoiceZipCode,
      cfdiUse: registration.invoiceCfdiUse || 'G03',
      productName: registration.SchoolProduct.name,
      amount: Number(registration.amountPaid) || 0,
      email: registration.email,
      paymentProvider: registration.paymentProvider || 'stripe',
    });

    if (result.success) {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          invoiceId: result.invoiceId,
          invoiceStatus: 'COMPLETED',
          invoicePdfUrl: result.pdfUrl,
          invoiceXmlUrl: result.xmlUrl,
          invoiceError: null,
        },
      });

      logger.info('✅ Factura regenerada exitosamente:', {
        registrationId: registration.id,
        invoiceId: result.invoiceId,
      });

      return NextResponse.json({
        success: true,
        message: 'Factura generada exitosamente',
        data: {
          invoiceId: result.invoiceId,
          uuid: result.uuid,
          pdfUrl: result.pdfUrl,
          xmlUrl: result.xmlUrl,
        },
      });
    } else {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          invoiceStatus: 'ERROR',
          invoiceError: result.error,
        },
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('❌ Error reintentando factura:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
