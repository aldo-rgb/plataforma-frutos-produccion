import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AREA_CONTEXTS: Record<string, string> = {
  finanzas: 'objetivos financieros como ingresos, ahorros, inversiones, eliminación de deudas, creación de activos',
  relaciones: 'objetivos relacionales como fortalecer vínculos, conocer personas nuevas, mejorar comunicación, resolver conflictos',
  talentos: 'objetivos de desarrollo de habilidades, proyectos creativos, aprendizaje, certificaciones, expresión artística',
  salud: 'objetivos de fitness, nutrición, peso corporal, resistencia, flexibilidad, hábitos saludables',
  pazMental: 'objetivos de meditación, manejo del estrés, mindfulness, terapia, equilibrio emocional',
  ocio: 'objetivos de hobbies, viajes, experiencias, descanso, diversión, tiempo de calidad',
  servicioTrans: 'objetivos de mentoría, enseñanza, impacto transformacional en otros, liderazgo de cambio',
  servicioComun: 'objetivos de voluntariado, ayuda comunitaria, proyectos sociales, contribución al entorno'
};

const AREA_NAMES: Record<string, string> = {
  finanzas: 'FINANZAS',
  relaciones: 'RELACIONES',
  talentos: 'TALENTOS',
  salud: 'SALUD',
  pazMental: 'PAZ MENTAL',
  ocio: 'OCIO',
  servicioTrans: 'SERVICIO TRANSFORMACIONAL',
  servicioComun: 'SERVICIO COMUNITARIO'
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { area, identityStatement } = await req.json();

    if (!area || !AREA_CONTEXTS[area]) {
      return NextResponse.json({ error: 'Área inválida' }, { status: 400 });
    }

    // Detectar timezone del usuario
    const timezone = req.headers.get('x-timezone') || 'America/Mexico_City';
    const isMexico = timezone.includes('Mexico') || timezone.includes('America/Tijuana') || 
                     timezone.includes('America/Mazatlan') || timezone.includes('America/Monterrey');
    const isUSA = timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles') || 
                  timezone.includes('America/Chicago') || timezone.includes('America/Denver');
    
    // Determinar ejemplos de moneda
    const moneyExample = isMexico ? '$10,000 MXN' : '$10,000 USD';

    const areaContext = AREA_CONTEXTS[area];
    const areaName = AREA_NAMES[area];

    const systemPrompt = `Eres QUANTUM, un estratega de metas de alto impacto. Tu misión es inspirar ambición inteligente.

El usuario está trabajando en el área: ${areaName}
${identityStatement ? `Su identidad declarada es: "${identityStatement}"` : ''}
${isMexico ? 'País: México (usa pesos mexicanos MXN para ejemplos financieros)' : isUSA ? 'País: USA (usa dólares USD para ejemplos financieros)' : ''}

⏱️ **MARCO TEMPORAL CRÍTICO: Estos objetivos deben ser alcanzables en 3 MESES (90 días)**

Genera exactamente 4 objetivos sugeridos en formato JSON que cumplan estos criterios:

1. **FÓRMULA DE PODER**: Verbo de Acción + Resultado Exacto (Número/Evento/Métrica)
2. Cada objetivo debe ser ambicioso pero REALISTA para completar en 3 MESES
3. **NO INCLUYAS FECHAS ESPECÍFICAS** - Las fechas se definirán en pasos posteriores
4. Enfócate en el resultado medible y específico que se pueda lograr en 90 días
5. Contexto: ${areaContext}
6. **IMPORTANTE**: Ajusta las expectativas al período de 3 meses - evita objetivos que requieran 6 meses o 1 año

EJEMPLOS DE FORMATO CORRECTO (Objetivos alcanzables en 3 meses, sin fechas):
✅ "Incrementar mis ingresos mensuales en un 15%" (realista en 3 meses)
✅ "Generar ${isMexico ? '$5,000 MXN' : '$500 USD'} extra en ingresos secundarios" (alcanzable en 90 días)
✅ "Reducir mi deuda total en ${isMexico ? '$15,000 MXN' : '$1,500 USD'}" (objetivo trimestral)
✅ "Correr 10 kilómetros sin parar" (progresión realista en 3 meses)
✅ "Perder 8kg de peso corporal" (2-3kg por mes es saludable)
✅ "Completar 3 proyectos para mi portafolio profesional" (1 por mes)
✅ "Establecer una rutina de meditación diaria de 15 minutos" (hábito en 3 meses)
✅ "Reducir consumo de azúcar procesada en un 80%" (cambio gradual trimestral)

FORMATO INCORRECTO (NO uses estos):
❌ "Mejorar mis finanzas" (muy vago, sin número)
❌ "Ser más saludable" (sin acción específica, sin medición)
❌ "Generar ${isMexico ? '$100,000 MXN' : '$10,000 USD'} en ingresos pasivos" (poco realista en 3 meses)
❌ "Correr un maratón completo (42k)" (requiere más de 3 meses de entrenamiento)
❌ "Crear un negocio rentable con 10 clientes" (timeline de 6-12 meses)
❌ "Ahorrar antes del 31 de diciembre" (incluye fecha específica)

Devuelve SOLO un JSON con esta estructura exacta:
{
  "objetivos": [
    "Objetivo 1 alcanzable en 3 meses sin fecha",
    "Objetivo 2 alcanzable en 3 meses sin fecha",
    "Objetivo 3 alcanzable en 3 meses sin fecha",
    "Objetivo 4 alcanzable en 3 meses sin fecha"
  ]
}

NO incluyas explicaciones adicionales. SOLO el JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera 4 objetivos poderosos para el área ${areaName}. Usa la Fórmula de Poder estrictamente.` }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(responseText);

    if (!parsedResponse.objetivos || !Array.isArray(parsedResponse.objetivos)) {
      throw new Error('Formato de respuesta inválido');
    }

    return NextResponse.json({
      success: true,
      objetivos: parsedResponse.objetivos.slice(0, 4), // Asegurar máximo 4
      area: areaName
    });

  } catch (error: any) {
    console.error('❌ Error generando sugerencias QUANTUM:', error);
    return NextResponse.json(
      { error: 'Error generando sugerencias', details: error.message },
      { status: 500 }
    );
  }
}
