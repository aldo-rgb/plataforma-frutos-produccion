import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener formulario médico del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const medicalForm = await prisma.medicalForm.findUnique({
      where: { userId: parseInt(session.user.id) },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      medicalForm,
      isComplete: medicalForm?.consentAccepted && medicalForm?.signatureData ? true : false
    });

  } catch (error) {
    logger.error('Error fetching medical form:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener formulario médico' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar formulario médico
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Validar campos requeridos
    if (!body.emergencyContactName || !body.emergencyContactRelation || !body.emergencyContactPhone) {
      return NextResponse.json(
        { success: false, error: 'Contacto de emergencia es requerido' },
        { status: 400 }
      );
    }

    if (!body.consentAccepted) {
      return NextResponse.json(
        { success: false, error: 'Debe aceptar el consentimiento' },
        { status: 400 }
      );
    }

    if (!body.signatureData) {
      return NextResponse.json(
        { success: false, error: 'La firma digital es requerida' },
        { status: 400 }
      );
    }

    // Obtener visionId del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    // Buscar visión activa del usuario
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        enrollmentStatus: 'ENROLLED'
      },
      select: { visionId: true }
    });

    // Calcular si tiene alertas (cualquier condición en Sí)
    const hasAlerts = 
      body.hasCurrentIllness ||
      body.hasCurrentTreatment ||
      body.takesMedication ||
      body.hasAllergies ||
      body.hadSurgery ||
      body.wasHospitalized ||
      body.hasChronicIllness ||
      body.hasPhysicalInjury ||
      body.hasActivityRestrictions ||
      body.hasPsychologicalCondition;

    const medicalFormData = {
      // Sección 1: Condiciones Médicas
      hasCurrentIllness: body.hasCurrentIllness || false,
      currentIllnessDetails: body.currentIllnessDetails || null,
      
      hasCurrentTreatment: body.hasCurrentTreatment || false,
      currentTreatmentDetails: body.currentTreatmentDetails || null,
      
      takesMedication: body.takesMedication || false,
      medicationDetails: body.medicationDetails || null,
      
      hasAllergies: body.hasAllergies || false,
      allergyDetails: body.allergyDetails || null,
      
      hadSurgery: body.hadSurgery || false,
      surgeryDetails: body.surgeryDetails || null,
      
      wasHospitalized: body.wasHospitalized || false,
      hospitalizationDetails: body.hospitalizationDetails || null,
      
      hasChronicIllness: body.hasChronicIllness || false,
      chronicIllnessDetails: body.chronicIllnessDetails || null,
      
      hasPhysicalInjury: body.hasPhysicalInjury || false,
      physicalInjuryDetails: body.physicalInjuryDetails || null,
      
      hasActivityRestrictions: body.hasActivityRestrictions || false,
      activityRestrictionDetails: body.activityRestrictionDetails || null,
      
      hasPsychologicalCondition: body.hasPsychologicalCondition || false,
      psychologicalConditionDetails: body.psychologicalConditionDetails || null,
      
      // Sección 2: Contacto de Emergencia
      emergencyContactName: body.emergencyContactName,
      emergencyContactRelation: body.emergencyContactRelation,
      emergencyContactPhone: body.emergencyContactPhone,
      
      // Sección 3: Consentimiento
      consentAccepted: body.consentAccepted,
      signatureData: body.signatureData,
      signedAt: new Date(),
      
      // Alertas
      hasAlerts,
      
      // Vision
      visionId: enrollment?.visionId || null,
    };

    // Upsert del formulario médico
    const medicalForm = await prisma.medicalForm.upsert({
      where: { userId },
      update: medicalFormData,
      create: {
        userId,
        ...medicalFormData
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Formulario médico guardado exitosamente',
      medicalForm,
      hasAlerts
    });

  } catch (error) {
    logger.error('Error saving medical form:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar formulario médico' },
      { status: 500 }
    );
  }
}
