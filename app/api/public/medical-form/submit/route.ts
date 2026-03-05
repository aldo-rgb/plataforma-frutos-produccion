import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// API pública para guardar formulario médico sin autenticación
export async function POST(req: NextRequest) {
  try {
    // Rate limiting muy estricto - datos médicos sensibles
    const { response } = rateLimit(req, RateLimitPresets.auth);
    if (response) {
      logger.warn('Rate limit exceeded on public/medical-form/submit');
      return response;
    }

    const body = await req.json();
    
    const {
      userId,
      visionId,
      // Condiciones médicas
      hasCurrentIllness,
      currentIllnessDetails,
      hasCurrentTreatment,
      currentTreatmentDetails,
      takesMedication,
      medicationDetails,
      hasAllergies,
      allergyDetails,
      hadSurgery,
      surgeryDetails,
      wasHospitalized,
      hospitalizationDetails,
      hasChronicIllness,
      chronicIllnessDetails,
      hasPhysicalInjury,
      physicalInjuryDetails,
      hasActivityRestrictions,
      activityRestrictionDetails,
      hasPsychologicalCondition,
      psychologicalConditionDetails,
      // Contacto de emergencia
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      // Consentimiento
      consentAccepted,
      signatureData
    } = body;

    // Validaciones básicas
    if (!userId || !visionId) {
      return NextResponse.json({ error: 'Usuario y visión son requeridos' }, { status: 400 });
    }

    if (!emergencyContactName || !emergencyContactRelation || !emergencyContactPhone) {
      return NextResponse.json({ error: 'Contacto de emergencia es requerido' }, { status: 400 });
    }

    if (!consentAccepted) {
      return NextResponse.json({ error: 'Debe aceptar el consentimiento' }, { status: 400 });
    }

    // Verificar que el usuario existe y no tiene formulario
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
      include: {
        MedicalForm_MedicalForm_userIdToUsuario: true,
        vision_enrollments_vision_enrollments_userIdToUsuario: {
          where: {
            visionId: parseInt(visionId)
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (user.MedicalForm_MedicalForm_userIdToUsuario) {
      return NextResponse.json({ error: 'Este usuario ya tiene un formulario médico registrado' }, { status: 400 });
    }

    if (user.vision_enrollments_vision_enrollments_userIdToUsuario.length === 0) {
      return NextResponse.json({ error: 'El usuario no está inscrito a esta visión' }, { status: 400 });
    }

    // Determinar si hay alertas (cualquier condición médica = true)
    const hasAlerts = 
      hasCurrentIllness ||
      hasCurrentTreatment ||
      takesMedication ||
      hasAllergies ||
      hadSurgery ||
      wasHospitalized ||
      hasChronicIllness ||
      hasPhysicalInjury ||
      hasActivityRestrictions ||
      hasPsychologicalCondition;

    // Crear el formulario médico
    const medicalForm = await prisma.medicalForm.create({
      data: {
        userId: parseInt(userId),
        visionId: parseInt(visionId),
        // Condiciones médicas
        hasCurrentIllness: hasCurrentIllness || false,
        currentIllnessDetails: hasCurrentIllness ? currentIllnessDetails : null,
        hasCurrentTreatment: hasCurrentTreatment || false,
        currentTreatmentDetails: hasCurrentTreatment ? currentTreatmentDetails : null,
        takesMedication: takesMedication || false,
        medicationDetails: takesMedication ? medicationDetails : null,
        hasAllergies: hasAllergies || false,
        allergyDetails: hasAllergies ? allergyDetails : null,
        hadSurgery: hadSurgery || false,
        surgeryDetails: hadSurgery ? surgeryDetails : null,
        wasHospitalized: wasHospitalized || false,
        hospitalizationDetails: wasHospitalized ? hospitalizationDetails : null,
        hasChronicIllness: hasChronicIllness || false,
        chronicIllnessDetails: hasChronicIllness ? chronicIllnessDetails : null,
        hasPhysicalInjury: hasPhysicalInjury || false,
        physicalInjuryDetails: hasPhysicalInjury ? physicalInjuryDetails : null,
        hasActivityRestrictions: hasActivityRestrictions || false,
        activityRestrictionDetails: hasActivityRestrictions ? activityRestrictionDetails : null,
        hasPsychologicalCondition: hasPsychologicalCondition || false,
        psychologicalConditionDetails: hasPsychologicalCondition ? psychologicalConditionDetails : null,
        // Contacto de emergencia
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        // Consentimiento
        consentAccepted: true,
        signatureData: signatureData || null,
        signedAt: new Date(),
        // Alertas
        hasAlerts
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Formulario médico registrado correctamente',
      formId: medicalForm.id
    });

  } catch (error) {
    logger.error('Error saving public medical form:', error);
    return NextResponse.json({ error: 'Error al guardar el formulario' }, { status: 500 });
  }
}
