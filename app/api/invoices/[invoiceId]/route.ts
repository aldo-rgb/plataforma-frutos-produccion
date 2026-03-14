/**
 * API para obtener/descargar facturas
 * GET /api/invoices/[invoiceId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { facturapi } from '@/lib/facturapi';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'invoiceId es requerido' },
        { status: 400 }
      );
    }

    // Buscar el registro que tiene esta factura
    const registration = await prisma.eventRegistration.findFirst({
      where: { invoiceId },
      include: {
        SchoolProduct: {
          select: {
            name: true,
            organizationId: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos si hay sesión
    if (session) {
      const isAdmin = session.user.rol === 'ADMINISTRADOR' || session.user.rol === 'SCHOOL_ADMIN';
      const isOwner = registration.email === session.user.email;
      
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { success: false, error: 'No tienes permiso para ver esta factura' },
          { status: 403 }
        );
      }
    }

    // Verificar qué formato quieren
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    if (format === 'pdf') {
      // Redirigir al PDF
      if (registration.invoicePdfUrl) {
        return NextResponse.redirect(registration.invoicePdfUrl);
      }
      const pdfUrl = await facturapi.downloadPdf(invoiceId);
      return NextResponse.redirect(pdfUrl);
    }

    if (format === 'xml') {
      // Redirigir al XML
      if (registration.invoiceXmlUrl) {
        return NextResponse.redirect(registration.invoiceXmlUrl);
      }
      const xmlUrl = await facturapi.downloadXml(invoiceId);
      return NextResponse.redirect(xmlUrl);
    }

    // Retornar datos JSON
    return NextResponse.json({
      success: true,
      data: {
        invoiceId: registration.invoiceId,
        status: registration.invoiceStatus,
        pdfUrl: registration.invoicePdfUrl,
        xmlUrl: registration.invoiceXmlUrl,
        rfc: registration.invoiceRfc,
        legalName: registration.invoiceName,
        amount: registration.amountPaid,
        productName: registration.SchoolProduct.name,
        createdAt: registration.paidAt,
      },
    });
  } catch (error: any) {
    logger.error('❌ Error obteniendo factura:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
