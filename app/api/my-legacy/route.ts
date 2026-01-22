// API Route: Mi Legado
// Para que el usuario vea las fotos y datos capturados por su GC

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener mi legado de entrenamientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get("visionId");

    // Obtener capturas del usuario
    const capturas = await prisma.legacyCaptureSession.findMany({
      where: {
        participantId: userId,
        status: "COMPLETE",
        ...(visionId && { visionId: parseInt(visionId) }),
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            fechaInicio: true,
            fechaFin: true,
            product: {
              select: {
                nombre: true,
              },
            },
            school: {
              select: {
                nombre: true,
                organization: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
        gc: {
          select: {
            id: true,
            nombreCompleto: true,
            fotoPerfilUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (capturas.length === 0) {
      return NextResponse.json({
        hasLegacy: false,
        message: "Aún no tienes legados capturados",
        capturas: [],
      });
    }

    // Formatear respuesta
    const legados = capturas.map((c) => ({
      id: c.id,
      trainingLevel: c.trainingLevel,
      vision: {
        id: c.vision.id,
        nombre: c.vision.nombre,
        product: c.vision.product.nombre,
        school: c.vision.school.nombre,
        organization: c.vision.school.organization.nombre,
        fechaInicio: c.vision.fechaInicio,
        fechaFin: c.vision.fechaFin,
      },
      gameChanger: c.gc,
      // Fotos básicas (todos los niveles)
      photos: {
        withGC: c.photoWithGCUrl,
        withSquad: c.photoWithSquadUrl,
        blueWall: c.photoBlueWallUrl,
      },
      // Datos avanzados (solo ADVANCED y PL)
      advanced:
        c.trainingLevel !== "BASIC"
          ? {
              lullaby: c.lullabyTitle
                ? {
                    title: c.lullabyTitle,
                    artist: c.lullabyArtist,
                    audioUrl: c.lullabyAudioUrl,
                  }
                : null,
              contract: {
                photoUrl: c.contractPhotoUrl,
                declaration: c.contractDeclaration,
              },
            }
          : null,
      capturedAt: c.createdAt,
    }));

    // Para el dashboard, destacar la declaración más reciente
    const latestDeclaration = capturas.find(
      (c) => c.contractDeclaration && c.trainingLevel !== "BASIC"
    );

    return NextResponse.json({
      hasLegacy: true,
      totalLegados: capturas.length,
      legados,
      // Para mostrar en el dashboard del usuario
      dashboard: {
        declaration: latestDeclaration?.contractDeclaration || null,
        declarationFrom: latestDeclaration
          ? {
              vision: latestDeclaration.vision.nombre,
              date: latestDeclaration.createdAt,
            }
          : null,
        latestLullaby: capturas.find(
          (c) => c.lullabyTitle && c.trainingLevel !== "BASIC"
        )
          ? {
              title: capturas.find((c) => c.lullabyTitle)?.lullabyTitle,
              artist: capturas.find((c) => c.lullabyTitle)?.lullabyArtist,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/my-legacy:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
