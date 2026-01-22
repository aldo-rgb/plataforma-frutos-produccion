// API Route: Legacy Capture
// Para que los GCs capturen datos de participantes el último día del entrenamiento

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaptureStatus, TrainingLevel } from "@prisma/client";

// GET: Obtener lista de participantes del entrenamiento actual del GC
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get("visionId");

    // Verificar que el usuario es un GC
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        assignedVisionsAsGC: {
          where: visionId
            ? { id: parseInt(visionId) }
            : {
                status: {
                  in: ["REGISTRATION_OPEN", "IN_PROGRESS"],
                },
              },
          include: {
            school: {
              include: {
                organization: true,
              },
            },
            product: true,
            participantes: {
              include: {
                usuario: {
                  select: {
                    id: true,
                    nombreCompleto: true,
                    fotoPerfilUrl: true,
                    email: true,
                    telefono: true,
                  },
                },
              },
            },
          },
          orderBy: {
            fechaInicio: "desc",
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

    const isGC = usuario.roles.some(
      (r) => r.role.nombre === "GameChanger" || r.role.nombre === "Admin"
    );

    if (!isGC) {
      return NextResponse.json(
        { error: "No tienes permisos de Game Changer" },
        { status: 403 }
      );
    }

    // Obtener visiones activas donde es GC
    const visionesActivas = usuario.assignedVisionsAsGC;

    if (visionesActivas.length === 0) {
      return NextResponse.json({
        visiones: [],
        message: "No tienes entrenamientos activos asignados",
      });
    }

    // Formatear respuesta con participantes y su estado de captura
    const visionesConCaptura = await Promise.all(
      visionesActivas.map(async (vision) => {
        // Determinar el nivel del entrenamiento
        const productName = vision.product.nombre.toLowerCase();
        const trainingLevel: TrainingLevel = productName.includes("avanzado")
          ? TrainingLevel.ADVANCED
          : productName.includes("pl") || productName.includes("líder")
          ? TrainingLevel.PL
          : TrainingLevel.BASIC;

        // Obtener capturas existentes para esta visión
        const capturasExistentes = await prisma.legacyCaptureSession.findMany({
          where: {
            visionId: vision.id,
          },
        });

        const capturasMap = new Map(
          capturasExistentes.map((c) => [c.participantId, c])
        );

        // Mapear participantes con su estado de captura
        const participantesConEstado = vision.participantes.map((p) => {
          const captura = capturasMap.get(p.usuarioId);
          return {
            id: p.usuarioId,
            nombreCompleto: p.usuario.nombreCompleto,
            fotoPerfilUrl: p.usuario.fotoPerfilUrl,
            email: p.usuario.email,
            telefono: p.usuario.telefono,
            captureStatus: captura?.status || null,
            captureId: captura?.id || null,
            hasPhotoWithGC: !!captura?.photoWithGCUrl,
            hasPhotoWithSquad: !!captura?.photoWithSquadUrl,
            hasPhotoBlueWall: !!captura?.photoBlueWallUrl,
            // Solo para avanzado/PL
            hasLullaby: !!captura?.lullabyTitle,
            hasContract: !!captura?.contractPhotoUrl,
            hasDeclaration: !!captura?.contractDeclaration,
          };
        });

        return {
          visionId: vision.id,
          visionNombre: vision.nombre,
          school: vision.school.nombre,
          organization: vision.school.organization.nombre,
          product: vision.product.nombre,
          trainingLevel,
          fechaInicio: vision.fechaInicio,
          fechaFin: vision.fechaFin,
          status: vision.status,
          totalParticipantes: participantesConEstado.length,
          capturaCompleta: participantesConEstado.filter(
            (p) => p.captureStatus === CaptureStatus.COMPLETE
          ).length,
          capturaParcial: participantesConEstado.filter(
            (p) => p.captureStatus === CaptureStatus.PARTIAL
          ).length,
          sinCaptura: participantesConEstado.filter((p) => !p.captureStatus)
            .length,
          participantes: participantesConEstado,
          // Campos requeridos según nivel
          requiredFields:
            trainingLevel === TrainingLevel.BASIC
              ? ["photoWithGC", "photoWithSquad", "photoBlueWall"]
              : [
                  "photoWithGC",
                  "photoWithSquad",
                  "photoBlueWall",
                  "lullaby",
                  "contract",
                  "declaration",
                ],
        };
      })
    );

    return NextResponse.json({
      gcId: userId,
      gcName: usuario.nombreCompleto,
      visiones: visionesConCaptura,
    });
  } catch (error) {
    console.error("Error en GET /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar captura de un participante
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const gcId = parseInt(session.user.id);
    const body = await request.json();

    const {
      visionId,
      participantId,
      // Fotos básicas
      photoWithGCUrl,
      photoWithSquadUrl,
      photoBlueWallUrl,
      // Campos avanzado/PL
      lullabyTitle,
      lullabyArtist,
      lullabyAudioUrl,
      contractPhotoUrl,
      contractDeclaration,
    } = body;

    if (!visionId || !participantId) {
      return NextResponse.json(
        { error: "visionId y participantId son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el GC está asignado a esta visión
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        gcId: gcId,
      },
      include: {
        product: true,
        participantes: {
          where: {
            usuarioId: participantId,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json(
        { error: "No tienes acceso a este entrenamiento" },
        { status: 403 }
      );
    }

    if (vision.participantes.length === 0) {
      return NextResponse.json(
        { error: "El participante no está inscrito en este entrenamiento" },
        { status: 400 }
      );
    }

    // Determinar nivel de entrenamiento
    const productName = vision.product.nombre.toLowerCase();
    const trainingLevel: TrainingLevel = productName.includes("avanzado")
      ? TrainingLevel.ADVANCED
      : productName.includes("pl") || productName.includes("líder")
      ? TrainingLevel.PL
      : TrainingLevel.BASIC;

    // Verificar si ya existe una captura
    let existingCapture = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId,
        participantId,
      },
    });

    // Preparar datos de actualización
    const captureData: any = {
      visionId,
      participantId,
      gcId,
      trainingLevel,
      updatedAt: new Date(),
    };

    // Campos básicos (para todos los niveles)
    if (photoWithGCUrl !== undefined) captureData.photoWithGCUrl = photoWithGCUrl;
    if (photoWithSquadUrl !== undefined) captureData.photoWithSquadUrl = photoWithSquadUrl;
    if (photoBlueWallUrl !== undefined) captureData.photoBlueWallUrl = photoBlueWallUrl;

    // Campos solo para ADVANCED y PL
    if (trainingLevel !== TrainingLevel.BASIC) {
      if (lullabyTitle !== undefined) captureData.lullabyTitle = lullabyTitle;
      if (lullabyArtist !== undefined) captureData.lullabyArtist = lullabyArtist;
      if (lullabyAudioUrl !== undefined) captureData.lullabyAudioUrl = lullabyAudioUrl;
      if (contractPhotoUrl !== undefined) captureData.contractPhotoUrl = contractPhotoUrl;
      if (contractDeclaration !== undefined) captureData.contractDeclaration = contractDeclaration;
    }

    // Calcular estado de captura
    let status: CaptureStatus;
    
    if (trainingLevel === TrainingLevel.BASIC) {
      const basicComplete =
        (captureData.photoWithGCUrl || existingCapture?.photoWithGCUrl) &&
        (captureData.photoWithSquadUrl || existingCapture?.photoWithSquadUrl) &&
        (captureData.photoBlueWallUrl || existingCapture?.photoBlueWallUrl);
      
      const basicPartial =
        (captureData.photoWithGCUrl || existingCapture?.photoWithGCUrl) ||
        (captureData.photoWithSquadUrl || existingCapture?.photoWithSquadUrl) ||
        (captureData.photoBlueWallUrl || existingCapture?.photoBlueWallUrl);

      status = basicComplete
        ? CaptureStatus.COMPLETE
        : basicPartial
        ? CaptureStatus.PARTIAL
        : CaptureStatus.PENDING;
    } else {
      // ADVANCED o PL
      const advancedComplete =
        (captureData.photoWithGCUrl || existingCapture?.photoWithGCUrl) &&
        (captureData.photoWithSquadUrl || existingCapture?.photoWithSquadUrl) &&
        (captureData.photoBlueWallUrl || existingCapture?.photoBlueWallUrl) &&
        (captureData.lullabyTitle || existingCapture?.lullabyTitle) &&
        (captureData.contractPhotoUrl || existingCapture?.contractPhotoUrl) &&
        (captureData.contractDeclaration || existingCapture?.contractDeclaration);

      const advancedPartial =
        (captureData.photoWithGCUrl || existingCapture?.photoWithGCUrl) ||
        (captureData.photoWithSquadUrl || existingCapture?.photoWithSquadUrl) ||
        (captureData.photoBlueWallUrl || existingCapture?.photoBlueWallUrl) ||
        (captureData.lullabyTitle || existingCapture?.lullabyTitle) ||
        (captureData.contractPhotoUrl || existingCapture?.contractPhotoUrl) ||
        (captureData.contractDeclaration || existingCapture?.contractDeclaration);

      status = advancedComplete
        ? CaptureStatus.COMPLETE
        : advancedPartial
        ? CaptureStatus.PARTIAL
        : CaptureStatus.PENDING;
    }

    captureData.status = status;

    // Crear o actualizar
    let capture;
    if (existingCapture) {
      capture = await prisma.legacyCaptureSession.update({
        where: { id: existingCapture.id },
        data: captureData,
      });
    } else {
      capture = await prisma.legacyCaptureSession.create({
        data: captureData,
      });
    }

    return NextResponse.json({
      success: true,
      capture: {
        id: capture.id,
        status: capture.status,
        trainingLevel: capture.trainingLevel,
        hasPhotoWithGC: !!capture.photoWithGCUrl,
        hasPhotoWithSquad: !!capture.photoWithSquadUrl,
        hasPhotoBlueWall: !!capture.photoBlueWallUrl,
        hasLullaby: !!capture.lullabyTitle,
        hasContract: !!capture.contractPhotoUrl,
        hasDeclaration: !!capture.contractDeclaration,
      },
      message:
        status === CaptureStatus.COMPLETE
          ? "¡Captura completa!"
          : "Captura guardada parcialmente",
    });
  } catch (error) {
    console.error("Error en POST /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET: Obtener captura específica de un participante
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { visionId, participantId } = body;

    if (!visionId || !participantId) {
      return NextResponse.json(
        { error: "visionId y participantId son requeridos" },
        { status: 400 }
      );
    }

    const capture = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId,
        participantId,
      },
      include: {
        participant: {
          select: {
            id: true,
            nombreCompleto: true,
            fotoPerfilUrl: true,
          },
        },
        vision: {
          select: {
            nombre: true,
            product: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!capture) {
      return NextResponse.json({
        capture: null,
        message: "No hay captura para este participante aún",
      });
    }

    return NextResponse.json({
      capture: {
        id: capture.id,
        status: capture.status,
        trainingLevel: capture.trainingLevel,
        participant: capture.participant,
        vision: capture.vision,
        // Fotos
        photoWithGCUrl: capture.photoWithGCUrl,
        photoWithSquadUrl: capture.photoWithSquadUrl,
        photoBlueWallUrl: capture.photoBlueWallUrl,
        // Avanzado
        lullabyTitle: capture.lullabyTitle,
        lullabyArtist: capture.lullabyArtist,
        lullabyAudioUrl: capture.lullabyAudioUrl,
        contractPhotoUrl: capture.contractPhotoUrl,
        contractDeclaration: capture.contractDeclaration,
        // Timestamps
        createdAt: capture.createdAt,
        updatedAt: capture.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error en PUT /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
