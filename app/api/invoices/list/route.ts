/**
 * API para listar facturas pendientes y completadas (Admin)
 * GET /api/invoices/list
 * 
 * Combina facturas de:
 * - EventRegistration (eventos/talleres)
 * - RegistrationInvoiceRequest (registro a visiones)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo admins pueden ver lista de facturas
    if (session.user.rol !== 'ADMINISTRADOR' && session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Sin permisos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, PROCESSING, COMPLETED, ERROR
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Obtener organizationId si es SCHOOL_ADMIN
    let orgId: number | null = null;
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });
      orgId = admin?.organizationId || null;
    }

    // ============ FACTURAS DE EVENTOS (EventRegistration) ============
    const eventWhere: any = {
      requiresInvoice: true,
    };
    if (status) eventWhere.invoiceStatus = status;
    if (orgId) eventWhere.organizationId = orgId;

    const eventRegistrations = await prisma.eventRegistration.findMany({
      where: eventWhere,
      include: {
        SchoolProduct: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ============ FACTURAS DE VISIONES (RegistrationInvoiceRequest) ============
    const visionWhere: any = {};
    if (status) visionWhere.invoiceStatus = status;
    if (orgId) visionWhere.organizationId = orgId;

    const visionInvoices = await prisma.registrationInvoiceRequest.findMany({
      where: visionWhere,
      include: {
        Usuario: { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ============ COMBINAR Y FORMATEAR ============
    const allInvoices = [
      ...eventRegistrations.map(r => ({
        id: r.id,
        type: 'EVENT' as const,
        productId: r.productId,
        productName: r.SchoolProduct.name,
        customerName: r.nombre,
        customerEmail: r.email,
        rfc: r.invoiceRfc,
        legalName: r.invoiceName,
        amount: r.amountPaid,
        invoiceId: r.invoiceId,
        invoiceStatus: r.invoiceStatus || 'PENDING',
        invoicePdfUrl: r.invoicePdfUrl,
        invoiceXmlUrl: r.invoiceXmlUrl,
        invoiceError: r.invoiceError,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
      })),
      ...visionInvoices.map(r => ({
        id: r.id,
        type: 'VISION' as const,
        productId: r.visionId,
        productName: `Registro Visión ${r.visionId || 'N/A'}`,
        customerName: r.Usuario.nombre,
        customerEmail: r.Usuario.email,
        rfc: r.invoiceRfc,
        legalName: r.invoiceName,
        amount: r.amount,
        invoiceId: r.invoiceId,
        invoiceStatus: r.invoiceStatus || 'PENDING',
        invoicePdfUrl: r.invoicePdfUrl,
        invoiceXmlUrl: r.invoiceXmlUrl,
        invoiceError: r.invoiceError,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
      })),
    ];

    // Ordenar por fecha de creación descendente
    allInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginación
    const total = allInvoices.length;
    const paginatedInvoices = allInvoices.slice((page - 1) * limit, page * limit);

    // Contar por status (combinado)
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      ERROR: 0,
    };
    allInvoices.forEach(inv => {
      const s = inv.invoiceStatus || 'PENDING';
      if (statusCounts[s] !== undefined) statusCounts[s]++;
    });

    return NextResponse.json({
      success: true,
      data: {
        invoices: paginatedInvoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          pending: statusCounts['PENDING'] || 0,
          processing: statusCounts['PROCESSING'] || 0,
          completed: statusCounts['COMPLETED'] || 0,
          error: statusCounts['ERROR'] || 0,
        },
      },
    });
  } catch (error: any) {
    logger.error('❌ Error listando facturas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
