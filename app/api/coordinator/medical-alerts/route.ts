import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener formularios médicos con alertas para el coordinador
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea coordinador o school admin
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { 
        rol: true, 
        organizationId: true 
      }
    });

    if (!usuario || !['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'].includes(usuario.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tiene permisos para ver esta información' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const onlyAlerts = searchParams.get('onlyAlerts') === 'true';
    const includeAll = searchParams.get('includeAll') === 'true';

    // Construir el where clause
    const whereClause: any = {};
    
    if (visionId) {
      whereClause.visionId = parseInt(visionId);
    }

    if (onlyAlerts && !includeAll) {
      whereClause.hasAlerts = true;
    }

    // Filtrar según el rol del usuario
    if (usuario.rol === 'SCHOOL_ADMIN' || usuario.rol === 'COORDINADOR' || usuario.rol === 'ADMIN') {
      // School Admin, Coordinador principal y Admin ven todos los registros de su organización
      if (usuario.organizationId) {
        // Obtener visiones de la organización
        const visionesOrg = await prisma.vision.findMany({
          where: { organizationId: usuario.organizationId },
          select: { id: true }
        });
        if (visionesOrg.length > 0) {
          whereClause.visionId = { in: visionesOrg.map(v => v.id) };
        }
      }
    } else if (['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'].includes(usuario.rol)) {
      // Estos roles ven registros de visiones donde son coordinadores o de su organización
      const coordinadorVisiones = await prisma.vision.findMany({
        where: { 
          OR: [
            { coordinadorId: parseInt(session.user.id) },
            { organizationId: usuario.organizationId }
          ]
        },
        select: { id: true }
      });
      if (coordinadorVisiones.length > 0) {
        whereClause.visionId = { in: coordinadorVisiones.map(v => v.id) };
      }
    }

    const medicalForms = await prisma.medicalForm.findMany({
      where: whereClause,
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            apodo: true,
            profileImage: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { hasAlerts: 'desc' },           // Primero los que tienen alertas
        { alertsReviewedAt: { sort: 'asc', nulls: 'first' } },  // Los no revisados (null) primero
        { createdAt: 'desc' }            // Los más recientes primero
      ]
    });

    // Mapear para la respuesta con formato consistente
    const records = medicalForms.map(form => ({
      id: form.id,
      userId: form.userId,
      hasCurrentIllness: form.hasCurrentIllness,
      currentIllnessDetail: form.currentIllnessDetails,
      isUnderTreatment: form.hasCurrentTreatment,
      treatmentDetail: form.currentTreatmentDetails,
      takesMedication: form.takesMedication,
      medicationDetail: form.medicationDetails,
      hasAllergies: form.hasAllergies,
      allergiesDetail: form.allergyDetails,
      hadSurgery: form.hadSurgery,
      surgeryDetail: form.surgeryDetails,
      wasHospitalized: form.wasHospitalized,
      hospitalizationDetail: form.hospitalizationDetails,
      hasChronicIllness: form.hasChronicIllness,
      chronicIllnessDetail: form.chronicIllnessDetails,
      hasPhysicalInjury: form.hasPhysicalInjury,
      physicalInjuryDetail: form.physicalInjuryDetails,
      hasActivityRestrictions: form.hasActivityRestrictions,
      activityRestrictionsDetail: form.activityRestrictionDetails,
      hasPsychologicalCondition: form.hasPsychologicalCondition,
      psychologicalConditionDetail: form.psychologicalConditionDetails,
      emergencyContactName: form.emergencyContactName,
      emergencyContactRelationship: form.emergencyContactRelation,
      emergencyContactPhone: form.emergencyContactPhone,
      signatureData: form.signatureData,
      signedAt: form.signedAt,
      hasAlerts: form.hasAlerts,
      alertsReviewed: form.alertsReviewedAt !== null,
      reviewedAt: form.alertsReviewedAt,
      createdAt: form.createdAt,
      user: {
        id: form.Usuario.id,
        firstName: form.Usuario.nombre?.split(' ')[0] || form.Usuario.apodo || '',
        lastName: form.Usuario.nombre?.split(' ').slice(1).join(' ') || '',
        email: form.Usuario.email,
        profileImage: form.Usuario.profileImage
      },
      vision: form.Vision ? {
        id: form.Vision.id,
        name: form.Vision.nombre
      } : null
    }));

    // Contar alertas no revisadas
    const unreviewedAlertsCount = await prisma.medicalForm.count({
      where: {
        ...whereClause,
        hasAlerts: true,
        alertsReviewedAt: null
      }
    });

    return NextResponse.json({
      success: true,
      records,
      medicalForms, // mantener compatibilidad
      unreviewedAlertsCount,
      totalCount: medicalForms.length
    });

  } catch (error) {
    console.error('Error fetching medical forms:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener formularios médicos' },
      { status: 500 }
    );
  }
}

// PATCH - Marcar alertas como revisadas (nuevo método)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'ID del formulario requerido' },
        { status: 400 }
      );
    }

    // Actualizar como revisado
    const updated = await prisma.medicalForm.update({
      where: { id: recordId },
      data: {
        alertsReviewedAt: new Date(),
        alertsReviewedBy: parseInt(session.user.id)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como revisada',
      medicalForm: updated
    });

  } catch (error) {
    console.error('Error marking alert as reviewed:', error);
    return NextResponse.json(
      { success: false, error: 'Error al marcar alerta' },
      { status: 500 }
    );
  }
}

// POST - Marcar alertas como revisadas (mantener compatibilidad)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { medicalFormId } = body;

    if (!medicalFormId) {
      return NextResponse.json(
        { success: false, error: 'ID del formulario requerido' },
        { status: 400 }
      );
    }

    // Actualizar como revisado
    const updated = await prisma.medicalForm.update({
      where: { id: medicalFormId },
      data: {
        alertsReviewedAt: new Date(),
        alertsReviewedBy: parseInt(session.user.id)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como revisada',
      medicalForm: updated
    });

  } catch (error) {
    console.error('Error marking alert as reviewed:', error);
    return NextResponse.json(
      { success: false, error: 'Error al marcar alerta' },
      { status: 500 }
    );
  }
}
