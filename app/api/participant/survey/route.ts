import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Verificar si hay encuesta disponible y obtener preguntas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Obtener el usuario con su visión actual
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        currentVisionLevel: true,
        organizationId: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar enrollments activos del usuario
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId,
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED', 'CONFIRMED'] },
      },
      include: {
        Vision: {
          include: {
            SchoolProduct: {
              where: {
                type: 'CORE_TRAINING',
              },
              orderBy: { startDate: 'desc' },
              take: 3, // Obtener más productos para buscar PL completados
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Buscar un producto que esté en su último día
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let availableSurvey: {
      productId: number;
      productName: string;
      levelType: string;
      questions: any[];
    } | null = null;

    for (const enrollment of enrollments) {
      for (const product of enrollment.Vision?.SchoolProduct || []) {
        
        // Para productos PL: verificar si está COMPLETED (después del 3er fin de semana)
        if (product.levelType === 'PL' && enrollment.level === 'PL') {
          if (product.trainingStatus === 'COMPLETED') {
            // Verificar si ya completó esta encuesta
            const existingSurvey = await prisma.participantSurvey.findUnique({
              where: {
                userId_productId: {
                  userId,
                  productId: product.id,
                }
              }
            });

            if (!existingSurvey) {
              // Verificar que el producto se completó recientemente (últimos 7 días)
              const sevenDaysAgo = new Date(todayStart);
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              
              if (product.finishedAt && new Date(product.finishedAt) >= sevenDaysAgo) {
                const questions = getQuestionsForLevel('PL');
                availableSurvey = {
                  productId: product.id,
                  productName: product.name,
                  levelType: 'PL',
                  questions,
                };
                break;
              }
            }
          }
          continue; // PL no usa la lógica de endDate
        }
        
        // Para BASIC y ADVANCED: verificar si hoy es el último día del producto o terminó recientemente
        if (product.endDate) {
          const endDate = new Date(product.endDate);
          // Establecer el fin del día para comparación correcta
          endDate.setHours(23, 59, 59, 999);
          
          const isLastDay = endDate >= todayStart && endDate <= todayEnd;
          
          // También aceptar si el entrenamiento ya terminó recientemente (últimos 3 días)
          // Esto aplica incluso si trainingStatus es COMPLETED
          const threeDaysAgo = new Date(todayStart);
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const recentlyEnded = endDate >= threeDaysAgo && endDate < todayStart;

          if (isLastDay || recentlyEnded) {
            // Verificar que el nivel coincida con el enrollment
            if (product.levelType === enrollment.level || 
                (product.levelType?.startsWith('BASICO') && enrollment.level === 'BASIC')) {
              
              // Verificar si ya completó esta encuesta
              const existingSurvey = await prisma.participantSurvey.findUnique({
                where: {
                  userId_productId: {
                    userId,
                    productId: product.id,
                  }
                }
              });

              if (!existingSurvey) {
                // Determinar preguntas según el nivel
                const questions = getQuestionsForLevel(enrollment.level);
                
                availableSurvey = {
                  productId: product.id,
                  productName: product.name,
                  levelType: enrollment.level,
                  questions,
                };
                break;
              }
            }
          }
        }
      }
      if (availableSurvey) break;
    }

    return NextResponse.json({
      hasSurvey: !!availableSurvey,
      survey: availableSurvey,
      pointsReward: 200,
    });

  } catch (error) {
    logger.error('Error checking participant survey:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Guardar respuestas de la encuesta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { productId, responses } = body;

    if (!productId || !responses) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Verificar que el producto existe
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, levelType: true, visionId: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar que no haya completado ya
    const existing = await prisma.participantSurvey.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya completaste esta encuesta' }, { status: 400 });
    }

    // Determinar el nivel
    let level: 'BASIC' | 'ADVANCED' | 'PL' = 'BASIC';
    if (product.levelType === 'ADVANCED') level = 'ADVANCED';
    else if (product.levelType === 'PL') level = 'PL';

    // Preparar datos según el nivel
    const surveyData: any = {
      userId,
      productId,
      level,
      pointsAwarded: 200,
    };

    // Campos según el nivel
    if (level === 'BASIC') {
      surveyData.apodoNino = responses.apodo || null;
      surveyData.lugarNacimiento = responses.lugarNacimiento || null;
      surveyData.colorFavorito = responses.colorFavorito || null;
      surveyData.caricaturaFavorita = responses.caricaturaFavorita || null;
      surveyData.paisViajar = responses.paisViajar || null;
      // Referidos
      const personas = responses.personasEntrenamiento || [];
      surveyData.referido1 = personas[0]?.name || null;
      surveyData.referido2 = personas[1]?.name || null;
      surveyData.referido3 = personas[2]?.name || null;
      surveyData.referido4 = personas[3]?.name || null;
      surveyData.referido5 = personas[4]?.name || null;
    } else if (level === 'ADVANCED') {
      surveyData.superheroeFavorito = responses.superHeroe || null;
      surveyData.gustaLeer = responses.gustaLeer || false;
      surveyData.autorFavorito = responses.autorFavorito || null;
      surveyData.jugueteDeseado = responses.jugueteNinez || null;
      surveyData.liderAdmiras = responses.liderAdmiras?.name || null;
      surveyData.descripcionLider = responses.liderAdmiras ? 
        `${responses.liderAdmiras.word1 || ''} ${responses.liderAdmiras.word2 || ''} ${responses.liderAdmiras.word3 || ''}`.trim() : null;
      surveyData.descripcionUnaPalabra = responses.palabraDescripcion || null;
      // Referidos
      const personas = responses.personasEntrenamiento || [];
      surveyData.referido1 = personas[0]?.name || null;
      surveyData.referido2 = personas[1]?.name || null;
      surveyData.referido3 = personas[2]?.name || null;
      surveyData.referido4 = personas[3]?.name || null;
      surveyData.referido5 = personas[4]?.name || null;
    } else if (level === 'PL') {
      surveyData.legadoPersonal = responses.legadoPersonal || null;
      surveyData.mayorAprendizaje = responses.mayorAprendizaje || null;
      surveyData.compromisoComunidad = responses.compromisoComunidad || null;
      surveyData.consejoFuturo = responses.consejoFuturo || null;
      // Campos de staff
      const staffData = responses.quiereSerStaff || {};
      surveyData.quiereSerStaff = staffData.staffBasico || staffData.staffAvanzado || 
                                   staffData.staffLiderato || staffData.staffServicio || false;
      surveyData.staffBasico = staffData.staffBasico || false;
      surveyData.staffAvanzado = staffData.staffAvanzado || false;
      surveyData.staffLiderato = staffData.staffLiderato || false;
      surveyData.staffServicio = staffData.staffServicio || false;
    }

    // Guardar la encuesta
    const survey = await prisma.participantSurvey.create({
      data: surveyData
    });

    // Otorgar puntos directamente
    let newTotal = 0;
    try {
      const updatedUser = await prisma.usuario.update({
        where: { id: userId },
        data: {
          puntosCuanticos: {
            increment: 200,
          },
        },
        select: { puntosCuanticos: true }
      });
      newTotal = updatedUser.puntosCuanticos || 0;
    } catch (pointsError) {
      logger.error('Error awarding points for survey:', pointsError);
      // No fallar si los puntos no se pueden otorgar
    }

    logger.debug(`✅ Encuesta participante completada: userId=${userId}, productId=${productId}, +200 puntos`);

    return NextResponse.json({
      success: true,
      message: '¡Encuesta completada! +200 puntos',
      pointsAwarded: 200,
      surveyId: survey.id,
    });

  } catch (error) {
    logger.error('Error saving participant survey:', error);
    return NextResponse.json({ error: 'Error al guardar encuesta' }, { status: 500 });
  }
}

// Función para obtener preguntas según el nivel
function getQuestionsForLevel(level: string): any[] {
  if (level === 'BASIC') {
    return [
      {
        id: 'apodo',
        type: 'text',
        question: '¿Cuál era tu apodo de niño?',
        placeholder: 'Ej: Pepe, Chiquis, Güero...',
        required: true,
        icon: '👶',
      },
      {
        id: 'lugarNacimiento',
        type: 'text',
        question: '¿Dónde naciste?',
        placeholder: 'Ciudad, Estado o País',
        required: true,
        icon: '📍',
      },
      {
        id: 'colorFavorito',
        type: 'color-picker',
        question: '¿Cuál es tu color favorito?',
        options: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
        required: true,
        icon: '🎨',
      },
      {
        id: 'caricaturaFavorita',
        type: 'text',
        question: '¿Cuál era tu caricatura favorita de niño?',
        placeholder: 'Ej: Dragon Ball, Bob Esponja...',
        required: true,
        icon: '📺',
      },
      {
        id: 'paisViajar',
        type: 'text',
        question: '¿A qué país te gustaría viajar?',
        placeholder: 'Ej: Japón, Italia, Egipto...',
        required: true,
        icon: '✈️',
      },
      {
        id: 'personasEntrenamiento',
        type: 'people-list',
        question: '¿A quién de tu entorno ves en el entrenamiento?',
        subtitle: 'Escribe el nombre completo de personas que quisieras invitar',
        minRequired: 3,
        maxItems: 5,
        placeholder: 'Nombre completo',
        required: true,
        icon: '👥',
      },
    ];
  }

  if (level === 'ADVANCED') {
    return [
      {
        id: 'superHeroe',
        type: 'text',
        question: '¿Cuál es tu superhéroe favorito?',
        placeholder: 'Ej: Spider-Man, Batman, Wonder Woman...',
        required: true,
        icon: '🦸',
      },
      {
        id: 'gustaLeer',
        type: 'boolean-conditional',
        question: '¿Te gusta leer?',
        required: true,
        icon: '📚',
        conditionalQuestion: {
          id: 'autorFavorito',
          question: '¿Cuál es tu autor favorito?',
          placeholder: 'Ej: Gabriel García Márquez, Stephen King...',
        }
      },
      {
        id: 'jugueteNinez',
        type: 'text',
        question: '¿Qué juguete te hubiera gustado tener de niño?',
        placeholder: 'Ese juguete que siempre quisiste...',
        required: true,
        icon: '🧸',
      },
      {
        id: 'liderAdmiras',
        type: 'leader-description',
        question: '¿Qué líder admiras? Descríbelo en 3 palabras',
        placeholder: 'Nombre del líder',
        required: true,
        icon: '👑',
      },
      {
        id: 'palabraDescripcion',
        type: 'single-word',
        question: 'En UNA palabra, ¿cómo te describes?',
        placeholder: 'Una sola palabra...',
        required: true,
        icon: '💫',
        maxLength: 20,
      },
      {
        id: 'personasEntrenamiento',
        type: 'people-list',
        question: '¿A quién de tu entorno ves en el entrenamiento?',
        subtitle: 'Escribe el nombre completo de personas que quisieras invitar',
        minRequired: 3,
        maxItems: 5,
        placeholder: 'Nombre completo',
        required: true,
        icon: '👥',
      },
    ];
  }

  // PL (nivel 3) - Después del 3er fin de semana
  return [
    {
      id: 'legadoPersonal',
      type: 'textarea',
      question: '¿Cuál es el legado que quieres dejar?',
      placeholder: 'Describe el impacto que quieres tener en el mundo...',
      required: true,
      icon: '🌟',
      maxLength: 500,
    },
    {
      id: 'mayorAprendizaje',
      type: 'textarea',
      question: '¿Cuál ha sido tu mayor aprendizaje en este programa?',
      placeholder: 'Reflexiona sobre tu transformación...',
      required: true,
      icon: '💡',
      maxLength: 500,
    },
    {
      id: 'compromisoComunidad',
      type: 'text',
      question: '¿Qué te comprometes a aportar a tu comunidad?',
      placeholder: 'Tu compromiso de servicio...',
      required: true,
      icon: '🤝',
    },
    {
      id: 'consejoFuturo',
      type: 'textarea',
      question: '¿Qué consejo le darías a quien está por iniciar este camino?',
      placeholder: 'Comparte tu sabiduría...',
      required: true,
      icon: '📜',
      maxLength: 300,
    },
    {
      id: 'quiereSerStaff',
      type: 'staff-interest',
      question: '¿Quieres ser Staff?',
      subtitle: 'Selecciona en qué niveles te gustaría participar como staff',
      required: true,
      icon: '🎯',
      options: [
        { id: 'staffBasico', label: 'Básico', icon: '🌱' },
        { id: 'staffAvanzado', label: 'Avanzado', icon: '🚀' },
        { id: 'staffLiderato', label: 'Liderato', icon: '👑' },
        { id: 'staffServicio', label: 'Servicio', icon: '🤝' },
      ],
    },
  ];
}
