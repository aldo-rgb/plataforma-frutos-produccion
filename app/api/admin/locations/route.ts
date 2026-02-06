import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import logger from '@/lib/logger';

// GET - Listar todas las locations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id as number }
    });

    // Solo ADMIN, COORDINADOR o GAMECHANGER pueden ver locations
    if (!['ADMINISTRADOR', 'COORDINADOR', 'GAMECHANGER'].includes(user?.rol || '')) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            CheckIns: true,
            UserServiceContributions: true
          }
        }
      }
    });

    return NextResponse.json({ locations });
  } catch (error: any) {
    logger.error('Error fetching locations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crear nueva location
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id as number }
    });

    // Solo ADMIN puede crear locations
    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      latitude,
      longitude,
      radiusMeter = 50,
      nfcTagId,
      address,
      city,
      country = 'México',
      imageUrl,
      isActive = true
    } = body;

    // Validaciones
    if (!name || !latitude || !longitude) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos: name, latitude, longitude" 
      }, { status: 400 });
    }

    // Generar QR Code Hash único
    const qrCodeHash = crypto.randomBytes(16).toString('hex');

    const location = await prisma.location.create({
      data: {
        name,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeter: parseInt(radiusMeter),
        nfcTagId,
        qrCodeHash,
        address,
        city,
        country,
        imageUrl,
        isActive
      }
    });

    return NextResponse.json({ 
      location,
      qrCodeHash // Devolver el hash para generar el QR físico
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating location:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Actualizar location
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id as number }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { locationId, ...updateData } = body;

    if (!locationId) {
      return NextResponse.json({ error: "locationId requerido" }, { status: 400 });
    }

    const location = await prisma.location.update({
      where: { id: locationId },
      data: updateData
    });

    return NextResponse.json({ location });
  } catch (error: any) {
    logger.error('Error updating location:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar location (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id as number }
    });

    if (user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: "locationId requerido" }, { status: 400 });
    }

    // Soft delete - solo desactivar
    const location = await prisma.location.update({
      where: { id: parseInt(locationId) },
      data: { isActive: false }
    });

    return NextResponse.json({ location });
  } catch (error: any) {
    logger.error('Error deleting location:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
