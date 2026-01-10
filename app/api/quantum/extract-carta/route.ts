import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/quantum/extract-carta
 * Extrae información de carta desde la conversación con Quantum IA
 */
export async function POST(req: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversacion } = await req.json();

    if (!conversacion || !Array.isArray(conversacion)) {
      return NextResponse.json({ error: 'Conversación inválida' }, { status: 400 });
    }

    // Obtener áreas asignadas al usuario desde su Vision
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: { participanteId: session.user.id },
      include: {
        Vision: {
          select: {
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
      orderBy: { createdAt: 'desc' }
    });

    const areasAsignadas = visionParticipante?.Vision ? {
      finanzas: visionParticipante.Vision.forceFinanzasArea,
      relaciones: visionParticipante.Vision.forceRelacionesArea,
      talentos: visionParticipante.Vision.forceTalentosArea,
      salud: visionParticipante.Vision.forceSaludArea,
      pazMental: visionParticipante.Vision.forcePazMentalArea,
      ocio: visionParticipante.Vision.forceOcioArea,
      transformacion: visionParticipante.Vision.forceTransformationArea,
      comunidad: visionParticipante.Vision.forceCommunityServiceArea,
    } : {
      // Si no hay Vision, solo habilitar áreas básicas
      finanzas: false,
      relaciones: true,
      talentos: false,
      salud: true,
      pazMental: false,
      ocio: false,
      transformacion: false,
      comunidad: false,
    };

    console.log('📋 Áreas asignadas desde Vision:', areasAsignadas);

    // Construir lista de áreas disponibles
    const areasDisponibles = [];
    if (areasAsignadas.finanzas) areasDisponibles.push('Finanzas');
    if (areasAsignadas.relaciones) areasDisponibles.push('Relaciones');
    if (areasAsignadas.talentos) areasDisponibles.push('Talentos');
    if (areasAsignadas.salud) areasDisponibles.push('Salud');
    if (areasAsignadas.pazMental) areasDisponibles.push('Paz Mental');
    if (areasAsignadas.ocio) areasDisponibles.push('Ocio');
    if (areasAsignadas.transformacion) areasDisponibles.push('Servicio Transformacional');
    if (areasAsignadas.comunidad) areasDisponibles.push('Servicio Comunitario');

    // Prompt de extracción estructurada
    const extractionPrompt = `Eres un asistente experto en extraer información estructurada de conversaciones sobre objetivos de vida.

El usuario tiene acceso a las siguientes áreas: ${areasDisponibles.join(', ')}

De la conversación proporcionada, extrae la siguiente información SOLO para las áreas mencionadas arriba:

Para cada área (si aplica):
1. **Declaración del Ser (CRÍTICO)**: Una declaración profunda de identidad en primera persona presente. Busca frases como:
   - "Yo soy [cualidad/identidad] que [acción/impacto]"
   - Ejemplos: "Yo soy compromiso que genera abundancia", "Yo soy amor que construye vínculos", "Yo soy impacto que transforma vidas"
   - Si no está explícita, intenta inferirla de la conversación sobre quién quiere SER la persona
   - Máximo 200 caracteres
2. **Objetivos**: Qué quiere lograr específicamente (máximo 200 caracteres)
3. **Acciones**: Lista de acciones concretas y medibles que realizará
4. **Frecuencia**: Para cada acción, la frecuencia (Diaria, Lun-Vie, Personalizada)
5. **Días específicos**: Si es personalizada, qué días (Lunes, Martes, etc.)

IMPORTANTE: 
- Para áreas como SERVICIO TRANSFORMACIONAL y COMUNIDAD, la declaración del ser es ESENCIAL
- Si el usuario menciona quién quiere ser o cómo se define, captúralo en "declaracion"
- Si dice cosas como "quiero ser una persona que ayuda", conviértelo a: "Yo soy ayuda que transforma comunidades"

Responde ÚNICAMENTE con un JSON válido siguiendo esta estructura exacta:

{
  "finanzas": {
    "declaracion": "string o null",
    "objetivo": "string o null",
    "acciones": [
      {
        "nombre": "string",
        "frecuencia": "Diaria|Lun-Vie|Personalizada",
        "dias": ["Lunes", "Martes"] // solo si es Personalizada
      }
    ]
  },
  "relaciones": { ... },
  "talentos": { ... },
  "salud": { ... },
  "pazMental": { ... },
  "ocio": { ... },
  "transformacion": { ... },
  "comunidad": { ... }
}

Si no hay información para un área, devuelve:
{
  "declaracion": null,
  "objetivo": null,
  "acciones": []
}

IMPORTANTE:
- NO incluyas áreas que no estén en la lista de áreas disponibles
- Si una acción no tiene frecuencia especificada, usa "Diaria" por defecto
- Las declaraciones deben ser en primera persona y presente ("Soy...", "Estoy...")
- Los objetivos deben ser específicos y medibles
- Las acciones deben ser concretas y accionables

Conversación:
${JSON.stringify(conversacion, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un extractor de información estructurada. SOLO respondes con JSON válido, sin markdown ni explicaciones.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const extractedText = completion.choices[0].message.content;
    if (!extractedText) {
      return NextResponse.json({ error: 'No se pudo extraer información' }, { status: 500 });
    }

    const cartaData = JSON.parse(extractedText);

    // Validar y limpiar datos
    const cleanedData: any = {};
    
    for (const area of Object.keys(cartaData)) {
      const areaData = cartaData[area];
      if (!areaData || typeof areaData !== 'object') continue;

      cleanedData[area] = {
        declaracion: areaData.declaracion?.substring(0, 200) || null,
        objetivo: areaData.objetivo?.substring(0, 200) || null,
        acciones: Array.isArray(areaData.acciones) 
          ? areaData.acciones.map((accion: any) => ({
              nombre: accion.nombre?.substring(0, 150) || '',
              frecuencia: ['Diaria', 'Lun-Vie', 'Personalizada'].includes(accion.frecuencia) 
                ? accion.frecuencia 
                : 'Diaria',
              dias: accion.frecuencia === 'Personalizada' && Array.isArray(accion.dias)
                ? accion.dias.filter((d: string) => 
                    ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(d)
                  )
                : []
            }))
          : []
      };
    }

    return NextResponse.json({
      success: true,
      cartaData: cleanedData,
      areasDisponibles
    });

  } catch (error) {
    console.error('❌ Error extrayendo carta:', error);
    return NextResponse.json(
      { error: 'Error al extraer información de la carta' },
      { status: 500 }
    );
  }
}
