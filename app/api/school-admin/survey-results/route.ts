import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea School Admin o Director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || !['SCHOOL_ADMIN', 'DIRECTOR', 'ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener organización
    let organizationId = user.organizationId;
    if (!organizationId) {
      const org = await prisma.organization.findFirst({
        where: { schoolAdminId: user.id },
        select: { id: true }
      });
      organizationId = org?.id || null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Obtener parámetros de filtrado
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const levelType = searchParams.get('levelType'); // BASIC, ADVANCED, PL

    // Construir filtro base de productos
    const productFilter: any = {
      organizationId,
      trainingStatus: 'COMPLETED',
      type: 'CORE_TRAINING'
    };

    if (productId) {
      productFilter.id = parseInt(productId);
    }

    if (levelType) {
      productFilter.levelType = levelType;
    }

    // Obtener productos completados con sus encuestas
    const completedProducts = await prisma.schoolProduct.findMany({
      where: productFilter,
      select: {
        id: true,
        name: true,
        levelType: true,
        startDate: true,
        endDate: true,
        currentEnrollment: true,
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        TrainerSurveys: {
          select: {
            id: true,
            trainerId: true,
            salonAmbiente: true,
            instalaciones: true,
            staff: true,
            audioUrl: true,
            observaciones: true,
            createdAt: true,
            Trainer: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        },
        GameChangerSurveys: {
          select: {
            id: true,
            gameChangerId: true,
            aireAcondicionado: true,
            limpiezaBanos: true,
            coffeBreak: true,
            entrenadorEstrellas: true,
            entrenadorInspiro: true,
            coordinadorRespaldo: true,
            createdAt: true,
            GameChanger: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        },
        DirectorAudit: {
          select: {
            id: true,
            directorId: true,
            // Momentos de Verdad
            auditRegistro: true,
            auditRegistroNota: true,
            auditConcentracion: true,
            auditConcentracionNota: true,
            auditBreakLargo: true,
            auditBreakLargoNota: true,
            auditEnrolamiento: true,
            auditEnrolamientoNota: true,
            auditSalaActiva: true,
            auditSalaActivaNota: true,
            auditBreakCorto: true,
            auditBreakCortoNota: true,
            // Excelencia del Salón
            limpiezaGeneral: true,
            equipoSonido: true,
            visualesPantalla: true,
            materialesRotafolio: true,
            insumosBaul: true,
            cumplimientoTareas: true,
            mesaControl: true,
            // Excelencia de Instalaciones
            climaAire: true,
            banosLimpieza: true,
            sillasEstado: true,
            pinturaParedes: true,
            brandingVinilos: true,
            // Imagen Profesional
            liderazgoCapitanias: true,
            disciplinaPuntualidad: true,
            imagenStaff: true,
            imagenCoordinador: true,
            contextoAlineamiento: true,
            // Cierre
            observaciones: true,
            certifiedAt: true,
            createdAt: true,
            Director: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            }
          }
        }
      },
      orderBy: { endDate: 'desc' }
    });

    // Calcular métricas agregadas
    const aggregatedMetrics = calculateAggregatedMetrics(completedProducts);

    // Formatear respuesta
    const results = completedProducts.map(product => ({
      productId: product.id,
      productName: product.name,
      levelType: product.levelType,
      visionName: product.Vision?.nombre || 'Sin Visión',
      dates: {
        start: product.startDate,
        end: product.endDate
      },
      enrollment: product.currentEnrollment,
      trainer: product.TrainerSurveys.length > 0 ? {
        survey: product.TrainerSurveys[0],
        ratings: {
          salonAmbiente: product.TrainerSurveys[0].salonAmbiente,
          instalaciones: product.TrainerSurveys[0].instalaciones,
          staff: product.TrainerSurveys[0].staff,
          average: (
            (product.TrainerSurveys[0].salonAmbiente + 
             product.TrainerSurveys[0].instalaciones + 
             product.TrainerSurveys[0].staff) / 3
          ).toFixed(1)
        }
      } : null,
      gameChangers: product.GameChangerSurveys.map(gc => ({
        id: gc.id,
        gcName: gc.GameChanger.nombre,
        gcImage: gc.GameChanger.imagen,
        aireAcondicionado: gc.aireAcondicionado,
        limpiezaBanos: gc.limpiezaBanos,
        coffeBreak: gc.coffeBreak,
        entrenadorEstrellas: gc.entrenadorEstrellas,
        entrenadorInspiro: gc.entrenadorInspiro,
        coordinadorRespaldo: gc.coordinadorRespaldo,
        createdAt: gc.createdAt
      })),
      directorAudit: product.DirectorAudit ? {
        ...product.DirectorAudit,
        directorName: product.DirectorAudit.Director.nombre
      } : null,
      status: {
        hasTrainerSurvey: product.TrainerSurveys.length > 0,
        gcSurveysCount: product.GameChangerSurveys.length,
        hasDirectorAudit: !!product.DirectorAudit,
        isComplete: product.TrainerSurveys.length > 0 && 
                    product.GameChangerSurveys.length > 0 && 
                    !!product.DirectorAudit
      }
    }));

    return NextResponse.json({
      success: true,
      trainings: results,
      aggregated: aggregatedMetrics,
      totalTrainings: completedProducts.length
    });

  } catch (error) {
    logger.error('Error fetching survey results:', error);
    return NextResponse.json(
      { error: 'Error al obtener resultados de encuestas' },
      { status: 500 }
    );
  }
}

function calculateAggregatedMetrics(products: any[]) {
  // Métricas de Trainer
  const trainerSurveys = products.flatMap(p => p.TrainerSurveys);
  const trainerMetrics = trainerSurveys.length > 0 ? {
    count: trainerSurveys.length,
    avgSalonAmbiente: (trainerSurveys.reduce((a, s) => a + s.salonAmbiente, 0) / trainerSurveys.length).toFixed(1),
    avgInstalaciones: (trainerSurveys.reduce((a, s) => a + s.instalaciones, 0) / trainerSurveys.length).toFixed(1),
    avgStaff: (trainerSurveys.reduce((a, s) => a + s.staff, 0) / trainerSurveys.length).toFixed(1),
    overallAvg: (
      trainerSurveys.reduce((a, s) => a + (s.salonAmbiente + s.instalaciones + s.staff) / 3, 0) / 
      trainerSurveys.length
    ).toFixed(1)
  } : null;

  // Métricas de Game Changers
  const gcSurveys = products.flatMap(p => p.GameChangerSurveys);
  const gcMetrics = gcSurveys.length > 0 ? {
    count: gcSurveys.length,
    aireDistribution: {
      CONGELADO: gcSurveys.filter(g => g.aireAcondicionado === 'CONGELADO').length,
      PERFECTO: gcSurveys.filter(g => g.aireAcondicionado === 'PERFECTO').length,
      CALOR: gcSurveys.filter(g => g.aireAcondicionado === 'CALOR').length
    },
    avgLimpiezaBanos: (gcSurveys.reduce((a, s) => a + s.limpiezaBanos, 0) / gcSurveys.length).toFixed(0),
    coffeeBreakDistribution: {
      A_TIEMPO: gcSurveys.filter(g => g.coffeBreak === 'A_TIEMPO').length,
      TARDE_FALTANTE: gcSurveys.filter(g => g.coffeBreak === 'TARDE_FALTANTE').length
    },
    avgEntrenadorEstrellas: (gcSurveys.reduce((a, s) => a + s.entrenadorEstrellas, 0) / gcSurveys.length).toFixed(1),
    entrenadorInspiroPercent: ((gcSurveys.filter(g => g.entrenadorInspiro).length / gcSurveys.length) * 100).toFixed(0),
    avgCoordinadorRespaldo: (gcSurveys.reduce((a, s) => a + s.coordinadorRespaldo, 0) / gcSurveys.length).toFixed(0)
  } : null;

  // Métricas de Director Audit
  const audits = products.map(p => p.DirectorAudit).filter(Boolean);
  const directorMetrics = audits.length > 0 ? {
    count: audits.length,
    momentosVerdad: {
      registro: {
        passed: audits.filter(a => a.auditRegistro === true).length,
        failed: audits.filter(a => a.auditRegistro === false).length
      },
      concentracion: {
        passed: audits.filter(a => a.auditConcentracion === true).length,
        failed: audits.filter(a => a.auditConcentracion === false).length
      },
      breakLargo: {
        passed: audits.filter(a => a.auditBreakLargo === true).length,
        failed: audits.filter(a => a.auditBreakLargo === false).length
      },
      enrolamiento: {
        passed: audits.filter(a => a.auditEnrolamiento === true).length,
        failed: audits.filter(a => a.auditEnrolamiento === false).length
      },
      salaActiva: {
        passed: audits.filter(a => a.auditSalaActiva === true).length,
        failed: audits.filter(a => a.auditSalaActiva === false).length
      },
      breakCorto: {
        passed: audits.filter(a => a.auditBreakCorto === true).length,
        failed: audits.filter(a => a.auditBreakCorto === false).length
      }
    },
    excelenciaSalon: calculateExcellenceMetrics(audits, [
      'limpiezaGeneral', 'equipoSonido', 'visualesPantalla', 
      'materialesRotafolio', 'insumosBaul', 'cumplimientoTareas', 'mesaControl'
    ]),
    excelenciaInstalaciones: calculateExcellenceMetrics(audits, [
      'climaAire', 'banosLimpieza', 'sillasEstado', 'pinturaParedes', 'brandingVinilos'
    ]),
    avgLiderazgoCapitanias: audits.filter(a => a.liderazgoCapitanias).length > 0
      ? (audits.filter(a => a.liderazgoCapitanias).reduce((a, s) => a + s.liderazgoCapitanias, 0) / 
         audits.filter(a => a.liderazgoCapitanias).length).toFixed(1)
      : null
  } : null;

  return {
    trainer: trainerMetrics,
    gameChangers: gcMetrics,
    director: directorMetrics,
    completionRate: products.length > 0
      ? ((products.filter(p => 
          p.TrainerSurveys.length > 0 && 
          p.GameChangerSurveys.length > 0 && 
          p.DirectorAudit
        ).length / products.length) * 100).toFixed(0)
      : 0
  };
}

function calculateExcellenceMetrics(audits: any[], fields: string[]) {
  const result: any = {};
  
  fields.forEach(field => {
    const values = audits.map(a => a[field]).filter(Boolean);
    result[field] = {
      EXCELENTE: values.filter(v => v === 'EXCELENTE').length,
      ACEPTABLE: values.filter(v => v === 'ACEPTABLE').length,
      FALLA: values.filter(v => v === 'FALLA').length
    };
  });
  
  return result;
}
