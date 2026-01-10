import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener formularios médicos con alertas pendientes para el coordinador
// Las alertas aparecen 1 día antes del inicio de un producto y desaparecen cuando termina
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo coordinadores pueden ver esto
    const coordinatorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'SCHOOL_ADMIN', 'ADMINISTRADOR'];
    if (!coordinatorRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const now = new Date();
    // 1 día antes = mostrar alertas desde un día antes del inicio
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Obtener formularios con alertas de participantes que:
    // 1. Tienen alertas médicas
    // 2. Están en la misma organización
    // 3. El coordinador NO ha marcado como "enterado"
    // 4. Tienen un producto activo o que inicia en 1 día
    const medicalFormsWithAlerts = await prisma.medicalForm.findMany({
      where: {
        hasAlerts: true,
        Usuario: {
          organizationId: user.organizationId
        },
        // Excluir los que ya ha visto este coordinador
        NOT: {
          CoordinatorAcknowledgments: {
            some: {
              coordinatorId: user.id
            }
          }
        }
      },
      select: {
        id: true,
        userId: true,
        hasCurrentIllness: true,
        currentIllnessDetails: true,
        hasCurrentTreatment: true,
        currentTreatmentDetails: true,
        takesMedication: true,
        medicationDetails: true,
        hasAllergies: true,
        allergyDetails: true,
        hadSurgery: true,
        surgeryDetails: true,
        wasHospitalized: true,
        hospitalizationDetails: true,
        hasChronicIllness: true,
        chronicIllnessDetails: true,
        hasPhysicalInjury: true,
        physicalInjuryDetails: true,
        hasActivityRestrictions: true,
        activityRestrictionDetails: true,
        hasPsychologicalCondition: true,
        psychologicalConditionDetails: true,
        emergencyContactName: true,
        emergencyContactRelation: true,
        emergencyContactPhone: true,
        createdAt: true,
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filtrar solo los que tienen un producto activo o próximo (1 día antes)
    const pendingAlerts = [];

    for (const form of medicalFormsWithAlerts) {
      // Verificar si el usuario tiene un enrollment activo en un producto vigente o próximo
      const activeEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: form.userId,
          enrollmentStatus: { in: ['enrolled', 'confirmed', 'ENROLLED', 'CONFIRMED'] },
          Vision: {
            isActive: true,
            SchoolProduct: {
              some: {
                isActive: true,
                OR: [
                  // Producto en curso (ya inició y no ha terminado)
                  {
                    startDate: { lte: now },
                    endDate: { gte: now }
                  },
                  // Producto que inicia en 1 día o menos
                  {
                    startDate: { 
                      lte: oneDayFromNow,
                      gte: now 
                    }
                  }
                ]
              }
            }
          }
        },
        include: {
          Vision: {
            include: {
              SchoolProduct: {
                where: {
                  isActive: true,
                  OR: [
                    {
                      startDate: { lte: now },
                      endDate: { gte: now }
                    },
                    {
                      startDate: { 
                        lte: oneDayFromNow,
                        gte: now 
                      }
                    }
                  ]
                },
                select: {
                  id: true,
                  name: true,
                  levelType: true,
                  startDate: true,
                  endDate: true
                }
              }
            }
          }
        }
      });

      // También verificar VisionParticipante
      const visionParticipante = await prisma.visionParticipante.findFirst({
        where: {
          participanteId: form.userId,
          Vision: {
            isActive: true,
            SchoolProduct: {
              some: {
                isActive: true,
                OR: [
                  {
                    startDate: { lte: now },
                    endDate: { gte: now }
                  },
                  {
                    startDate: { 
                      lte: oneDayFromNow,
                      gte: now 
                    }
                  }
                ]
              }
            }
          }
        },
        include: {
          Vision: {
            include: {
              SchoolProduct: {
                where: {
                  isActive: true,
                  OR: [
                    {
                      startDate: { lte: now },
                      endDate: { gte: now }
                    },
                    {
                      startDate: { 
                        lte: oneDayFromNow,
                        gte: now 
                      }
                    }
                  ]
                },
                select: {
                  id: true,
                  name: true,
                  levelType: true,
                  startDate: true,
                  endDate: true
                }
              }
            }
          }
        }
      });

      // Si tiene algún enrollment activo en producto vigente/próximo, incluir la alerta
      if (activeEnrollment || visionParticipante) {
        const productInfo = activeEnrollment?.Vision?.SchoolProduct?.[0] || 
                           visionParticipante?.Vision?.SchoolProduct?.[0];
        
        // Verificar si ya existe acknowledgment para este producto específico
        if (productInfo) {
          const existingAck = await prisma.medicalFormAcknowledgment.findFirst({
            where: {
              medicalFormId: form.id,
              coordinatorId: user.id,
              productId: productInfo.id
            }
          });
          
          // Solo incluir si NO tiene acknowledgment para este producto
          if (!existingAck) {
            pendingAlerts.push({
              ...form,
              productInfo: {
                id: productInfo.id,
                name: productInfo.name,
                levelType: productInfo.levelType,
                startDate: productInfo.startDate,
                endDate: productInfo.endDate
              }
            });
          }
        } else {
          // Sin producto específico, usar la lógica original
          pendingAlerts.push({
            ...form,
            productInfo: null
          });
        }
      }
    }

    return NextResponse.json({ 
      pendingAlerts,
      count: pendingAlerts.length 
    });

  } catch (error) {
    console.error('❌ Error obteniendo alertas médicas:', error);
    return NextResponse.json(
      { error: 'Error obteniendo alertas médicas' },
      { status: 500 }
    );
  }
}

// POST - Marcar un formulario como "enterado" por el coordinador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo coordinadores pueden marcar como enterado
    const coordinatorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'SCHOOL_ADMIN', 'ADMINISTRADOR'];
    if (!coordinatorRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { medicalFormId, productId } = body;

    if (!medicalFormId) {
      return NextResponse.json({ error: 'ID de formulario requerido' }, { status: 400 });
    }

    // Verificar que el formulario existe y es de la misma organización
    const medicalForm = await prisma.medicalForm.findUnique({
      where: { id: medicalFormId },
      include: {
        Usuario: {
          select: { organizationId: true }
        }
      }
    });

    if (!medicalForm) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    if (medicalForm.Usuario.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado para este formulario' }, { status: 403 });
    }

    // Crear el registro de acknowledgment para este producto específico
    const acknowledgment = await prisma.medicalFormAcknowledgment.upsert({
      where: {
        medicalFormId_coordinatorId_productId: {
          medicalFormId,
          coordinatorId: user.id,
          productId: productId || null
        }
      },
      update: {
        acknowledgedAt: new Date()
      },
      create: {
        medicalFormId,
        coordinatorId: user.id,
        productId: productId || null
      }
    });

    return NextResponse.json({ 
      success: true,
      acknowledgment 
    });

  } catch (error) {
    console.error('❌ Error marcando formulario como enterado:', error);
    return NextResponse.json(
      { error: 'Error procesando solicitud' },
      { status: 500 }
    );
  }
}
