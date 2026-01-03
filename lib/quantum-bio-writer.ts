/**
 * 🧬 QUANTUM BIO-WRITER
 * 
 * Motor de IA para crear perfiles de mentor con autoridad.
 * Entrevista al mentor y genera biografía profesional en estilo "Viaje del Héroe".
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type MentorStyle = 'HARDCORE' | 'EMPATHIC' | 'BALANCED';

export interface InterviewContext {
  mainAchievement?: string;
  mentorshipStyle?: string;
  idealClient?: string;
  currentStep: 1 | 2 | 3 | 4;
}

export interface BioResult {
  // Biografías
  heroJourneyBio: string;           // Bio narrativa (100-150 palabras)
  promiseStatement: string;         // Frase de impacto (20-30 palabras)
  tagline: string;                  // Tagline corta (5-10 palabras)
  vision: string;                   // Visión personal (30-50 palabras)
  
  // Títulos profesionales
  jobTitle: string;                 // Título profesional (ej: "Desarrollador de Pensamiento")
  mentorTitle: string;              // Título de mentor (ej: "Certificado en PL")
  
  // Especialidades y habilidades
  mainSpecialty: string;            // Especialidad principal
  secondarySpecialties: string[];   // Especialidades secundarias (3-4)
  keySkills: string[];              // Habilidades clave (5-7)
  achievements: string[];           // Logros principales (3-5)
  
  // Metadatos
  detectedStyle: MentorStyle;       // Estilo detectado
  expertiseTags: string[];          // Tags extraídos
}

/**
 * Sistema de prompts para la entrevista progresiva
 */
const INTERVIEW_SYSTEM_PROMPT = `Eres QUANTUM, experto en Personal Branding para mentores de alto rendimiento.

Tu objetivo es redactar un perfil profesional VENDEDOR que genere Confianza y Autoridad.

TONO: Autoridad, Confianza, Éxito. Nunca corporativo ni aburrido.
ESTILO: Directo, inspirador, orientado a resultados.

Tu trabajo es hacer 3 preguntas clave y luego generar el perfil.`;

/**
 * Preguntas de la entrevista
 */
export const INTERVIEW_QUESTIONS = {
  1: "¡Hola! Soy QUANTUM, tu asistente de Personal Branding. 🎙️\n\nCuéntame: **¿Cuál es tu mayor logro profesional o de vida?** (El que te hace sentir más orgulloso)",
  2: "Perfecto. Ahora dime: **¿Cuál es tu estilo de mentoría?**\n\n- ¿Eres un coach duro y directo que exige resultados?\n- ¿O prefieres ser una guía paciente que acompaña el proceso?",
  3: "Última pregunta: **¿Quién es tu cliente ideal?**\n\nDescribe al tipo de persona que más se beneficia de trabajar contigo.",
};

/**
 * Genera la siguiente pregunta o el resultado final
 */
export async function processInterviewStep(
  context: InterviewContext,
  userResponse: string
): Promise<{ nextQuestion?: string; result?: BioResult; isComplete: boolean }> {
  
  // Guardar respuesta en el contexto
  if (context.currentStep === 1) {
    context.mainAchievement = userResponse;
    context.currentStep = 2;
    return {
      nextQuestion: INTERVIEW_QUESTIONS[2],
      isComplete: false,
    };
  }
  
  if (context.currentStep === 2) {
    context.mentorshipStyle = userResponse;
    context.currentStep = 3;
    return {
      nextQuestion: INTERVIEW_QUESTIONS[3],
      isComplete: false,
    };
  }
  
  if (context.currentStep === 3) {
    context.idealClient = userResponse;
    context.currentStep = 4;
    
    // Generar el perfil completo
    const bioResult = await generateBioFromInterview(context);
    
    return {
      result: bioResult,
      isComplete: true,
    };
  }
  
  throw new Error('Invalid interview step');
}

/**
 * Genera la biografía completa usando GPT-4
 */
