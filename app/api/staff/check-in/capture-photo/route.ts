import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Guardar foto de perfil capturada en check-in
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, imageData, productId } = body;

    if (!userId || !imageData) {
      return NextResponse.json({ error: 'Se requiere userId e imageData' }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar el campo imagen del usuario con la foto capturada
    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(userId) },
      data: { 
        imagen: imageData,
        profileImage: imageData
      }
    });

    // Guardar la foto en The Vault automáticamente
    try {
      // Obtener info del producto para la etiqueta
      let checkInLabel = 'Check-in';
      let levelType = '';
      
      if (productId) {
        const product = await prisma.schoolProduct.findUnique({
          where: { id: parseInt(productId) },
          select: { 
            name: true, 
            levelType: true,
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
            plWeekend2StartDate: true,
            plWeekend2EndDate: true,
            plWeekend3StartDate: true,
            plWeekend3EndDate: true
          }
        });
        
        if (product) {
          levelType = product.levelType || '';
          
          // Determinar la etiqueta según el tipo
          if (product.levelType === 'BASIC') {
            checkInLabel = `📸 Check-in Básico`;
          } else if (product.levelType === 'ADVANCED') {
            checkInLabel = `📸 Check-in Avanzado`;
          } else if (product.levelType === 'PL') {
            // Verificar qué fin de semana es
            const now = new Date();
            let weekendNumber = '';
            
            // Fin de semana 1
            if (product.plWeekend1StartDate && product.plWeekend1EndDate) {
              const w1Start = new Date(product.plWeekend1StartDate);
              const w1End = new Date(product.plWeekend1EndDate);
              w1End.setDate(w1End.getDate() + 1);
              if (now >= w1Start && now <= w1End) {
                weekendNumber = ' (1er Fin de Semana)';
              }
            }
            
            // Fin de semana 2
            if (product.plWeekend2StartDate && product.plWeekend2EndDate) {
              const w2Start = new Date(product.plWeekend2StartDate);
              const w2End = new Date(product.plWeekend2EndDate);
              w2End.setDate(w2End.getDate() + 1);
              if (now >= w2Start && now <= w2End) {
                weekendNumber = ' (2do Fin de Semana)';
              }
            }
            
            // Fin de semana 3
            if (product.plWeekend3StartDate && product.plWeekend3EndDate) {
              const w3Start = new Date(product.plWeekend3StartDate);
              const w3End = new Date(product.plWeekend3EndDate);
              w3End.setDate(w3End.getDate() + 1);
              if (now >= w3Start && now <= w3End) {
                weekendNumber = ' (3er Fin de Semana)';
              }
            }
            
            checkInLabel = `📸 Check-in Liderato${weekendNumber}`;
          } else {
            checkInLabel = `📸 Check-in ${product.levelType}`;
          }
        }
      }

      await prisma.avatarGenerationAttempt.create({
        data: {
          usuarioId: parseInt(userId),
          sourceImage: 'check-in-photo',
          generatedUrl: imageData,
          vibe: checkInLabel,
          gender: user.genero || 'neutro'
        }
      });
      logger.debug(`📸 Foto de check-in guardada en The Vault para usuario ${userId}: ${checkInLabel}`);
    } catch (vaultError) {
      // No fallar si no se puede guardar en vault
      logger.error('Error guardando en vault:', vaultError);
    }

    return NextResponse.json({
      success: true,
      message: 'Foto guardada correctamente',
      photoUrl: imageData,
      user: {
        id: updatedUser.id,
        nombre: updatedUser.nombre,
        imagen: updatedUser.imagen
      }
    });

  } catch (error) {
    logger.error('Error guardando foto:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
