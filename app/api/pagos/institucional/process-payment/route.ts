import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentMethod, paymentId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID requerido' },
        { status: 400 }
      );
    }

    // Obtener la orden
    const order = await prisma.institutionalOrder.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        Usuario: true,
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden no haya sido procesada
    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'La orden ya fue procesada' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la organización
      const organization = await tx.organization.create({
        data: {
          name: order.nombreOrganizacion,
          slug: order.nombreOrganizacion.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          logoUrl: order.logoUrl,
          brandColor: '#9333ea',
          contactEmail: order.Usuario.email,
          status: 'ACTIVE',
          isGeofenced: !!order.geofencing,
          geofenceRadius: order.geofencing ? 1000 : 100,
          schoolAdminId: order.userId,
          totalLicenses: order.cantidadLicencias,
          activeLicenses: order.cantidadLicencias,
          updatedAt: new Date(),
        }
      });

      // 2. Actualizar el usuario que hizo la compra a SCHOOL_ADMIN (Director)
      await tx.usuario.update({
        where: { id: order.userId },
        data: {
          rol: 'SCHOOL_ADMIN',
          subscriptionPlan: 'SCHOOL_LICENSE',
          organizationId: organization.id,
        }
      });

      // 3. Crear las licencias
      const licenses = [];
      for (let i = 0; i < order.cantidadLicencias; i++) {
        licenses.push({
          organizationId: organization.id,
          code: generateLicenseCode(organization.id, i + 1),
          isActive: true,
          maxUses: 1,
          updatedAt: new Date(),
        });
      }

      await tx.license.createMany({
        data: licenses,
      });

      // 4. Actualizar la orden como completada
      await tx.institutionalOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          paymentId: paymentId || 'simulated-payment',
          processedAt: new Date(),
          organizationId: organization.id,
        }
      });

      // 5. Registrar el pago
      await tx.payment.create({
        data: {
          userId: order.userId,
          organizationId: organization.id,
          amount: order.totalAmount,
          currency: 'MXN',
          status: 'COMPLETED',
          paymentMethod: order.paymentMethod,
          paymentId: paymentId || 'simulated-payment',
          description: `Plan Institucional - ${order.nombreOrganizacion} - ${order.cantidadLicencias} licencias`,
          metadata: {
            orderId: order.id,
            cantidadLicencias: order.cantidadLicencias,
          },
          isSchoolPayment: true,
        }
      });

      return {
        organization,
      };
    });

    // Enviar email al director confirmando la compra
    await sendDirectorConfirmationEmail(
      order.Usuario.email,
      order.nombreOrganizacion,
      order.cantidadLicencias
    );

    return NextResponse.json({
      success: true,
      organizationId: result.organization.id,
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}

// Función para generar contraseña temporal
function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Función para generar código de licencia
function generateLicenseCode(orgId: number, index: number): string {
  const prefix = 'STD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const orgCode = orgId.toString(36).toUpperCase().padStart(4, '0');
  const indexCode = index.toString(36).toUpperCase().padStart(4, '0');
  return `${prefix}-${orgCode}-${timestamp}-${indexCode}`;
}

// Función para enviar email al coordinador
async function sendCoordinadorWelcomeEmail(email: string, tempPassword: string, organizationName: string) {
  // Integración con servicio de email (Resend, SendGrid, etc.)
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `Bienvenido a ${organizationName} - Plataforma Quantum`,
        template: 'coordinador-welcome',
        data: {
          organizationName,
          email,
          tempPassword,
          loginUrl: `${process.env.NEXTAUTH_URL}/login`,
        }
      }),
    });

    if (!response.ok) {
      console.error('Error sending coordinator email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Función para enviar email al director
async function sendDirectorConfirmationEmail(email: string, organizationName: string, licenseCount: number) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `Confirmación de compra - ${organizationName}`,
        template: 'director-confirmation',
        data: {
          organizationName,
          licenseCount,
          dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
        }
      }),
    });

    if (!response.ok) {
      console.error('Error sending director email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
