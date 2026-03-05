// API para la Bitácora de Inicio (Cuestionario Avanzado)
// GET: Obtener el estado actual y draft del cuestionario
// POST: Guardar draft (auto-save) o submit final

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
    logger.error('Error getting bitacora:', error);
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

    // Campos válidos para actualizar (excluir campos de sistema)
    const validFields = [
      'maritalStatus', 'partnerRelationship', 'partnerRelationshipScore',
      'hasChildren', 'childrenData', 'parentsRelationship', 'siblingsCount',
      'siblingsRelationship', 'hasCompanion', 'companionName', 'companionRelation',
      'healthStatus', 'currentMedications', 'isPregnant', 'hasSuicideAttempt',
      'suicideAttemptReason', 'childhoodEvent', 'childhoodMeaning',
      'adolescenceEvent', 'adolescenceMeaning', 'adulthoodEvent', 'adulthoodMeaning',
      'eventsInfluence', 'externalPerception', 'friendsPerception', 'religiousBeliefs',
      'educationBeliefs', 'workDescription', 'triggers', 'lifePurpose'
    ];

    // Filtrar solo campos válidos del data
    const cleanData: any = {};
    for (const field of validFields) {
      if (data && data[field] !== undefined) {
        cleanData[field] = data[field];
      }
    }

    // action: 'draft' | 'complete'
    
    if (action === 'draft') {
      // Auto-save: Guardar progreso parcial
      const existing = await prisma.advancedQuestionnaire.findUnique({
        where: { userId }
      });

      const updateData: any = {
        ...cleanData,
        currentDimension: dimension || existing?.currentDimension || 0,
        lastSavedAt: new Date(),
        status: 'IN_PROGRESS',
      };

      // Detectar flag de riesgo de suicidio
      if (cleanData.hasSuicideAttempt === true) {
        updateData.suicideRiskFlag = true;
      }

      if (existing) {
        // Actualizar existente
        const updated = await prisma.advancedQuestionnaire.update({
          where: { userId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, questionnaire: updated });
      } else {
        // Crear nuevo
        const created = await prisma.advancedQuestionnaire.create({
          data: {
            userId,
            visionId: visionId || null,
            ...updateData,
            updatedAt: new Date(),
          }
        });
        return NextResponse.json({ success: true, questionnaire: created });
      }
    }

    if (action === 'complete') {
      // Marcar como completado - usar upsert por si no existe el registro
      const updated = await prisma.advancedQuestionnaire.upsert({
        where: { userId },
        update: {
          ...cleanData,
          status: 'COMPLETED',
          completedAt: new Date(),
          lastSavedAt: new Date(),
          updatedAt: new Date(),
          // Verificar flag de suicidio
          suicideRiskFlag: cleanData.hasSuicideAttempt === true,
        },
        create: {
          userId,
          visionId: visionId || null,
          ...cleanData,
          status: 'COMPLETED',
          completedAt: new Date(),
          lastSavedAt: new Date(),
          updatedAt: new Date(),
          currentDimension: 5,
          suicideRiskFlag: cleanData.hasSuicideAttempt === true,
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
    logger.error('Error saving bitacora:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
