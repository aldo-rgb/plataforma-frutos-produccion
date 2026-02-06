import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;
    
    if (!codigo) {
      return NextResponse.json({ success: false, error: 'Código no proporcionado' }, { status: 400 });
    }

    // Buscar el usuario por su código de referido (simplificado)
    const referrer = await prisma.usuario.findFirst({
      where: { referralCode: codigo },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          }
        }
      }
    });

    if (!referrer) {
      return NextResponse.json({ 
        success: false, 
        error: 'Código de invitación no válido' 
      }, { status: 404 });
    }

    const org = referrer.Organization_Usuario_organizationIdToOrganization;

    // Respuesta simplificada - sin buscar visión para evitar errores
    return NextResponse.json({
      success: true,
      data: {
        referrer: {
          id: referrer.id,
          name: referrer.nombre || 'Invitado',
          avatarUrl: referrer.imagen
        },
        organization: org ? {
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl
        } : {
          id: 1,
          name: 'FRUTOS',
          logoUrl: null
        },
        nextBasico: {
          id: 0,
          nombre: 'Próximo Entrenamiento Básico',
          fechaInicio: null,
          fechaFin: null,
          lugar: null,
          precio: 1500,
          currency: 'MXN',
          cuposDisponibles: 50
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching invitation data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
