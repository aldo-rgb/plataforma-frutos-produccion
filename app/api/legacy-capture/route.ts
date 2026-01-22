// API Route: Legacy Capture
// Para que los GCs capturen datos de participantes el último día del entrenamiento

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VisionLevel, ProductLevelType } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET: Obtener lista de participantes del entrenamiento actual del GC
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionIdParam = searchParams.get("visionId");

    // Obtener el usuario y verificar que es GC
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        nombre: true, 
        rol: true,
        profileImage: true 
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar rol de GC o Admin
    if (usuario.rol !== 'GAMECHANGER' && usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: "No tienes permisos de Game Changer" },
        { status: 403 }
      );
    }

    // Obtener las visiones donde el usuario es GC
    const visionesGC = await prisma.visionGameChanger.findMany({
      where: { 
        gameChangerId: usuario.id,
        ...(visionIdParam ? { visionId: parseInt(visionIdParam) } : {})
      },
      include: {
        Vision: {
          include: {
            Organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (visionesGC.length === 0) {
      return NextResponse.json({
        visiones: [],
        message: "No tienes entrenamientos activos asignados",
      });
    }

    // Para cada visión, obtener los participantes asignados a este GC
    const visionesConCaptura = await Promise.all(
      visionesGC.map(async (vgc) => {
        const vision = vgc.Vision;
        const trainingLevel = vgc.level;

        // Buscar participantes del squad de este GC en esta visión
        // Los GCs tienen participantes asignados a través de SmallGroup (squads)
        const squads = await prisma.smallGroup.findMany({
          where: {
            visionId: vision.id,
            leaderId: usuario.id,
            level: trainingLevel,
            isActive: true
          },
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                    profileImage: true
                  }
                }
              }
            }
          }
        });

        // Extraer todos los participantes de los squads
        const participantesDelSquad = squads.flatMap(squad => 
          squad.members.map(member => member.user)
        );

        // Obtener capturas existentes para esta visión
        const capturasExistentes = await prisma.legacyCaptureSession.findMany({
          where: {
            visionId: vision.id,
            gcId: usuario.id
          },
        });

        const capturasMap = new Map(
          capturasExistentes.map((c) => [c.participantId, c])
        );

        // Mapear participantes con su estado de captura
        const participantesConEstado = participantesDelSquad.map((participante) => {
          const captura = capturasMap.get(participante.id);
          
          return {
            id: participante.id,
            nombre: participante.nombre,
            email: participante.email,
            telefono: participante.telefono,
            profileImage: participante.profileImage,
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

        // Determinar fecha de fin según nivel
        let endDate: Date | null = null;
        if (trainingLevel === VisionLevel.BASIC) {
          endDate = vision.endDate;
        } else if (trainingLevel === VisionLevel.ADVANCED) {
          endDate = vision.advancedEndDate;
        } else if (trainingLevel === VisionLevel.PL) {
          endDate = vision.plWeekend3EndDate || vision.plWeekend2EndDate || vision.plWeekend1EndDate;
        }

        return {
          visionId: vision.id,
          visionNombre: vision.nombre,
          organization: vision.Organization?.name || "Sin organización",
          trainingLevel,
          startDate: trainingLevel === VisionLevel.BASIC ? vision.startDate 
                   : trainingLevel === VisionLevel.ADVANCED ? vision.advancedStartDate
                   : vision.plWeekend1StartDate,
          endDate,
          totalParticipantes: participantesConEstado.length,
          capturaCompleta: participantesConEstado.filter(
            (p) => p.captureStatus === "COMPLETED"
          ).length,
          capturaPendiente: participantesConEstado.filter(
            (p) => p.captureStatus === "IN_PROGRESS"
          ).length,
          sinCaptura: participantesConEstado.filter((p) => !p.captureStatus).length,
          participantes: participantesConEstado,
          // Campos requeridos según nivel
          requiredFields:
            trainingLevel === VisionLevel.BASIC
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
      gcId: usuario.id,
      gcName: usuario.nombre,
      visiones: visionesConCaptura,
    });
  } catch (error) {
    console.error("Error en GET /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar captura de un participante
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario || (usuario.rol !== 'GAMECHANGER' && usuario.rol !== 'ADMINISTRADOR')) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const gcId = usuario.id;
    const body = await request.json();

    const {
      visionId,
      participantId,
      trainingLevel,
      // Fotos básicas (todos los niveles)
      photoWithGCUrl,
      photoWithSquadUrl,
      photoBlueWallUrl,
      // Campos avanzados (solo ADVANCED y PL)
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

    // Verificar que el participante está asignado a este GC a través de SmallGroup
    const squadMembership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: parseInt(participantId),
        isActive: true,
        group: {
          visionId: parseInt(visionId),
          leaderId: gcId,
          isActive: true
        }
      },
      include: {
        group: true
      }
    });

    if (!squadMembership) {
      return NextResponse.json(
        { error: "Este participante no está asignado a tu squad" },
        { status: 403 }
      );
    }

    // Determinar el nivel del training (convertir a ProductLevelType)
    const level = (trainingLevel as string) || 'BASIC';

    // Buscar captura existente
    const capturaExistente = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId: parseInt(visionId),
        participantId: parseInt(participantId),
      },
    });

    // Determinar estado de la captura
    let status: "PENDING" | "IN_PROGRESS" | "COMPLETED" = "PENDING";
    
    const hasBasicPhotos = !!(photoWithGCUrl || capturaExistente?.photoWithGCUrl) &&
                          !!(photoWithSquadUrl || capturaExistente?.photoWithSquadUrl) &&
                          !!(photoBlueWallUrl || capturaExistente?.photoBlueWallUrl);

    if (level === 'BASIC') {
      status = hasBasicPhotos ? "COMPLETED" : "IN_PROGRESS";
    } else {
      // ADVANCED o PL requieren más campos
      const hasAdvancedFields = !!(lullabyTitle || capturaExistente?.lullabyTitle) &&
                               !!(contractPhotoUrl || capturaExistente?.contractPhotoUrl) &&
                               !!(contractDeclaration || capturaExistente?.contractDeclaration);
      
      if (hasBasicPhotos && hasAdvancedFields) {
        status = "COMPLETED";
      } else if (hasBasicPhotos || hasAdvancedFields) {
        status = "IN_PROGRESS";
      }
    }

    // Datos a guardar - LegacyCaptureSession usa gcId, no gameChangerId
    // También requiere productId, usaremos visionId como referencia temporal
    const captureData = {
      visionId: parseInt(visionId),
      participantId: parseInt(participantId),
      gcId: gcId,
      productId: parseInt(visionId), // Usando visionId como productId temporalmente
      level: level as ProductLevelType,
      status,
      ...(photoWithGCUrl && { photoWithGCUrl }),
      ...(photoWithSquadUrl && { photoWithSquadUrl }),
      ...(photoBlueWallUrl && { photoBlueWallUrl }),
      ...(lullabyTitle && { lullabyTitle }),
      ...(lullabyArtist && { lullabyArtist }),
      ...(lullabyAudioUrl && { lullabyAudioUrl }),
      ...(contractPhotoUrl && { contractPhotoUrl }),
      ...(contractDeclaration && { contractDeclaration }),
    };

    let captura;
    if (capturaExistente) {
      // Actualizar existente
      captura = await prisma.legacyCaptureSession.update({
        where: { id: capturaExistente.id },
        data: {
          ...captureData,
          updatedAt: new Date(),
        },
      });
    } else {
      // Crear nueva
      captura = await prisma.legacyCaptureSession.create({
        data: captureData,
      });
    }

    return NextResponse.json({
      success: true,
      message: capturaExistente ? "Captura actualizada" : "Captura creada",
      capture: captura,
    });
  } catch (error) {
    console.error("Error en POST /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT: Actualizar una captura específica
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario || (usuario.rol !== 'GAMECHANGER' && usuario.rol !== 'ADMINISTRADOR')) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { captureId, ...updateData } = body;

    if (!captureId) {
      return NextResponse.json(
        { error: "captureId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la captura pertenece a este GC
    const capturaExistente = await prisma.legacyCaptureSession.findFirst({
      where: {
        id: parseInt(captureId),
        gcId: usuario.id
      }
    });

    if (!capturaExistente) {
      return NextResponse.json(
        { error: "Captura no encontrada o no tienes permisos" },
        { status: 404 }
      );
    }

    // Actualizar
    const captura = await prisma.legacyCaptureSession.update({
      where: { id: parseInt(captureId) },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Captura actualizada",
      capture: captura,
    });
  } catch (error) {
    console.error("Error en PUT /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