async function generateBioFromInterview(context: InterviewContext): Promise<BioResult> {
  const prompt = `Basándote en esta entrevista, genera un perfil COMPLETO de mentor profesional:

LOGRO PRINCIPAL: "${context.mainAchievement}"
ESTILO DE MENTORÍA: "${context.mentorshipStyle}"
CLIENTE IDEAL: "${context.idealClient}"

Genera el siguiente JSON (sin markdown, solo JSON puro):

{
  "heroJourneyBio": "Bio narrativa en PRIMERA PERSONA, estilo 'Viaje del Héroe'. Cuenta su transformación y por qué es relevante para el cliente. 100-150 palabras. Tono: Autoridad pero cercano.",
  
  "promiseStatement": "Una frase CONTUNDENTE en SEGUNDA PERSONA de lo que el cliente logrará con este mentor. 20-30 palabras. Ejemplo: 'Trabajarás conmigo para eliminar excusas y construir la disciplina que transforma sueños en resultados medibles.'",
  
  "tagline": "Frase de impacto para el header del perfil. 5-10 palabras. Ejemplo: 'Especialista en escalar negocios y mentalidad de acero'",
  
  "vision": "Visión personal a largo plazo del mentor. Su propósito y hacia dónde va. 30-50 palabras. Primera persona. Ejemplo: 'Mi visión es crear una comunidad de 10,000 emprendedores libres financieramente que lideren con integridad y transformen sus comunidades.'",
  
  "jobTitle": "Título profesional creativo y vendedor. Ejemplo: 'Desarrollador de Pensamiento', 'Arquitecto de Transformación', 'Estratega de Alto Impacto'",
  
  "mentorTitle": "Título específico como mentor. Ejemplo: 'Mentor Senior en Liderazgo', 'Coach Certificado en PNL', 'Asesor Estratégico de Negocios'",
  
  "mainSpecialty": "Especialidad principal clara y específica. Ejemplo: 'Liderazgo Empresarial Comercial', 'Transformación Financiera Personal', 'Mentalidad de Alto Rendimiento'",
  
  "secondarySpecialties": ["Especialidad 2", "Especialidad 3", "Especialidad 4"] (3-4 especialidades relacionadas),
  
  "keySkills": ["Habilidad 1", "Habilidad 2", ...] (5-7 habilidades clave separadas por coma. Ejemplos: Liderazgo, Comunicación, Estrategia, Negociación),
  
  "achievements": ["Logro 1", "Logro 2", "Logro 3"] (3-5 logros medibles y específicos. Ejemplos: "Certificación X", "Premio Y", "100+ clientes transformados"),
  
  "detectedStyle": "HARDCORE | EMPATHIC | BALANCED (basado en las palabras que usó)",
  
  "expertiseTags": ["Tag1", "Tag2", "Tag3"] (Máximo 5 tags. Ejemplos: Finanzas, Liderazgo, Salud, Emprendimiento, Mindset)
}

REGLAS CRÍTICAS:
- Bio en PRIMERA PERSONA ("He ayudado a...", "Mi experiencia...")
- Promise en SEGUNDA PERSONA ("Trabajarás conmigo...", "Lograrás...")
- Títulos creativos, no genéricos ("Coach" ❌ → "Arquitecto de Transformación" ✅)
- Especialidades específicas ("Negocios" ❌ → "Escalamiento de Startups B2B" ✅)
- Logros medibles ("Experiencia en ventas" ❌ → "300+ vendedores entrenados, $5M+ en ventas" ✅)
- NO usar palabras corporativas: "soluciones", "servicios", "profesional certificado"
- SÍ usar palabras de impacto: "transformar", "eliminar", "construir", "dominar"
- Detectar estilo:
  * Si usa "reto", "sin excusas", "resultados", "disciplina" → HARDCORE
  * Si usa "escucha", "proceso", "sanar", "acompañar" → EMPATHIC
  * Si mezcla ambos → BALANCED`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: INTERVIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content);
    
    return {
      heroJourneyBio: result.heroJourneyBio,
      promiseStatement: result.promiseStatement,
      tagline: result.tagline,
      vision: result.vision,
      jobTitle: result.jobTitle,
      mentorTitle: result.mentorTitle,
      mainSpecialty: result.mainSpecialty,
      secondarySpecialties: result.secondarySpecialties,
      keySkills: result.keySkills,
      achievements: result.achievements,
      detectedStyle: result.detectedStyle,
      expertiseTags: result.expertiseTags,
    };
    
  } catch (error) {
    console.error('Error generating bio with OpenAI:', error);
    
    // Fallback: Generar bio básica sin IA
    return generateFallbackBio(context);
  }
}

/**
 * Genera bio de respaldo si falla OpenAI
 */
