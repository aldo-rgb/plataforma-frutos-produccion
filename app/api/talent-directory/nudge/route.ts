import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Dar un toque a un perfil
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { profileId } = await request.json();

    if (!profileId) {
      return NextResponse.json({ error: 'profileId requerido' }, { status: 400 });
    }

    // Verificar que el perfil existe y está en estado HIDDEN (Expo)
    const profile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
      select: { 
        id: true, 
        status: true, 
        userId: true,
        nudgeCount: true 
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // No permitir darse toques a uno mismo
    if (profile.userId === userId) {
      return NextResponse.json({ error: 'No puedes darte toques a ti mismo' }, { status: 400 });
    }

    // Verificar si ya dio un toque
    const existingNudge = await prisma.businessNudge.findUnique({
      where: {
        profileId_userId: {
          profileId,
          userId
        }
      }
    });

    if (existingNudge) {
      return NextResponse.json({ 
        error: 'Ya diste un toque a este negocio',
        alreadyNudged: true 
      }, { status: 400 });
    }

    // Crear el toque y actualizar contador en una transacción
    const [nudge, updatedProfile] = await prisma.$transaction([
      prisma.businessNudge.create({
        data: {
          profileId,
          userId
        }
      }),
      prisma.businessProfile.update({
        where: { id: profileId },
        data: {
          nudgeCount: { increment: 1 }
        },
        select: { nudgeCount: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      nudgeCount: updatedProfile.nudgeCount,
      message: '¡Toque enviado! Este emprendedor sabrá que quieres que abra su negocio 🔔'
    });

  } catch (error) {
    logger.error('Error dando toque:', error);
    return NextResponse.json({ error: 'Error al dar toque' }, { status: 500 });
  }
}

// GET - Verificar si el usuario ya dio toque a un perfil
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId requerido' }, { status: 400 });
    }

    const existingNudge = await prisma.businessNudge.findUnique({
      where: {
        profileId_userId: {
          profileId: parseInt(profileId),
          userId
        }
      }
    });

    return NextResponse.json({
      hasNudged: !!existingNudge
    });

  } catch (error) {
    logger.error('Error verificando toque:', error);
    return NextResponse.json({ error: 'Error al verificar toque' }, { status: 500 });
  }
}
