import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';

// 📍 Haversine Formula - Calcular distancia entre dos puntos geográficos
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

// POST - Realizar Check-in (NFC o QR)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      locationIdentifier, // Puede ser qrCodeHash o nfcTagId
      identifierType, // 'QR' o 'NFC'
      userLatitude,
      userLongitude
    } = body;

    // Validaciones básicas
    if (!locationIdentifier || !identifierType || !userLatitude || !userLongitude) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos: locationIdentifier, identifierType, userLatitude, userLongitude" 
      }, { status: 400 });
    }

    const userId = session.user.id as number;

    // Buscar el usuario con sus grupos/visiones
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        vision: true,
        experienciaXP: true,
        nivelActual: true,
        rol: true,
        ServiceLadderProgress: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 🔒 RESTRICCIÓN: Solo usuarios con vision o rol especial pueden hacer check-in
    if (!user.vision && !['COORDINADOR', 'MENTOR', 'GAMECHANGER', 'ADMINISTRADOR'].includes(user.rol)) {
      return NextResponse.json({ 
        error: "Solo usuarios asignados a una Visión/Grupo pueden hacer check-in" 
      }, { status: 403 });
    }

    // Buscar la location por QR o NFC
    const location = await prisma.location.findFirst({
      where: {
        isActive: true,
        OR: [
          identifierType === 'QR' ? { qrCodeHash: locationIdentifier } : {},
          identifierType === 'NFC' ? { nfcTagId: locationIdentifier } : {}
        ]
      }
    });

    if (!location) {
      return NextResponse.json({ 
        error: "Ubicación no válida o código incorrecto" 
      }, { status: 404 });
    }

    // Calcular distancia entre usuario y ubicación
    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      location.latitude,
      location.longitude
    );

    // Validar que el usuario esté dentro del radio permitido
    if (distance > location.radiusMeter) {
      return NextResponse.json({ 
        error: `Demasiado lejos de la ubicación. Distancia: ${Math.round(distance)}m. Máximo permitido: ${location.radiusMeter}m`,
        distance: Math.round(distance),
        maxDistance: location.radiusMeter
      }, { status: 400 });
    }

    // Validar si ya hizo check-in hoy en esta ubicación
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        usuarioId: userId,
        locationId: location.id,
        createdAt: {
          gte: today
        }
      }
    });

    if (existingCheckIn) {
      return NextResponse.json({ 
        error: "Ya hiciste check-in en esta ubicación hoy",
        checkIn: existingCheckIn
      }, { status: 400 });
    }

    // 🎉 CHECK-IN EXITOSO - Otorgar XP
    const XP_REWARD = 50;

    const checkIn = await prisma.checkIn.create({
      data: {
        usuarioId: userId,
        locationId: location.id,
        checkInMethod: identifierType,
        latitude: userLatitude,
        longitude: userLongitude,
        distance: Math.round(distance),
        xpGranted: XP_REWARD
      }
    });

    // Actualizar XP del usuario
    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: {
        experienciaXP: {
          increment: XP_REWARD
        }
      }
    });

    // Calcular nuevo nivel si corresponde
    const newLevel = Math.floor(updatedUser.experienciaXP / 1000) + 1;
    if (newLevel > updatedUser.nivelActual) {
      await prisma.usuario.update({
        where: { id: userId },
        data: { nivelActual: newLevel }
      });
    }

    // Registrar en historial de recompensas
    await prisma.rewardHistory.create({
      data: {
        usuarioId: userId,
        type: 'XP',
        amount: XP_REWARD,
        reason: `Check-in en ${location.name}`,
        sourceType: 'CHECKIN',
        sourceId: checkIn.id
      }
    });

    // Actualizar/Crear progreso en Service Ladder
    let serviceLadder = user.ServiceLadderProgress;
    
    if (!serviceLadder) {
      serviceLadder = await prisma.serviceLadderProgress.create({
        data: {
          usuarioId: userId,
          visitedLocations: [location.id]
        }
      });
    } else {
      // Agregar location visitada si no existe
      const visitedLocations = serviceLadder.visitedLocations || [];
      if (!visitedLocations.includes(location.id)) {
        await prisma.serviceLadderProgress.update({
          where: { usuarioId: userId },
          data: {
            visitedLocations: [...visitedLocations, location.id]
          }
        });
      }
    }

    // 🏆 Verificar logros geográficos
    const totalLocations = await prisma.location.count({ where: { isActive: true } });
    const visitedCount = serviceLadder.visitedLocations?.length || 0;
    
    let explorerBadgeUnlocked = false;
    if (visitedCount + 1 >= totalLocations && !serviceLadder.explorerBadgeUnlocked) {
      await prisma.serviceLadderProgress.update({
        where: { usuarioId: userId },
        data: { explorerBadgeUnlocked: true }
      });
      
      // Bonus masivo
      await prisma.usuario.update({
        where: { id: userId },
        data: { puntosCuanticos: { increment: 5000 } }
      });
      
      explorerBadgeUnlocked = true;
    }

    return NextResponse.json({
      success: true,
      checkIn,
      location: {
        id: location.id,
        name: location.name,
        distance: Math.round(distance)
      },
      rewards: {
        xpGranted: XP_REWARD,
        newLevel: newLevel > updatedUser.nivelActual ? newLevel : null
      },
      badges: {
        explorerBadgeUnlocked
      },
      message: `¡Check-in exitoso en ${location.name}! +${XP_REWARD} XP`
    });

  } catch (error: any) {
    logger.error('Error en check-in:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Obtener historial de check-ins del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    const checkIns = await prisma.checkIn.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const serviceLadder = await prisma.serviceLadderProgress.findUnique({
      where: { usuarioId: userId }
    });

    const totalLocations = await prisma.location.count({ where: { isActive: true } });
    const visitedCount = serviceLadder?.visitedLocations?.length || 0;

    return NextResponse.json({
      checkIns,
      stats: {
        totalCheckIns: checkIns.length,
        locationsVisited: visitedCount,
        totalLocations,
        explorerProgress: Math.round((visitedCount / totalLocations) * 100)
      }
    });

  } catch (error: any) {
    logger.error('Error fetching check-ins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
