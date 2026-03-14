/**
 * API para listar facturas pendientes y completadas (Admin)
 * GET /api/invoices/list
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
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Construir filtro
    const where: any = {
      requiresInvoice: true,
    };

    if (status) {
      where.invoiceStatus = status;
    }

    if (productId) {
      where.productId = parseInt(productId);
    }

    // Si es SCHOOL_ADMIN, filtrar por su organización
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });

      if (admin?.organizationId) {
        where.organizationId = admin.organizationId;
      }
    }

    // Obtener registros con paginación
    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        include: {
          SchoolProduct: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    // Contar por status
    const stats = await prisma.eventRegistration.groupBy({
      by: ['invoiceStatus'],
      where: {
        requiresInvoice: true,
        ...(session.user.rol === 'SCHOOL_ADMIN' && where.organizationId 
          ? { organizationId: where.organizationId } 
          : {}
        ),
      },
      _count: true,
    });

    const statusCounts = stats.reduce((acc, item) => {
      acc[item.invoiceStatus || 'PENDING'] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        invoices: registrations.map(r => ({
          id: r.id,
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
