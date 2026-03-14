/**
 * API para reintentar generación de factura
 * POST /api/invoices/retry
 * 
 * Body:
 * - registrationId: ID del registro de evento (EventRegistration)
 * - invoiceRequestId: ID de la solicitud de factura de visión (RegistrationInvoiceRequest)
 * - type: 'EVENT' | 'VISION'
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
    const { registrationId, invoiceRequestId, type = 'EVENT' } = body;

    if (!registrationId && !invoiceRequestId) {
      return NextResponse.json(
        { success: false, error: 'registrationId o invoiceRequestId es requerido' },
        { status: 400 }
      );
    }

    // Variables para la factura
    let invoiceParams: {
      id: number;
      organizationId: number;
      rfc: string;
      legalName: string;
      taxSystem: string;
      zipCode: string;
      cfdiUse: string;
      productName: string;
      amount: number;
      email: string;
      paymentProvider: string;
    };
    let updateModel: 'eventRegistration' | 'registrationInvoiceRequest';

    if (type === 'VISION' || invoiceRequestId) {
      // Factura de visión (RegistrationInvoiceRequest)
      const invoiceRequest = await prisma.registrationInvoiceRequest.findUnique({
        where: { id: parseInt(invoiceRequestId || registrationId) },
        include: {
          Usuario: { select: { email: true, nombre: true } },
        },
      });

      if (!invoiceRequest) {
        return NextResponse.json(
          { success: false, error: 'Solicitud de factura no encontrada' },
          { status: 404 }
        );
      }

      // Verificar permisos de organización
      if (session.user.rol === 'SCHOOL_ADMIN') {
        const admin = await prisma.usuario.findUnique({
          where: { id: parseInt(session.user.id) },
          select: { organizationId: true },
        });
        if (admin?.organizationId !== invoiceRequest.organizationId) {
          return NextResponse.json(
            { success: false, error: 'Sin acceso a este registro' },
            { status: 403 }
          );
        }
      }

      if (invoiceRequest.invoiceStatus === 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'La factura ya fue generada exitosamente' },
          { status: 400 }
        );
      }

      invoiceParams = {
        id: invoiceRequest.id,
        organizationId: invoiceRequest.organizationId,
        rfc: invoiceRequest.invoiceRfc,
        legalName: invoiceRequest.invoiceName,
        taxSystem: invoiceRequest.invoiceRegime,
        zipCode: invoiceRequest.invoiceZipCode,
        cfdiUse: invoiceRequest.invoiceCfdiUse || 'G03',
        productName: `Registro Visión ${invoiceRequest.visionId || ''}`,
        amount: Number(invoiceRequest.amount) || 0,
        email: invoiceRequest.Usuario.email,
        paymentProvider: invoiceRequest.paymentProvider || 'stripe',
      };
      updateModel = 'registrationInvoiceRequest';

      // Marcar como procesando
      await prisma.registrationInvoiceRequest.update({
        where: { id: invoiceRequest.id },
        data: { invoiceStatus: 'PROCESSING', invoiceError: null },
      });
    } else {
      // Factura de evento (EventRegistration)
      const registration = await prisma.eventRegistration.findUnique({
        where: { id: parseInt(registrationId) },
        include: {
          SchoolProduct: { select: { id: true, name: true, organizationId: true } },
        },
      });

      if (!registration) {
        return NextResponse.json(
          { success: false, error: 'Registro no encontrado' },
          { status: 404 }
        );
      }

      // Verificar permisos de organización
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

      if (!registration.requiresInvoice) {
        return NextResponse.json(
          { success: false, error: 'Este registro no requiere factura' },
          { status: 400 }
        );
      }

      if (registration.invoiceStatus === 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'La factura ya fue generada exitosamente' },
          { status: 400 }
        );
      }

      if (!registration.invoiceRfc || !registration.invoiceName || 
          !registration.invoiceZipCode || !registration.invoiceRegime) {
        return NextResponse.json(
          { success: false, error: 'Faltan datos de facturación' },
          { status: 400 }
        );
      }

      invoiceParams = {
        id: registration.id,
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
      };
      updateModel = 'eventRegistration';

      // Marcar como procesando
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { invoiceStatus: 'PROCESSING', invoiceError: null },
      });
    }

    logger.info('🔄 Reintentando generación de factura:', {
      id: invoiceParams.id,
      type: updateModel,
    });

    // Generar la factura
    const result = await createEventInvoice({
      registrationId: invoiceParams.id,
      organizationId: invoiceParams.organizationId,
      rfc: invoiceParams.rfc,
      legalName: invoiceParams.legalName,
      taxSystem: invoiceParams.taxSystem,
      zipCode: invoiceParams.zipCode,
      cfdiUse: invoiceParams.cfdiUse,
      productName: invoiceParams.productName,
      amount: invoiceParams.amount,
      email: invoiceParams.email,
      paymentProvider: invoiceParams.paymentProvider,
    });

    // Actualizar el registro correspondiente
    if (result.success) {
      if (updateModel === 'eventRegistration') {
        await prisma.eventRegistration.update({
          where: { id: invoiceParams.id },
          data: {
            invoiceId: result.invoiceId,
            invoiceStatus: 'COMPLETED',
            invoicePdfUrl: result.pdfUrl,
            invoiceXmlUrl: result.xmlUrl,
            invoiceError: null,
          },
        });
      } else {
        await prisma.registrationInvoiceRequest.update({
          where: { id: invoiceParams.id },
          data: {
            invoiceId: result.invoiceId,
            invoiceStatus: 'COMPLETED',
            invoicePdfUrl: result.pdfUrl,
            invoiceXmlUrl: result.xmlUrl,
            invoiceError: null,
          },
        });
      }

      logger.info('✅ Factura regenerada exitosamente:', {
        id: invoiceParams.id,
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
      if (updateModel === 'eventRegistration') {
        await prisma.eventRegistration.update({
          where: { id: invoiceParams.id },
          data: { invoiceStatus: 'ERROR', invoiceError: result.error },
        });
      } else {
        await prisma.registrationInvoiceRequest.update({
          where: { id: invoiceParams.id },
          data: { invoiceStatus: 'ERROR', invoiceError: result.error },
        });
      }

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
