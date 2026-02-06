// API Route: Quantum Album
// Álbum de 50 fotos coleccionables del usuario

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PhotoCategory, PhotoStatus, TrainingLevel } from "@prisma/client";
import logger from '@/lib/logger';

// GET: Obtener álbum del usuario con todas las fotos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as PhotoCategory | null;

    // Obtener usuario y su nivel de entrenamiento más alto
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        visionesInscritas: {
          where: {
            status: { in: ["COMPLETED", "IN_PROGRESS"] },
          },
          include: {
            vision: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Determinar nivel más alto de entrenamiento completado
    let highestLevel: TrainingLevel = TrainingLevel.BASIC;
    for (const inscripcion of usuario.visionesInscritas) {
      const productName = inscripcion.vision.product.nombre.toLowerCase();
      if (productName.includes("pl") || productName.includes("líder")) {
        highestLevel = TrainingLevel.PL;
        break;
      } else if (
        productName.includes("avanzado") &&
        highestLevel !== TrainingLevel.PL
      ) {
        highestLevel = TrainingLevel.ADVANCED;
      }
    }

    // Obtener todas las plantillas disponibles para el nivel del usuario
    const plantillasWhere: any = {
      isActive: true,
      OR: [
        { requiredLevel: TrainingLevel.BASIC },
        ...(highestLevel === TrainingLevel.ADVANCED
          ? [{ requiredLevel: TrainingLevel.ADVANCED }]
          : []),
        ...(highestLevel === TrainingLevel.PL
          ? [
              { requiredLevel: TrainingLevel.ADVANCED },
              { requiredLevel: TrainingLevel.PL },
            ]
          : []),
      ],
    };

    if (category) {
      plantillasWhere.category = category;
    }

    const plantillas = await prisma.collectiblePhotoTemplate.findMany({
      where: plantillasWhere,
      orderBy: { slot: "asc" },
    });

    // Obtener fotos del usuario
    const fotosUsuario = await prisma.collectiblePhoto.findMany({
      where: { userId },
      include: {
        template: true,
      },
    });

    const fotosMap = new Map(fotosUsuario.map((f) => [f.templateId, f]));

    // Mapear plantillas con fotos del usuario
    const album = plantillas.map((plantilla) => {
      const foto = fotosMap.get(plantilla.id);
      return {
        slot: plantilla.slot,
        templateId: plantilla.id,
        title: plantilla.title,
        description: plantilla.description,
        category: plantilla.category,
        emoji: plantilla.emoji,
        points: plantilla.points,
        requiredLevel: plantilla.requiredLevel,
        hint: plantilla.hint,
        // Estado de la foto del usuario
        userPhoto: foto
          ? {
              id: foto.id,
              photoUrl: foto.photoUrl,
              thumbnailUrl: foto.thumbnailUrl,
              status: foto.status,
              caption: foto.caption,
              pointsEarned: foto.pointsEarned,
              capturedAt: foto.capturedAt,
              validatedAt: foto.validatedAt,
            }
          : null,
        isUnlocked: true, // Por ahora todas desbloqueadas si el nivel aplica
        isCompleted: foto?.status === PhotoStatus.VALIDATED,
      };
    });

    // Calcular estadísticas
    const stats = {
      totalSlots: album.length,
      completed: album.filter((a) => a.isCompleted).length,
      pending: album.filter(
        (a) => a.userPhoto?.status === PhotoStatus.PENDING_VALIDATION
      ).length,
      rejected: album.filter(
        (a) => a.userPhoto?.status === PhotoStatus.REJECTED
      ).length,
      empty: album.filter((a) => !a.userPhoto).length,
      totalPointsEarned: fotosUsuario
        .filter((f) => f.status === PhotoStatus.VALIDATED)
        .reduce((sum, f) => sum + f.pointsEarned, 0),
      maxPossiblePoints: plantillas.reduce((sum, p) => sum + p.points, 0),
    };

    // Estadísticas por categoría
    const byCategory: Record<string, { total: number; completed: number }> = {};
    for (const foto of album) {
      if (!byCategory[foto.category]) {
        byCategory[foto.category] = { total: 0, completed: 0 };
      }
      byCategory[foto.category].total++;
      if (foto.isCompleted) {
        byCategory[foto.category].completed++;
      }
    }

    return NextResponse.json({
      userId,
      highestLevel,
      album,
      stats,
      byCategory,
      categories: Object.values(PhotoCategory),
    });
  } catch (error) {
    logger.error("Error en GET /api/quantum-album:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva entrada de foto en el álbum
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { templateId, photoUrl, thumbnailUrl, caption, visionId } = body;

    if (!templateId || !photoUrl) {
      return NextResponse.json(
        { error: "templateId y photoUrl son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.collectiblePhotoTemplate.findUnique({
      where: { id: templateId },
    });

    if (!plantilla) {
      return NextResponse.json(
        { error: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no existe ya una foto para este slot
    const existingPhoto = await prisma.collectiblePhoto.findFirst({
      where: {
        userId,
        templateId,
      },
    });

    if (existingPhoto) {
      return NextResponse.json(
        {
          error:
            "Ya tienes una foto para este slot. Usa PUT para actualizarla.",
        },
        { status: 400 }
      );
    }

    // Crear la foto
    const nuevaFoto = await prisma.collectiblePhoto.create({
      data: {
        userId,
        templateId,
        photoUrl,
        thumbnailUrl,
        caption,
        visionId: visionId || null,
        status: PhotoStatus.PENDING_VALIDATION,
        pointsEarned: 0, // Se asignan al validar
        capturedAt: new Date(),
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: nuevaFoto.id,
        slot: nuevaFoto.template.slot,
        title: nuevaFoto.template.title,
        photoUrl: nuevaFoto.photoUrl,
        status: nuevaFoto.status,
        message:
          "Foto subida correctamente. Pendiente de validación para obtener puntos.",
      },
    });
  } catch (error) {
    logger.error("Error en POST /api/quantum-album:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar/reemplazar una foto existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { photoId, photoUrl, thumbnailUrl, caption } = body;

    if (!photoId || !photoUrl) {
      return NextResponse.json(
        { error: "photoId y photoUrl son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la foto existe y pertenece al usuario
    const foto = await prisma.collectiblePhoto.findFirst({
      where: {
        id: photoId,
        userId,
      },
      include: {
        template: true,
      },
    });

    if (!foto) {
      return NextResponse.json(
        { error: "Foto no encontrada" },
        { status: 404 }
      );
    }

    // Solo se puede actualizar si está rechazada o pendiente
    if (foto.status === PhotoStatus.VALIDATED) {
      return NextResponse.json(
        { error: "No puedes modificar una foto ya validada" },
        { status: 400 }
      );
    }

    // Actualizar la foto
    const fotoActualizada = await prisma.collectiblePhoto.update({
      where: { id: photoId },
      data: {
        photoUrl,
        thumbnailUrl,
        caption,
        status: PhotoStatus.PENDING_VALIDATION,
        rejectionReason: null, // Limpiar razón de rechazo anterior
        capturedAt: new Date(),
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: fotoActualizada.id,
        slot: fotoActualizada.template.slot,
        title: fotoActualizada.template.title,
        photoUrl: fotoActualizada.photoUrl,
        status: fotoActualizada.status,
        message: "Foto actualizada. Pendiente de nueva validación.",
      },
    });
  } catch (error) {
    logger.error("Error en PUT /api/quantum-album:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una foto del álbum
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        { error: "photoId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la foto existe y pertenece al usuario
    const foto = await prisma.collectiblePhoto.findFirst({
      where: {
        id: parseInt(photoId),
        userId,
      },
    });

    if (!foto) {
      return NextResponse.json(
        { error: "Foto no encontrada" },
        { status: 404 }
      );
    }

    // Solo se puede eliminar si no está validada
    if (foto.status === PhotoStatus.VALIDATED) {
      return NextResponse.json(
        { error: "No puedes eliminar una foto ya validada" },
        { status: 400 }
      );
    }

    // Eliminar la foto
    await prisma.collectiblePhoto.delete({
      where: { id: parseInt(photoId) },
    });

    return NextResponse.json({
      success: true,
      message: "Foto eliminada correctamente",
    });
  } catch (error) {
    logger.error("Error en DELETE /api/quantum-album:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
