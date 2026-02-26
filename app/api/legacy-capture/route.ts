// API Route: Legacy Capture
// Para que los GCs capturen datos de participantes el último día del entrenamiento

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VisionLevel, ProductLevelType } from "@prisma/client";
import logger from '@/lib/logger';

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
            SmallGroupMember: {
              where: { isActive: true },
              include: {
                Usuario_SmallGroupMember_userIdToUsuario: {
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
          squad.SmallGroupMember.map(member => member.Usuario_SmallGroupMember_userIdToUsuario)
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
            nombreCompleto: participante.nombre,
            email: participante.email,
            telefono: participante.telefono,
            fotoPerfilUrl: participante.profileImage,
            captureStatus: captura?.status || null,
            captureId: captura?.id || null,
            // Campos BÁSICO
            hasPhotoWithGC: !!captura?.photoWithGCUrl,
            hasPhotoWithSquad: !!captura?.photoWithSquadUrl,
            hasPhotoBlueWall: !!captura?.photoBlueWallUrl,
            // Campos AVANZADO
            hasLullaby: !!captura?.lullabyTitle,
            hasContract: !!captura?.contractPhotoUrl,
            hasDeclaration: !!captura?.contractDeclaration,
            // Campos PL
            hasPlLullaby: !!captura?.plLullabyTitle,
            hasPhotoSalon: !!captura?.photoSalonUrl,
            hasPhotoManta: !!captura?.photoMantaUrl,
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
              : trainingLevel === VisionLevel.ADVANCED
                ? ["photoWithGC", "photoWithSquad", "contract", "declaration"] // Sin canción de cuna
                : ["photoWithGC", "photoWithSquad", "plLullaby", "photoSalon", "photoManta"], // PL
        };
      })
    );

    return NextResponse.json({
      gcId: usuario.id,
      gcName: usuario.nombre,
      visiones: visionesConCaptura,
    });
  } catch (error) {
    logger.error("Error en GET /api/legacy-capture:", error);
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
      // Campos BÁSICO (3 fotos)
      photoWithGCUrl,
      photoWithSquadUrl,
      photoBlueWallUrl,
      // Campos AVANZADO (fotos + canción + contrato)
      lullabyTitle,
      lullabyArtist,
      lullabyAudioUrl,
      contractPhotoUrl,
      contractDeclaration,
      // Campos PL (fotos + canción PL + salón + manta)
      plLullabyTitle,
      plLullabyArtist,
      plLullabyAudioUrl,
      photoSalonUrl,
      photoMantaUrl,
    } = body;

    if (!visionId || !participantId) {
      return NextResponse.json(
        { error: "visionId y participantId son requeridos" },
        { status: 400 }
      );
    }

    // Validar que visionId y participantId sean números válidos
    const parsedVisionId = parseInt(String(visionId));
    const parsedParticipantId = parseInt(String(participantId));
    
    if (isNaN(parsedVisionId) || isNaN(parsedParticipantId)) {
      return NextResponse.json(
        { error: "visionId y participantId deben ser números válidos" },
        { status: 400 }
      );
    }

    // Determinar el nivel del training - validar que sea uno de los valores permitidos
    const validLevels = ['BASIC', 'ADVANCED', 'PL'];
    const level = validLevels.includes(trainingLevel as string) ? (trainingLevel as string) : 'BASIC';

    // NOTA: No verificamos asignación al squad porque el GC accede desde su dashboard
    // donde ya solo ve a sus participantes asignados. La verificación causaba 
    // problemas cuando el participante estaba en diferentes niveles con diferentes GCs.

    // Buscar captura existente
    const capturaExistente = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId: parsedVisionId,
        participantId: parsedParticipantId,
      },
    });

    // Determinar estado de la captura según nivel - usar solo los valores enviados (no los existentes)
    let status: "PENDING" | "IN_PROGRESS" | "COMPLETED" = "PENDING";
    
    if (level === 'BASIC') {
      // BÁSICO: 3 fotos requeridas
      const hasPhoto1 = !!photoWithGCUrl;
      const hasPhoto2 = !!photoWithSquadUrl;
      const hasPhoto3 = !!photoBlueWallUrl;
      
      if (hasPhoto1 && hasPhoto2 && hasPhoto3) {
        status = "COMPLETED";
      } else if (hasPhoto1 || hasPhoto2 || hasPhoto3) {
        status = "IN_PROGRESS";
      }
    } else if (level === 'ADVANCED') {
      // AVANZADO: 2 fotos + contrato + declaración (sin canción de cuna)
      const hasPhoto1 = !!photoWithGCUrl;
      const hasPhoto2 = !!photoWithSquadUrl;
      const hasContract = !!contractPhotoUrl;
      const hasDeclaration = !!contractDeclaration;
      
      if (hasPhoto1 && hasPhoto2 && hasContract && hasDeclaration) {
        status = "COMPLETED";
      } else if (hasPhoto1 || hasPhoto2 || hasContract || hasDeclaration) {
        status = "IN_PROGRESS";
      }
    } else {
      // PL: 2 fotos + canción PL + foto salón + foto manta
      const hasPhoto1 = !!photoWithGCUrl;
      const hasPhoto2 = !!photoWithSquadUrl;
      const hasPlLullaby = !!plLullabyTitle;
      const hasSalon = !!photoSalonUrl;
      const hasManta = !!photoMantaUrl;
      
      if (hasPhoto1 && hasPhoto2 && hasPlLullaby && hasSalon && hasManta) {
        status = "COMPLETED";
      } else if (hasPhoto1 || hasPhoto2 || hasPlLullaby || hasSalon || hasManta) {
        status = "IN_PROGRESS";
      }
    }

    // Datos a guardar - incluir campos incluso si son null/vacíos para poder borrarlos
    const captureData: any = {
      visionId: parsedVisionId,
      participantId: parsedParticipantId,
      gcId: gcId,
      level: level as ProductLevelType,
      status,
      // Campos que se usan en todos los niveles - siempre actualizar
      photoWithGCUrl: photoWithGCUrl || null,
      photoWithSquadUrl: photoWithSquadUrl || null,
      // Campos BÁSICO
      photoBlueWallUrl: photoBlueWallUrl || null,
      // Campos AVANZADO
      lullabyTitle: lullabyTitle || null,
      lullabyArtist: lullabyArtist || null,
      lullabyAudioUrl: lullabyAudioUrl || null,
      contractPhotoUrl: contractPhotoUrl || null,
      contractDeclaration: contractDeclaration || null,
      // Campos PL
      plLullabyTitle: plLullabyTitle || null,
      plLullabyArtist: plLullabyArtist || null,
      plLullabyAudioUrl: plLullabyAudioUrl || null,
      photoSalonUrl: photoSalonUrl || null,
      photoMantaUrl: photoMantaUrl || null,
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
    logger.error("Error en POST /api/legacy-capture:", error);
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
    logger.error("Error en PUT /api/legacy-capture:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
