import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET - Descargar factura (PDF o XML) de Facturapi
 * Query params:
 * - registrationId: ID del registro de evento
 * - invoiceRequestId: ID de la solicitud de factura de visión
 * - type: 'pdf' o 'xml'
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');
    const invoiceRequestId = searchParams.get('invoiceRequestId');
    const type = searchParams.get('type') || 'pdf';

    if (!registrationId && !invoiceRequestId) {
      return NextResponse.json(
        { success: false, error: 'registrationId o invoiceRequestId es requerido' },
        { status: 400 }
      );
    }

    let invoiceId: string | null = null;
    let organizationId: number;
    let ownerEmail: string;

    // Determinar tipo de factura y obtener datos
    if (registrationId) {
      // Factura de evento (EventRegistration)
      const registration = await prisma.eventRegistration.findUnique({
        where: { id: parseInt(registrationId) },
        select: {
          id: true,
          invoiceId: true,
          invoiceStatus: true,
          organizationId: true,
          email: true,
        },
      });

      if (!registration) {
        return NextResponse.json(
          { success: false, error: 'Registro de evento no encontrado' },
          { status: 404 }
        );
      }

      if (!registration.invoiceId || registration.invoiceStatus !== 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'La factura no está completada' },
          { status: 400 }
        );
      }

      invoiceId = registration.invoiceId;
      organizationId = registration.organizationId;
      ownerEmail = registration.email;
    } else {
      // Factura de visión (RegistrationInvoiceRequest)
      const invoiceRequest = await prisma.registrationInvoiceRequest.findUnique({
        where: { id: parseInt(invoiceRequestId!) },
        include: {
          Usuario: { select: { email: true } },
        },
      });

      if (!invoiceRequest) {
        return NextResponse.json(
          { success: false, error: 'Solicitud de factura no encontrada' },
          { status: 404 }
        );
      }

      if (!invoiceRequest.invoiceId || invoiceRequest.invoiceStatus !== 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'La factura no está completada' },
          { status: 400 }
        );
      }

      invoiceId = invoiceRequest.invoiceId;
      organizationId = invoiceRequest.organizationId;
      ownerEmail = invoiceRequest.Usuario.email;
    }

    // Verificar permisos: debe ser admin de la org o el usuario dueño del registro
    const isAdmin = session.user.rol === 'SCHOOL_ADMIN' || session.user.rol === 'ADMINISTRADOR';
    const isOwner = session.user.email?.toLowerCase() === ownerEmail.toLowerCase();
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para descargar esta factura' },
        { status: 403 }
      );
    }

    // Obtener configuración de Facturapi de la organización
    const facturapiConfig = await prisma.facturapiConfig.findUnique({
      where: { organizationId },
    });

    if (!facturapiConfig || !facturapiConfig.apiKey) {
      return NextResponse.json(
        { success: false, error: 'Facturapi no está configurado para esta organización' },
        { status: 400 }
      );
    }

    // Hacer request a Facturapi para obtener el archivo
    const endpoint = type === 'xml' ? 'xml' : 'pdf';
    const facturapiUrl = `https://www.facturapi.io/v2/invoices/${invoiceId}/${endpoint}`;

    const response = await fetch(facturapiUrl, {
      headers: {
        'Authorization': `Bearer ${facturapiConfig.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Facturapi:', errorText);
      return NextResponse.json(
        { success: false, error: 'Error al obtener el archivo de Facturapi' },
        { status: 500 }
      );
    }

    // Obtener el archivo como buffer
    const fileBuffer = await response.arrayBuffer();
    
    // Determinar content type y nombre de archivo
    const contentType = type === 'xml' ? 'application/xml' : 'application/pdf';
    const extension = type === 'xml' ? 'xml' : 'pdf';
    const filename = `factura-${invoiceId}.${extension}`;

    // Devolver el archivo
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error descargando factura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