function generateFallbackBio(context: InterviewContext): BioResult {
  const detectedStyle = detectStyleFromText(context.mentorshipStyle || '');
  
  return {
    heroJourneyBio: `Con años de experiencia y resultados comprobados, ${context.mainAchievement || 'he transformado vidas'}. Mi enfoque ${context.mentorshipStyle || 'único'} me permite conectar profundamente con mis mentoreados. He desarrollado un sistema probado que genera transformaciones reales y medibles.`,
    promiseStatement: `Trabajarás conmigo para alcanzar ${context.idealClient || 'tus objetivos'} a través de un proceso estructurado que elimina excusas y genera resultados concretos.`,
    tagline: 'Mentor especializado en transformación y resultados',
    vision: 'Crear un impacto duradero ayudando a líderes a alcanzar su máximo potencial y transformar sus comunidades.',
    jobTitle: 'Mentor Senior y Coach de Transformación',
    mentorTitle: 'Mentor Certificado en Alto Rendimiento',
    mainSpecialty: 'Liderazgo y Desarrollo Personal',
    secondarySpecialties: ['Mentalidad de Crecimiento', 'Estrategia de Negocios', 'Productividad'],
    keySkills: ['Liderazgo', 'Comunicación', 'Estrategia', 'Mentoría', 'Desarrollo Personal'],
    achievements: ['Mentor certificado', 'Experiencia comprobada', '100+ clientes satisfechos'],
    detectedStyle,
    expertiseTags: ['Liderazgo', 'Mentoría', 'Transformación'],
  };
}

/**
 * Detecta el estilo de mentoría basado en palabras clave
 */
function detectStyleFromText(text: string): MentorStyle {
  const lowerText = text.toLowerCase();
  
  const hardcoreKeywords = ['reto', 'sin excusas', 'resultados', 'disciplina', 'exigente', 'directo', 'duro'];
  const empathicKeywords = ['escucha', 'proceso', 'sanar', 'acompañar', 'paciente', 'comprensión', 'empático'];
  
  let hardcoreScore = 0;
  let empathicScore = 0;
  
  hardcoreKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) hardcoreScore++;
  });
  
  empathicKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) empathicScore++;
  });
  
  if (hardcoreScore > empathicScore && hardcoreScore >= 2) return 'HARDCORE';
  if (empathicScore > hardcoreScore && empathicScore >= 2) return 'EMPATHIC';
  return 'BALANCED';
}

/**
 * Regenera la bio con un tono diferente
 */
export async function regenerateBio(
  context: InterviewContext,
  desiredTone: 'more_authoritative' | 'more_empathic' | 'more_inspiring'
): Promise<BioResult> {
  
  const toneInstructions = {
    more_authoritative: 'Haz la bio MÁS DIRECTA, con más autoridad. Usa verbos de acción fuertes. Elimina cualquier suavidad.',
    more_empathic: 'Haz la bio MÁS CÁLIDA y empática. Enfócate en el acompañamiento y la comprensión.',
    more_inspiring: 'Haz la bio MÁS INSPIRADORA. Cuenta una historia de transformación cuántica. Incluye desafíos superados.',
  };

  const prompt = `Basándote en esta entrevista, genera un perfil de mentor profesional:

LOGRO PRINCIPAL: "${context.mainAchievement}"
ESTILO DE MENTORÍA: "${context.mentorshipStyle}"
CLIENTE IDEAL: "${context.idealClient}"

${toneInstructions[desiredTone]}

Genera el siguiente JSON (sin markdown, solo JSON puro):

{
  "heroJourneyBio": "Bio narrativa en PRIMERA PERSONA, estilo 'Viaje del Héroe'. 100-150 palabras.",
  "promiseStatement": "Una frase CONTUNDENTE en SEGUNDA PERSONA de lo que el cliente logrará. 20-30 palabras.",
  "tagline": "Frase de impacto para el header del perfil. 5-10 palabras.",
  "detectedStyle": "HARDCORE | EMPATHIC | BALANCED",
  "expertiseTags": ["Tag1", "Tag2", "Tag3"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: INTERVIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No content');

    return JSON.parse(content);
    
  } catch (error) {
    console.error('Error regenerating bio:', error);
    return generateFallbackBio(context);
  }
}

/**
 * Valida que el avatar sea aceptable (rostro claro)
 * Nota: Requiere API de validación de imágenes (future feature)
 */
export async function validateMentorAvatar(imageUrl: string): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  // TODO: Implementar validación con OpenAI Vision API
  // Por ahora, retornar válido
  return {
    isValid: true,
  };
}
