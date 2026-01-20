// API para la Bitácora de Inicio (Cuestionario Avanzado)
// GET: Obtener el estado actual y draft del cuestionario
// POST: Guardar draft (auto-save) o submit final

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener el cuestionario del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Buscar cuestionario existente
    const questionnaire = await prisma.advancedQuestionnaire.findUnique({
      where: { userId },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          }
        }
      }
    });

    // Obtener datos básicos del usuario para pre-llenar
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        birthdate: true,
        profession: true,
        children: true,
      }
    });

    return NextResponse.json({
      questionnaire,
      user,
      exists: !!questionnaire,
    });

  } catch (error) {
    console.error('Error getting bitacora:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Guardar draft o submit final
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { action, dimension, data, visionId } = body;

    // action: 'draft' | 'complete'
    
    if (action === 'draft') {
      // Auto-save: Guardar progreso parcial
      const existing = await prisma.advancedQuestionnaire.findUnique({
        where: { userId }
      });

      const updateData: any = {
        ...data,
        currentDimension: dimension || existing?.currentDimension || 0,
        lastSavedAt: new Date(),
        status: 'IN_PROGRESS',
      };

      // Detectar flag de riesgo de suicidio
      if (data.hasSuicideAttempt === true) {
        updateData.suicideRiskFlag = true;
      }

      if (existing) {
        // Actualizar existente
        const updated = await prisma.advancedQuestionnaire.update({
          where: { userId },
          data: updateData,
        });
        return NextResponse.json({ success: true, questionnaire: updated });
      } else {
        // Crear nuevo
        const created = await prisma.advancedQuestionnaire.create({
          data: {
            userId,
            visionId: visionId || null,
            ...updateData,
          }
        });
        return NextResponse.json({ success: true, questionnaire: created });
      }
    }

    if (action === 'complete') {
      // Marcar como completado
      const updated = await prisma.advancedQuestionnaire.update({
        where: { userId },
        data: {
          ...data,
          status: 'COMPLETED',
          completedAt: new Date(),
          // Verificar flag de suicidio
          suicideRiskFlag: data.hasSuicideAttempt === true,
        }
      });

      return NextResponse.json({ 
        success: true, 
        questionnaire: updated,
        message: 'Bitácora completada exitosamente'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error saving bitacora:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
