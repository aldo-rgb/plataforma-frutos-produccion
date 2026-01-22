// API Route: Validar fotos del álbum cuántico
// Para staff y administradores

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PhotoStatus } from "@prisma/client";

// GET: Obtener fotos pendientes de validación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PhotoStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Verificar que es staff o admin
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isStaffOrAdmin = usuario?.roles.some(
      (r) =>
        r.role.nombre === "Admin" ||
        r.role.nombre === "Staff" ||
        r.role.nombre === "SuperAdmin"
    );

    if (!isStaffOrAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para validar fotos" },
        { status: 403 }
      );
    }

    // Construir where clause
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = PhotoStatus.PENDING_VALIDATION;
    }

    // Obtener fotos
    const [fotos, total] = await Promise.all([
      prisma.collectiblePhoto.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              nombreCompleto: true,
              fotoPerfilUrl: true,
              email: true,
            },
          },
          template: true,
          vision: {
            select: {
              id: true,
              nombre: true,
              product: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
        orderBy: { capturedAt: "asc" }, // FIFO
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.collectiblePhoto.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      fotos: fotos.map((f) => ({
        id: f.id,
        photoUrl: f.photoUrl,
        thumbnailUrl: f.thumbnailUrl,
        caption: f.caption,
        status: f.status,
        capturedAt: f.capturedAt,
        user: f.user,
        template: {
          id: f.template.id,
          slot: f.template.slot,
          title: f.template.title,
          description: f.template.description,
          category: f.template.category,
          emoji: f.template.emoji,
          points: f.template.points,
          validationRule: f.template.validationRule,
        },
        vision: f.vision,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: await prisma.collectiblePhoto.count({
          where: { status: PhotoStatus.PENDING_VALIDATION },
        }),
        validated: await prisma.collectiblePhoto.count({
          where: { status: PhotoStatus.VALIDATED },
        }),
        rejected: await prisma.collectiblePhoto.count({
          where: { status: PhotoStatus.REJECTED },
        }),
      },
    });
  } catch (error) {
    console.error("Error en GET /api/quantum-album/validate:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Validar o rechazar una foto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const validatorId = parseInt(session.user.id);
    const body = await request.json();
    const { photoId, action, rejectionReason } = body;

    if (!photoId || !action) {
      return NextResponse.json(
        { error: "photoId y action son requeridos" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action debe ser 'approve' o 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: "Se requiere razón de rechazo" },
        { status: 400 }
      );
    }

    // Verificar permisos
    const usuario = await prisma.usuario.findUnique({
      where: { id: validatorId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isStaffOrAdmin = usuario?.roles.some(
      (r) =>
        r.role.nombre === "Admin" ||
        r.role.nombre === "Staff" ||
        r.role.nombre === "SuperAdmin"
    );

    if (!isStaffOrAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para validar fotos" },
        { status: 403 }
      );
    }

    // Obtener la foto
    const foto = await prisma.collectiblePhoto.findUnique({
      where: { id: photoId },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            nombreCompleto: true,
          },
        },
      },
    });

    if (!foto) {
      return NextResponse.json(
        { error: "Foto no encontrada" },
        { status: 404 }
      );
    }

    if (foto.status !== PhotoStatus.PENDING_VALIDATION) {
      return NextResponse.json(
        { error: "Esta foto ya fue procesada" },
        { status: 400 }
      );
    }

    // Procesar validación
    if (action === "approve") {
      // Actualizar foto y asignar puntos
      const [fotoActualizada] = await prisma.$transaction([
        prisma.collectiblePhoto.update({
          where: { id: photoId },
          data: {
            status: PhotoStatus.VALIDATED,
            validatedAt: new Date(),
            validatedById: validatorId,
            pointsEarned: foto.template.points,
          },
        }),
        // Agregar puntos al usuario
        prisma.usuario.update({
          where: { id: foto.userId },
          data: {
            puntosCuanticos: {
              increment: foto.template.points,
            },
          },
        }),
        // Registrar la transacción de puntos
        prisma.puntosCuanticos.create({
          data: {
            usuarioId: foto.userId,
            cantidad: foto.template.points,
            concepto: `Foto validada: ${foto.template.title} (Slot ${foto.template.slot})`,
            tipo: "GANADOS",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        action: "approved",
        photo: {
          id: fotoActualizada.id,
          status: fotoActualizada.status,
          pointsEarned: foto.template.points,
        },
        message: `Foto aprobada. +${foto.template.points} PC para ${foto.user.nombreCompleto}`,
      });
    } else {
      // Rechazar foto
      const fotoRechazada = await prisma.collectiblePhoto.update({
        where: { id: photoId },
        data: {
          status: PhotoStatus.REJECTED,
          rejectionReason,
          validatedAt: new Date(),
          validatedById: validatorId,
        },
      });

      return NextResponse.json({
        success: true,
        action: "rejected",
        photo: {
          id: fotoRechazada.id,
          status: fotoRechazada.status,
          rejectionReason,
        },
        message: "Foto rechazada. El usuario puede intentar nuevamente.",
      });
    }
  } catch (error) {
    console.error("Error en POST /api/quantum-album/validate:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT: Validación masiva
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const validatorId = parseInt(session.user.id);
    const body = await request.json();
    const { photoIds, action } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de photoIds" },
        { status: 400 }
      );
    }

    if (action !== "approve") {
      return NextResponse.json(
        { error: "La validación masiva solo permite 'approve'" },
        { status: 400 }
      );
    }

    // Verificar permisos
    const usuario = await prisma.usuario.findUnique({
      where: { id: validatorId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isStaffOrAdmin = usuario?.roles.some(
      (r) =>
        r.role.nombre === "Admin" ||
        r.role.nombre === "Staff" ||
        r.role.nombre === "SuperAdmin"
    );

    if (!isStaffOrAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para validar fotos" },
        { status: 403 }
      );
    }

    // Obtener las fotos
    const fotos = await prisma.collectiblePhoto.findMany({
      where: {
        id: { in: photoIds },
        status: PhotoStatus.PENDING_VALIDATION,
      },
      include: {
        template: true,
      },
    });

    if (fotos.length === 0) {
      return NextResponse.json(
        { error: "No hay fotos pendientes para validar" },
        { status: 400 }
      );
    }

    // Agrupar por usuario para sumar puntos
    const puntosPorUsuario = new Map<number, number>();
    for (const foto of fotos) {
      const actual = puntosPorUsuario.get(foto.userId) || 0;
      puntosPorUsuario.set(foto.userId, actual + foto.template.points);
    }

    // Ejecutar transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar todas las fotos
      await tx.collectiblePhoto.updateMany({
        where: { id: { in: fotos.map((f) => f.id) } },
        data: {
          status: PhotoStatus.VALIDATED,
          validatedAt: new Date(),
          validatedById: validatorId,
        },
      });

      // Actualizar puntos de cada foto individualmente (para pointsEarned)
      for (const foto of fotos) {
        await tx.collectiblePhoto.update({
          where: { id: foto.id },
          data: {
            pointsEarned: foto.template.points,
          },
        });
      }

      // Actualizar puntos de usuarios y crear registros
      for (const [userId, puntos] of puntosPorUsuario) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            puntosCuanticos: {
              increment: puntos,
            },
          },
        });

        await tx.puntosCuanticos.create({
          data: {
            usuarioId: userId,
            cantidad: puntos,
            concepto: `Validación masiva de ${fotos.filter((f) => f.userId === userId).length} fotos del álbum`,
            tipo: "GANADOS",
          },
        });
      }
    });

    const totalPuntos = Array.from(puntosPorUsuario.values()).reduce(
      (a, b) => a + b,
      0
    );

    return NextResponse.json({
      success: true,
      processed: fotos.length,
      usersAffected: puntosPorUsuario.size,
      totalPointsAwarded: totalPuntos,
      message: `${fotos.length} fotos aprobadas. ${totalPuntos} PC distribuidos entre ${puntosPorUsuario.size} usuarios.`,
    });
  } catch (error) {
    console.error("Error en PUT /api/quantum-album/validate:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
