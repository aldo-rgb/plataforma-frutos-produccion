import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';

// Recompensas por nivel de servicio
const SERVICE_REWARDS = {
  CONTRIBUCION_NIVEL_1: 200,
  CONTRIBUCION_NIVEL_2: 500,
  SERVICIO_FIN_SEMANA: 800,
  STAFF_NIVEL_1: 1000,
  STAFF_NIVEL_2: 1500,
  STAFF_NIVEL_3: 2500 // Game Changer
};

// POST - Enviar evidencia de servicio
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      locationId,
      serviceLevel,
      evidenciaUrl,
      description
    } = body;

    // Validaciones
    if (!locationId || !serviceLevel || !evidenciaUrl) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos: locationId, serviceLevel, evidenciaUrl" 
      }, { status: 400 });
    }

    if (!Object.keys(SERVICE_REWARDS).includes(serviceLevel)) {
      return NextResponse.json({ 
        error: "Nivel de servicio inválido" 
      }, { status: 400 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar que la location existe
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
    }

    // Verificar que el usuario hizo check-in hoy en esta ubicación
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCheckIn = await prisma.checkIn.findFirst({
      where: {
        usuarioId: userId,
        locationId: locationId,
        createdAt: { gte: today }
      }
    });

    if (!todayCheckIn) {
      return NextResponse.json({ 
        error: "Debes hacer check-in en esta ubicación antes de reportar servicio" 
      }, { status: 400 });
    }

    // Crear la contribución de servicio (estado PENDING)
    const contribution = await prisma.userServiceContribution.create({
      data: {
        usuarioId: userId,
        locationId,
        serviceLevel,
        evidenciaUrl,
        description,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      contribution,
      message: "Evidencia de servicio enviada. Esperando aprobación del mentor/coordinador.",
      potentialReward: SERVICE_REWARDS[serviceLevel as keyof typeof SERVICE_REWARDS]
    }, { status: 201 });

  } catch (error: any) {
    logger.error('Error creating service contribution:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Obtener contribuciones del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    const contributions = await prisma.userServiceContribution.findMany({
      where: { usuarioId: userId },
      include: {
        Location: {
          select: {
            id: true,
            name: true,
            city: true,
            imageUrl: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    const serviceLadder = await prisma.serviceLadderProgress.findUnique({
      where: { usuarioId: userId }
    });

    return NextResponse.json({
      contributions,
      serviceLadder: serviceLadder || {
        nivel1Count: 0,
        nivel2Count: 0,
        finDeSemanaCount: 0,
        staffNivel1Count: 0,
        staffNivel2Count: 0,
        staffNivel3Count: 0,
        superNovaUnlocked: false,
        totalServiceContributions: 0
      }
    });

  } catch (error: any) {
    logger.error('Error fetching contributions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
