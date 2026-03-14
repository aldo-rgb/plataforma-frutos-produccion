/**
 * API para generar facturas de registros de eventos
 * POST /api/invoices/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createEventInvoice, validateRFC, validateZipCode } from '@/lib/facturapi';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Permitir acceso sin sesión para generación automática post-pago
    // o con sesión para regeneración manual
    
    const body = await request.json();
    const { registrationId, manual = false } = body;

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

    // Si es manual, verificar permisos
    if (manual && session) {
      const isAdmin = session.user.rol === 'ADMINISTRADOR' || session.user.rol === 'SCHOOL_ADMIN';
      const isOwner = registration.email === session.user.email;
      
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { success: false, error: 'No tienes permiso para generar esta factura' },
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

    // Verificar que ya esté pagado
    if (registration.status === 'PENDING_PAYMENT') {
      return NextResponse.json(
        { success: false, error: 'El registro aún no ha sido pagado' },
        { status: 400 }
      );
    }

    // Verificar que no tenga ya una factura válida
    if (registration.invoiceId && registration.invoiceStatus === 'COMPLETED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ya existe una factura para este registro',
          invoiceId: registration.invoiceId,
          pdfUrl: registration.invoicePdfUrl,
          xmlUrl: registration.invoiceXmlUrl,
        },
        { status: 400 }
      );
    }

    // Validar datos de facturación
    if (!registration.invoiceRfc || !registration.invoiceName || 
        !registration.invoiceZipCode || !registration.invoiceRegime) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos de facturación (RFC, nombre, CP o régimen)' },
        { status: 400 }
      );
    }

    // Validar RFC
    const rfcValidation = validateRFC(registration.invoiceRfc);
    if (!rfcValidation.valid) {
      return NextResponse.json(
        { success: false, error: rfcValidation.error },
        { status: 400 }
      );
    }

    // Validar código postal
    if (!validateZipCode(registration.invoiceZipCode)) {
      return NextResponse.json(
        { success: false, error: 'Código postal inválido. Debe ser de 5 dígitos.' },
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
      // Actualizar registro con datos de factura
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

      logger.info('✅ Factura generada exitosamente:', {
        registrationId: registration.id,
        invoiceId: result.invoiceId,
        uuid: result.uuid,
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
      // Guardar error
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          invoiceStatus: 'ERROR',
          invoiceError: result.error,
        },
      });

      logger.error('❌ Error generando factura:', {
        registrationId: registration.id,
        error: result.error,
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('❌ Error en API de facturación:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
