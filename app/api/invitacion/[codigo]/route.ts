import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;
    
    if (!codigo) {
      return NextResponse.json({ success: false, error: 'Código no proporcionado' }, { status: 400 });
    }

    // Buscar el usuario por su código de referido
    const referrer = await prisma.usuario.findFirst({
      where: {
        referralCode: codigo
      },
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

    // Buscar el próximo Básico disponible de la organización
    const orgId = referrer.organizationId;
    const organization = referrer.Organization_Usuario_organizationIdToOrganization;
    
    let nextBasico = null;
    
    if (orgId) {
      // Buscar visiones de tipo BASIC en la organización
      const vision = await prisma.vision.findFirst({
        where: {
          organizationId: orgId,
          tipo: 'BASIC',
          status: 'ACTIVE',
          fechaInicio: {
            gte: new Date()
          }
        },
        orderBy: {
          fechaInicio: 'asc'
        }
      });

      // Obtener precios de la organización
      const orgPrices = await prisma.organizationPrices.findFirst({
        where: { organizationId: orgId }
      });

      if (vision) {
        nextBasico = {
          id: vision.id,
          nombre: vision.nombre,
          fechaInicio: vision.fechaInicio?.toISOString() || null,
          fechaFin: vision.fechaFin?.toISOString() || null,
          lugar: vision.lugar || null,
          precio: orgPrices?.basicPrice || 1500,
          currency: orgPrices?.currency || 'MXN',
          cuposDisponibles: 50
        };
      } else {
        // Si no hay visión futura, mostrar precios de todos modos
        nextBasico = {
          id: 0,
          nombre: 'Próximo Entrenamiento Básico',
          fechaInicio: null,
          fechaFin: null,
          lugar: null,
          precio: orgPrices?.basicPrice || 1500,
          currency: orgPrices?.currency || 'MXN',
          cuposDisponibles: 50
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        referrer: {
          id: referrer.id,
          name: referrer.nombre || 'Invitado',
          avatarUrl: referrer.imagen
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          logoUrl: organization.logoUrl
        } : {
          id: 1,
          name: 'FRUTOS',
          logoUrl: null
        },
        nextBasico
      }
    });

  } catch (error) {
    console.error('Error fetching invitation data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
