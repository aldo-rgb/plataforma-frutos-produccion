import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener solicitudes de cambio pendientes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        pendingOrganizationChange: true,
        newOrganizationId: true,
        newVisionId: true,
        previousOrganizationId: true,
        changeRequestedAt: true,
        changeRequestedBy: true,
      },
    });

    if (!usuario || !usuario.pendingOrganizationChange) {
      return NextResponse.json({ success: true, hasPendingChange: false });
    }

    // Obtener información de las organizaciones y visión
    const [previousOrg, newOrg, newVision, requestedBy] = await Promise.all([
      usuario.previousOrganizationId
        ? prisma.organization.findUnique({
            where: { id: usuario.previousOrganizationId },
            select: { name: true, logoUrl: true },
          })
        : null,
      usuario.newOrganizationId
        ? prisma.organization.findUnique({
            where: { id: usuario.newOrganizationId },
            select: { name: true, logoUrl: true },
          })
        : null,
      usuario.newVisionId
        ? prisma.vision.findUnique({
            where: { id: usuario.newVisionId },
            select: { nombre: true, descripcion: true },
          })
        : null,
      usuario.changeRequestedBy
        ? prisma.usuario.findUnique({
            where: { id: usuario.changeRequestedBy },
            select: { nombre: true, email: true },
          })
        : null,
    ]);

    return NextResponse.json({
      success: true,
      hasPendingChange: true,
      changeRequest: {
        previousOrganization: previousOrg,
        newOrganization: newOrg,
        newVision: newVision,
        requestedBy: requestedBy,
        requestedAt: usuario.changeRequestedAt,
      },
    });
  } catch (error) {
    console.error('Error al obtener solicitud de cambio:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// POST - Aceptar o rechazar cambio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { action } = await request.json(); // 'accept' o 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Acción inválida' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        pendingOrganizationChange: true,
        newOrganizationId: true,
        newVisionId: true,
        previousOrganizationId: true,
        changeRequestedBy: true,
      },
    });

    if (!usuario || !usuario.pendingOrganizationChange) {
      return NextResponse.json({ success: false, error: 'No hay cambio pendiente' }, { status: 400 });
    }

    if (action === 'accept') {
      // ACEPTAR: Mover a nueva organización y visión
      await prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          organizationId: usuario.newOrganizationId,
          pendingOrganizationChange: false,
          newOrganizationId: null,
          newVisionId: null,
          previousOrganizationId: null,
          changeRequestedAt: null,
          changeRequestedBy: null,
          isActive: true, // Reactivar
        },
      });

      // Agregar a la nueva visión
      if (usuario.newVisionId) {
        const alreadyInVision = await prisma.visionParticipante.findFirst({
          where: {
            visionId: usuario.newVisionId,
            participanteId: session.user.id,
          },
        });

        if (!alreadyInVision) {
          await prisma.visionParticipante.create({
            data: {
              visionId: usuario.newVisionId,
              participanteId: session.user.id,
            },
          });
        }
      }

      // Notificar al director anterior (si existe)
      if (usuario.previousOrganizationId) {
        const [oldOrg, newOrg, participante] = await Promise.all([
          prisma.organization.findUnique({
            where: { id: usuario.previousOrganizationId },
            select: { schoolAdminId: true, name: true },
          }),
          prisma.organization.findUnique({
            where: { id: usuario.newOrganizationId! },
            select: { name: true },
          }),
          prisma.usuario.findUnique({
            where: { id: session.user.id },
            select: { nombre: true, email: true },
          }),
        ]);

        if (oldOrg?.schoolAdminId && newOrg && participante) {
          // Crear notificación para el director anterior
          try {
            await prisma.notification.create({
              data: {
                userId: oldOrg.schoolAdminId,
                type: 'ORGANIZATION_TRANSFER',
                title: 'Transferencia de participante',
                message: `${participante.nombre} (${participante.email}) ha aceptado transferirse de ${oldOrg.name} a ${newOrg.name}`,
                relatedId: session.user.id,
              },
            });
          } catch (notifError) {
            // Si falla la notificación, solo lo registramos pero no fallar la transferencia
            console.error('Error al crear notificación:', notifError);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Cambio aceptado. Has sido transferido a la nueva organización.',
      });
    } else {
      // RECHAZAR: Restaurar a organización anterior
      await prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          pendingOrganizationChange: false,
          newOrganizationId: null,
          newVisionId: null,
          previousOrganizationId: null,
          changeRequestedAt: null,
          changeRequestedBy: null,
          isActive: true, // Reactivar
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Cambio rechazado. Permaneces en tu organización actual.',
      });
    }
  } catch (error) {
    console.error('Error al procesar cambio:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
