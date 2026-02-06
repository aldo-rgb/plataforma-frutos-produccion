import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface MisionGenerada {
  title: string;
  description: string;
  points_reward: number;
  evidence_requirement: string;
  vibe: string;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const { response } = rateLimit(req, RateLimitPresets.ai);
    if (response) {
      logger.warn('Rate limit exceeded on quantum/generar-misiones');
      return response;
    }

    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { vibe } = await req.json();

    if (!vibe || !['energia', 'conexion', 'viralidad'].includes(vibe)) {
      return NextResponse.json({ error: 'Vibe inválido' }, { status: 400 });
    }

    // Mapeo de vibes a descripciones
    const vibeDescriptions = {
      energia: 'Energía Alta / Competencia - Para despertar al grupo con retos físicos, velocidad, quién lo hace primero',
      conexion: 'Conexión Profunda / Vulnerabilidad - Para unir al equipo compartiendo historias, gratitud, conociéndose mejor',
      viralidad: 'Viralidad / Diversión - Para romper el hielo con fotos locas, memes internos, creatividad'
    };

    const systemPrompt = `Eres QUANTUM, experto en Gamification y Team Building de alto rendimiento. El Coordinador necesita activar a los equipos.

Categoría solicitada: ${vibeDescriptions[vibe as keyof typeof vibeDescriptions]}

Genera 3 opciones de 'Tareas Extraordinarias' para un programa de desarrollo personal y liderazgo.

REGLAS ESTRICTAS:
1. Interacción Obligatoria: La tarea no puede hacerse solo; requiere al menos 2 personas o interacción con el grupo.
2. Evidencia Visual: Debe ser comprobable con una foto o video.
3. Puntos Sugeridos: Asigna valor (300 a 1000 PC) según la dificultad.
4. Títulos Épicos: Usa nombres atractivos (ej: 'Operación Fénix', 'La Hora de la Verdad').
5. Descripción Clara: Instrucciones específicas de qué deben hacer y cómo evidenciarlo.
6. Sin tareas genéricas: Cada misión debe ser específica y emocionante.

Responde ÚNICAMENTE con un JSON array válido (sin markdown, sin explicaciones):
[
  {
    "title": "Nombre épico de la misión",
    "description": "Descripción detallada de qué hacer y cómo evidenciarlo",
    "points_reward": 500,
    "evidence_requirement": "Descripción de qué foto/video deben subir",
    "vibe": "${vibe}"
  }
]`;

    logger.debug('🧠 Generando misiones con QUANTUM...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Genera 3 misiones de equipo épicas para el vibe: ${vibe}. Responde solo con JSON válido.`
        }
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    logger.debug('📝 Respuesta de OpenAI:', responseText);

    // Limpiar la respuesta (remover markdown si existe)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const misiones: MisionGenerada[] = JSON.parse(cleanedResponse);

    // Validar estructura
    if (!Array.isArray(misiones) || misiones.length === 0) {
      throw new Error('Respuesta inválida de OpenAI');
    }

    // Validar cada misión
    misiones.forEach((mision, index) => {
      if (!mision.title || !mision.description || !mision.points_reward) {
        throw new Error(`Misión ${index + 1} tiene campos incompletos`);
      }
    });

    logger.debug('✅ Misiones generadas exitosamente:', misiones.length);

    return NextResponse.json({ 
      misiones,
      vibe,
      generated_at: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ Error generando misiones:', error);
    
    // Fallback: Misiones predefinidas
    const fallbackMisiones = {
      energia: [
        {
          title: '⚡️ Desafío 100 Burpees en Equipo',
          description: 'Reúnanse al menos 3 personas y completen juntos 100 burpees. Pueden dividirlos como quieran pero todos deben participar. Evidencia: Video de mínimo 15 segundos mostrando a todos participando.',
          points_reward: 500,
          evidence_requirement: 'Video del equipo haciendo burpees juntos',
          vibe: 'energia'
        },
        {
          title: '🏃 Carrera de Relevos del Conocimiento',
          description: 'Cada miembro del equipo debe grabarse respondiendo una pregunta difícil sobre desarrollo personal. Si uno falla, el siguiente debe responder 2 preguntas. Evidencia: Video compilado de todos participando.',
          points_reward: 700,
          evidence_requirement: 'Video compilado de todos los miembros',
          vibe: 'energia'
        },
        {
          title: '⏱️ El Reto de los 60 Segundos',
          description: 'Graben un video de 60 segundos donde cada miembro del equipo comparta su mayor meta del mes. Sin editar, toma única, energía alta. Si alguien se traba, empiezan de nuevo.',
          points_reward: 600,
          evidence_requirement: 'Video de 60 segundos exactos del equipo',
          vibe: 'energia'
        }
      ],
      conexion: [
        {
          title: '💌 Cadena de Gratitud Profunda',
          description: 'Cada miembro debe enviar un mensaje de voz de mínimo 1 minuto a otro miembro (no su mejor amigo) expresando gratitud por algo específico. Evidencia: Screenshot del mensaje enviado y recibido.',
          points_reward: 800,
          evidence_requirement: 'Screenshot de mensaje de voz enviado y confirmación',
          vibe: 'conexion'
        },
        {
          title: '🎭 La Historia Que Nunca Conté',
          description: 'Reúnanse en persona o videollamada. Cada uno comparte una historia vulnerable que nunca han contado al grupo (2-3 min cada uno). Evidencia: Foto del grupo reunido + post con reflexión.',
          points_reward: 1000,
          evidence_requirement: 'Foto del grupo + post reflexivo',
          vibe: 'conexion'
        },
        {
          title: '🌟 Espejo de Fortalezas',
          description: 'En un documento colaborativo, cada miembro escribe 3 fortalezas específicas de cada compañero (con ejemplos concretos). Evidencia: Screenshot del documento completo.',
          points_reward: 700,
          evidence_requirement: 'Screenshot del documento colaborativo completo',
          vibe: 'conexion'
        }
      ],
      viralidad: [
        {
          title: '📸 Selfie Pirámide Humana',
          description: 'Mínimo 4 personas formando una pirámide humana en un lugar público. La foto debe mostrar caras felices y al menos 3 transeúntes mirando sorprendidos. Modo: ridiculez total.',
          points_reward: 500,
          evidence_requirement: 'Foto de pirámide humana en lugar público',
          vibe: 'viralidad'
        },
        {
          title: '🎬 TikTok del Grito de Guerra',
          description: 'Creen su grito de guerra del equipo (15-30 seg) y grábenlo estilo TikTok en un lugar concurrido. Debe incluir coreografía, energía y vergüenza superada.',
          points_reward: 800,
          evidence_requirement: 'Video TikTok del equipo gritando',
          vibe: 'viralidad'
        },
        {
          title: '🎨 Meme Interno del Equipo',
          description: 'Creen un meme original sobre alguna situación interna del equipo (chiste interno). Debe ser entendible solo por ustedes. Suban el meme + expliquen el contexto al coordinador.',
          points_reward: 400,
          evidence_requirement: 'Imagen del meme + explicación escrita',
          vibe: 'viralidad'
        }
      ]
    };

    const vibeKey = error.message.includes('API') ? 'energia' : 'conexion';
    
    return NextResponse.json({ 
      misiones: fallbackMisiones[vibeKey as keyof typeof fallbackMisiones] || fallbackMisiones.energia,
      vibe: vibeKey,
      generated_at: new Date().toISOString(),
      fallback: true
    });
  }
}
