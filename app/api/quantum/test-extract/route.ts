import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/test-extract
 * Genera datos de prueba pre-configurados para testing de extracción de carta
 * SOLO para desarrollo/testing
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Obtener áreas configuradas del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              select: {
                nombre: true,
                forceFinanzasArea: true,
                forceRelacionesArea: true,
                forceTalentosArea: true,
                forceSaludArea: true,
                forcePazMentalArea: true,
                forceOcioArea: true,
                forceTransformationArea: true,
                forceCommunityServiceArea: true,
              }
            }
          },
          take: 1
        }
      }
    });

    const visionConfig = usuario?.ParticipanteEnVisiones?.[0]?.Vision;

    // Si no hay visión, usar configuración por defecto (todas menos servicios)
    const areasHabilitadas = visionConfig ? {
      finanzas: visionConfig.forceFinanzasArea,
      relaciones: visionConfig.forceRelacionesArea,
      talentos: visionConfig.forceTalentosArea,
      salud: visionConfig.forceSaludArea,
      pazMental: visionConfig.forcePazMentalArea,
      ocio: visionConfig.forceOcioArea,
      servicioTrans: visionConfig.forceTransformationArea,
      servicioComun: visionConfig.forceCommunityServiceArea,
    } : {
      finanzas: true,
      relaciones: true,
      talentos: true,
      salud: true,
      pazMental: true,
      ocio: true,
      servicioTrans: false,
      servicioComun: false,
    };

    // Datos de prueba completos por área
    const datosPrueba: Record<string, any> = {
      finanzas: {
        declaracion: "Yo soy abundancia en acción constante que genera valor en el mundo",
        objetivo: "Alcanzar ingresos de $50,000 MXN mensuales mediante mi emprendimiento digital",
        acciones: [
          {
            descripcion: "Prospección de clientes potenciales por LinkedIn",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
          },
          {
            descripcion: "Revisar y optimizar estrategias de ventas",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Lunes", "Jueves"]
          },
          {
            descripcion: "Sesión de actualización de habilidades empresariales",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Sábado"]
          }
        ]
      },
      relaciones: {
        declaracion: "Yo soy conexión genuina que cultiva vínculos profundos y significativos",
        objetivo: "Fortalecer mis relaciones familiares y crear un círculo de 5 amigos cercanos de alto nivel",
        acciones: [
          {
            descripcion: "Llamada de calidad con un familiar",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
          },
          {
            descripcion: "Cena familiar sin distracciones",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Viernes", "Domingo"]
          },
          {
            descripcion: "Networking presencial o virtual con personas de valor",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Miércoles"]
          }
        ]
      },
      talentos: {
        declaracion: "Yo soy creatividad desbordante que transforma ideas en obras maestras",
        objetivo: "Dominar diseño UX/UI y crear un portafolio de 10 proyectos impactantes",
        acciones: [
          {
            descripcion: "Práctica de diseño en Figma (tutoriales avanzados)",
            frecuencia: "LUN_VIE",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
          },
          {
            descripcion: "Trabajar en proyecto personal del portafolio",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Sábado", "Domingo"]
          },
          {
            descripcion: "Estudiar tendencias de diseño y casos de éxito",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Martes", "Jueves"]
          }
        ]
      },
      salud: {
        declaracion: "Yo soy energía vital que honra y cuida mi templo sagrado",
        objetivo: "Alcanzar mi peso ideal de 75kg con 15% de grasa corporal y sentirme fuerte",
        acciones: [
          {
            descripcion: "Entrenamiento funcional en gimnasio (60 min)",
            frecuencia: "LUN_VIE",
            diasSemana: ["Lunes", "Miércoles", "Viernes"]
          },
          {
            descripcion: "Preparar meal prep saludable para la semana",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Domingo"]
          },
          {
            descripcion: "Caminata al aire libre (30 min mínimo)",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
          }
        ]
      },
      pazMental: {
        declaracion: "Yo soy serenidad consciente que fluye en armonía con el universo",
        objetivo: "Practicar meditación diaria y reducir mi nivel de estrés a 3/10",
        acciones: [
          {
            descripcion: "Meditación guiada matutina (15 minutos)",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
          },
          {
            descripcion: "Journaling de gratitud y reflexión",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
          },
          {
            descripcion: "Sesión de yoga o tai chi",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Martes", "Jueves", "Sábado"]
          }
        ]
      },
      ocio: {
        declaracion: "Yo soy disfrute pleno que celebra cada momento de descanso con gratitud",
        objetivo: "Disfrutar 10 horas semanales de actividades recreativas que me recarguen",
        acciones: [
          {
            descripcion: "Leer un libro que me apasione (30 min)",
            frecuencia: "DIARIA",
            diasSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
          },
          {
            descripcion: "Ver serie o película con seres queridos",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Viernes", "Sábado"]
          },
          {
            descripcion: "Salida recreativa (cine, museo, parque, evento)",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Domingo"]
          }
        ]
      },
      servicioTrans: {
        declaracion: "Yo soy impacto positivo que transforma vidas y eleva comunidades",
        objetivo: "Impactar a 100 personas mediante mentoría y servicio transformacional",
        acciones: [
          {
            descripcion: "Sesión de mentoría a persona que lo necesite",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Miércoles", "Sábado"]
          },
          {
            descripcion: "Crear contenido educativo gratuito (video, blog, podcast)",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Domingo"]
          },
          {
            descripcion: "Voluntariado en organización de impacto social",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Sábado"]
          }
        ]
      },
      servicioComun: {
        declaracion: "Yo soy contribución generosa que fortalece mi comunidad inmediata",
        objetivo: "Participar activamente en 3 proyectos comunitarios de mi colonia/ciudad",
        acciones: [
          {
            descripcion: "Participar en junta vecinal o comunitaria",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Sábado"]
          },
          {
            descripcion: "Actividad de limpieza o mejora en mi comunidad",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Domingo"]
          },
          {
            descripcion: "Apoyo a vecino o familiar que lo necesite",
            frecuencia: "PERSONALIZADA",
            diasSemana: ["Miércoles"]
          }
        ]
      }
    };

    // Filtrar solo las áreas habilitadas
    const datosExtraidos: Record<string, any> = {};
    
    Object.keys(areasHabilitadas).forEach(areaKey => {
      if (areasHabilitadas[areaKey as keyof typeof areasHabilitadas] && datosPrueba[areaKey]) {
        datosExtraidos[areaKey] = datosPrueba[areaKey];
      }
    });

    // Crear el prompt que simula la conversación
    const areasNombres: Record<string, string> = {
      finanzas: 'Finanzas',
      relaciones: 'Relaciones',
      talentos: 'Talentos',
      salud: 'Salud',
      pazMental: 'Paz Mental',
      ocio: 'Ocio',
      servicioTrans: 'Servicio Transformacional',
      servicioComun: 'Servicio Comunitario'
    };

    const conversacionSimulada = `**DATOS DE PRUEBA - CARTA F.R.U.T.O.S. COMPLETA**

Quantum IA: ¡Perfecto! Vamos a crear tu Carta F.R.U.T.O.S. completa. Te voy a hacer algunas preguntas clave sobre cada área de tu vida.

${Object.keys(datosExtraidos).map(areaKey => {
  const area = datosExtraidos[areaKey];
  const nombre = areasNombres[areaKey];
  
  return `
