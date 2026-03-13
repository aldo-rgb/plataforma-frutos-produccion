/**
 * MEDICAL FORM HELPER
 * 
 * Funciones auxiliares para gestión automática de formularios médicos.
 * 
 * Visiones configuradas para auto-completar formulario médico:
 * - Vision ID 12: Auto-completa el formulario médico al inscribir
 */

import { prisma } from './prisma';

// IDs de visiones que auto-completan el formulario médico
const VISION_IDS_AUTO_MEDICAL_FORM = [12];

interface AutoMedicalFormResult {
  success: boolean;
  created: boolean;
  medicalFormId?: number;
  message: string;
}

/**
 * Crea automáticamente un formulario médico vacío/completado para un usuario
 * cuando se inscribe a ciertas visiones configuradas.
 * 
 * @param userId - ID del usuario
 * @param visionId - ID de la visión a la que se inscribió
 * @returns Resultado de la operación
 */
export async function autoCreateMedicalFormIfRequired(
  userId: number,
  visionId: number
): Promise<AutoMedicalFormResult> {
  try {
    // Verificar si esta visión requiere auto-completar formulario médico
    if (!VISION_IDS_AUTO_MEDICAL_FORM.includes(visionId)) {
      return {
        success: true,
        created: false,
        message: `Visión ${visionId} no requiere auto-creación de formulario médico`
      };
    }

    // Verificar si el usuario ya tiene formulario médico
    const existingForm = await prisma.medicalForm.findUnique({
      where: { userId }
    });

    if (existingForm) {
      console.log(`ℹ️ [MedicalFormHelper] Usuario ${userId} ya tiene formulario médico (ID: ${existingForm.id})`);
      return {
        success: true,
        created: false,
        medicalFormId: existingForm.id,
        message: 'Usuario ya tiene formulario médico'
      };
    }

    // Crear formulario médico auto-completado
    const medicalForm = await prisma.medicalForm.create({
      data: {
        userId: userId,
        visionId: visionId,
        // Todos los campos médicos en false (sin condiciones)
        hasCurrentIllness: false,
        hasCurrentTreatment: false,
        takesMedication: false,
        hasAllergies: false,
        hadSurgery: false,
        wasHospitalized: false,
        hasChronicIllness: false,
        hasPhysicalInjury: false,
        hasActivityRestrictions: false,
        hasPsychologicalCondition: false,
        // Contacto de emergencia genérico
        emergencyContactName: 'Pendiente de actualizar',
        emergencyContactRelation: 'Familiar',
        emergencyContactPhone: 'Pendiente',
        // Consentimiento auto-aceptado
        consentAccepted: true,
        signedAt: new Date(),
        // Sin alertas
        hasAlerts: false,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [MedicalFormHelper] Formulario médico auto-creado para usuario ${userId} en visión ${visionId} (ID: ${medicalForm.id})`);
    
    return {
      success: true,
      created: true,
      medicalFormId: medicalForm.id,
      message: `Formulario médico auto-creado para visión ${visionId}`
    };

  } catch (error) {
    console.error(`❌ [MedicalFormHelper] Error creando formulario médico para usuario ${userId}:`, error);
    return {
      success: false,
      created: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Versión para usar dentro de una transacción de Prisma
 */
export async function autoCreateMedicalFormInTransaction(
  tx: any,
  userId: number,
  visionId: number
): Promise<AutoMedicalFormResult> {
  try {
    // Verificar si esta visión requiere auto-completar formulario médico
    if (!VISION_IDS_AUTO_MEDICAL_FORM.includes(visionId)) {
      return {
        success: true,
        created: false,
        message: `Visión ${visionId} no requiere auto-creación de formulario médico`
      };
    }

    // Verificar si el usuario ya tiene formulario médico
    const existingForm = await tx.medicalForm.findUnique({
      where: { userId }
    });

    if (existingForm) {
      console.log(`ℹ️ [MedicalFormHelper] Usuario ${userId} ya tiene formulario médico (ID: ${existingForm.id})`);
      return {
        success: true,
        created: false,
        medicalFormId: existingForm.id,
        message: 'Usuario ya tiene formulario médico'
      };
    }

    // Crear formulario médico auto-completado
    const medicalForm = await tx.medicalForm.create({
      data: {
        userId: userId,
        visionId: visionId,
        hasCurrentIllness: false,
        hasCurrentTreatment: false,
        takesMedication: false,
        hasAllergies: false,
        hadSurgery: false,
        wasHospitalized: false,
        hasChronicIllness: false,
        hasPhysicalInjury: false,
        hasActivityRestrictions: false,
        hasPsychologicalCondition: false,
        emergencyContactName: 'Pendiente de actualizar',
        emergencyContactRelation: 'Familiar',
        emergencyContactPhone: 'Pendiente',
        consentAccepted: true,
        signedAt: new Date(),
        hasAlerts: false,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [MedicalFormHelper] Formulario médico auto-creado para usuario ${userId} en visión ${visionId} (ID: ${medicalForm.id})`);
    
    return {
      success: true,
      created: true,
      medicalFormId: medicalForm.id,
      message: `Formulario médico auto-creado para visión ${visionId}`
    };

  } catch (error) {
    console.error(`❌ [MedicalFormHelper] Error creando formulario médico para usuario ${userId}:`, error);
    return {
      success: false,
      created: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