═══════════════════════════════════════
📌 ${nombre.toUpperCase()}
═══════════════════════════════════════

Quantum: ¿Quién quieres SER en ${nombre}?
Usuario: ${area.declaracion}

Quantum: Excelente declaración. ¿Qué OBJETIVO específico quieres alcanzar?
Usuario: ${area.objetivo}

Quantum: Perfecto. ¿Qué ACCIONES concretas vas a realizar para lograrlo?
Usuario: ${area.acciones.map((a: any, i: number) => 
  `${i + 1}. ${a.descripcion} - ${a.frecuencia === 'DIARIA' ? 'Todos los días' : 
     a.frecuencia === 'LUN_VIE' ? 'De lunes a viernes' : 
     'Días: ' + a.diasSemana.join(', ')}`
).join('\n')}
`;
}).join('\n')}

═══════════════════════════════════════

Quantum: ¡INCREÍBLE! Tu Carta F.R.U.T.O.S. está completa. He capturado toda la información y ahora voy a estructurarla para que puedas comenzar tu transformación. 🚀`;

    return NextResponse.json({
      success: true,
      datosExtraidos,
      areasHabilitadas,
      conversacionSimulada,
      mensaje: `Datos de prueba generados para ${Object.keys(datosExtraidos).length} áreas habilitadas.`
    });

  } catch (error: any) {
    console.error('Error generando datos de prueba:', error);
    return NextResponse.json(
      { error: 'Error generando datos de prueba', details: error.message },
      { status: 500 }
    );
  }
}
