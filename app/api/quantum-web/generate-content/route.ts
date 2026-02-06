import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface BusinessInfo {
  name: string;
  description: string;
  category: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  schedule?: string;
}

// Estilos de tono según el template
const TEMPLATE_TONES: Record<string, string> = {
  minimal: 'sofisticado, elegante, minimalista y profesional. Usa frases concisas, directas y premium. Transmite exclusividad.',
  energetic: 'enérgico, dinámico, motivacional y juvenil. Usa frases impactantes y poderosas. Transmite pasión y entusiasmo.',
  artisan: 'cálido, cercano, auténtico y artesanal. Transmite tradición, dedicación y amor por el oficio. Usa un tono familiar.',
  tech: 'innovador, futurista, técnico y vanguardista. Usa términos que transmitan tecnología de punta y modernidad.',
  corporate: 'profesional, confiable, institucional y establecido. Transmite solidez, trayectoria y experiencia comprobada.'
};

// Categorías de negocio para contexto
const CATEGORY_CONTEXT: Record<string, string> = {
  restaurante: 'un restaurante/café que ofrece una experiencia gastronómica única con sabores auténticos',
  tienda: 'una tienda boutique que ofrece productos selectos y de alta calidad',
  servicios: 'una empresa de servicios profesionales dedicada a la excelencia y resultados',
  salud: 'un centro de salud y bienestar enfocado en el cuidado integral y la armonía',
  belleza: 'un centro de belleza y estética de alto nivel comprometido con realzar tu imagen',
  educacion: 'un espacio educativo de vanguardia dedicado al crecimiento y transformación personal',
  tecnologia: 'una empresa tecnológica innovadora que impulsa el futuro',
  fitness: 'un centro deportivo de élite enfocado en tu transformación física total',
  arte: 'un espacio creativo exclusivo donde el arte y la pasión cobran vida',
  otro: 'un negocio de primer nivel comprometido con la excelencia y satisfacción del cliente'
};

// Imágenes de fondo sugeridas por categoría (Unsplash)
const HERO_IMAGES: Record<string, string[]> = {
  restaurante: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1920&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80'
  ],
  tienda: [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1920&q=80'
  ],
  servicios: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1920&q=80'
  ],
  salud: [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80'
  ],
  belleza: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&q=80'
  ],
  educacion: [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1920&q=80'
  ],
  tecnologia: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80'
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=80',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80'
  ],
  arte: [
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1920&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&q=80',
    'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=1920&q=80'
  ],
  otro: [
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1920&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1920&q=80'
  ]
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessInfo, templateStyle, templateId } = await req.json();
    
    if (!businessInfo?.name) {
      return NextResponse.json({ error: 'Nombre del negocio requerido' }, { status: 400 });
    }

    const tone = TEMPLATE_TONES[templateStyle] || TEMPLATE_TONES.minimal;
    const categoryContext = CATEGORY_CONTEXT[businessInfo.category] || CATEGORY_CONTEXT.otro;

    const prompt = `Eres un copywriter PREMIUM especializado en crear contenido de alta conversión para páginas web de negocios. Tu trabajo es crear textos que generen confianza, transmitan profesionalismo y motiven a la acción.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${businessInfo.name}
- Descripción del dueño: ${businessInfo.description || 'No proporcionada'}
- Es: ${categoryContext}
- Ubicación: ${businessInfo.address || 'No especificada'}
- Horario: ${businessInfo.schedule || 'No especificado'}

ESTILO DE ESCRITURA REQUERIDO:
El tono debe ser ${tone}

GENERA EL SIGUIENTE CONTENIDO PREMIUM (en español mexicano, profesional pero cercano):

1. heroTitle: Un título principal PODEROSO e impactante que capture la esencia del negocio (máximo 6 palabras). Debe ser memorable y crear impacto emocional.

2. heroSubtitle: Un subtítulo que genere curiosidad y deseo de saber más (máximo 20 palabras). Debe complementar el título y motivar a seguir leyendo.

3. aboutTitle: Un título creativo para la sección "Nuestra Historia" o "Quiénes Somos" (2-4 palabras)

4. aboutText: Un texto persuasivo de 3-4 oraciones que cuente la historia del negocio, su pasión, experiencia y lo que lo hace especial. Debe generar conexión emocional con el lector. Menciona años de experiencia, valores, y el compromiso con el cliente.

5. servicesTitle: Un título atractivo para la sección de servicios/características (ej: "¿Por qué elegirnos?", "Lo que nos hace únicos")

6. services: Array de 4 servicios/características destacables con:
   - icon: usa uno de estos: "star", "heart", "clock", "shield", "zap", "gift"
   - title: nombre del beneficio/servicio (2-4 palabras impactantes)
   - description: descripción convincente (10-15 palabras que expliquen el beneficio para el cliente)

7. ctaText: Texto PERSUASIVO para el botón de llamada a la acción (3-6 palabras que generen urgencia)

8. testimonialPrompt: Una frase corta que un cliente satisfecho diría sobre el negocio (para generar un testimonio de ejemplo)

9. galleryDescription: Una descripción de 1 línea de qué tipo de imágenes representarían mejor este negocio (para generar con IA después)

Responde SOLO con un JSON válido, sin explicaciones adicionales ni markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un copywriter de élite que crea contenido premium para páginas web. Tu contenido siempre genera confianza, es profesional y motiva a la acción. Respondes SOLO con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.85,
      max_tokens: 1500
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Intentar parsear el JSON
    let content;
    try {
      // Limpiar posibles caracteres extra
      const cleanJson = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      content = JSON.parse(cleanJson);
    } catch (parseError) {
      logger.error('Error parseando respuesta de OpenAI:', parseError);
      // Contenido de fallback
      content = generateFallbackContent(businessInfo);
    }

    // Seleccionar imagen de hero según categoría
    const categoryImages = HERO_IMAGES[businessInfo.category] || HERO_IMAGES.otro;
    const heroImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
    content.heroImage = heroImage;

    // Agregar testimonios mejorados basados en el negocio
    const testimonialText = content.testimonialPrompt || `El servicio de ${businessInfo.name} superó todas mis expectativas. ¡100% recomendado!`;
    content.testimonials = [
      { 
        name: 'María García', 
        text: testimonialText, 
        rating: 5,
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
      },
      { 
        name: 'Carlos Rodríguez', 
        text: `Excelente atención y calidad. ${businessInfo.name} es mi primera opción siempre.`, 
        rating: 5,
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
      },
      { 
        name: 'Ana Martínez', 
        text: 'Profesionalismo y dedicación en cada detalle. Sin duda volveré.', 
        rating: 5,
        avatar: 'https://randomuser.me/api/portraits/women/68.jpg'
      }
    ];

    // Agregar imágenes de galería según categoría
    content.suggestedGallery = categoryImages;

    return NextResponse.json({ content });

  } catch (error) {
    logger.error('Error generando contenido:', error);
    
    return NextResponse.json({ 
      content: generateFallbackContent({ name: 'Mi Negocio', description: '', category: 'otro' })
    });
  }
}

// Función de contenido de respaldo PREMIUM
function generateFallbackContent(businessInfo: BusinessInfo) {
  const categoryImages = HERO_IMAGES[businessInfo.category] || HERO_IMAGES.otro;
  
  return {
    heroTitle: `Bienvenido a ${businessInfo.name}`,
    heroSubtitle: businessInfo.description || 'Donde la calidad y la excelencia se encuentran para brindarte una experiencia única',
    aboutTitle: 'Nuestra Historia',
    aboutText: `En ${businessInfo.name} nos apasiona lo que hacemos. Con años de experiencia y un compromiso inquebrantable con la calidad, hemos construido una reputación basada en la confianza y la satisfacción de nuestros clientes. Cada día trabajamos para superar tus expectativas y ofrecerte un servicio que verdaderamente marca la diferencia.`,
    servicesTitle: '¿Por qué elegirnos?',
    services: [
      { 
        icon: 'star', 
        title: 'Calidad Premium', 
        description: 'Utilizamos los mejores materiales y técnicas para garantizar resultados excepcionales' 
      },
      { 
        icon: 'heart', 
        title: 'Atención Personalizada', 
        description: 'Cada cliente es único y merece un trato especial adaptado a sus necesidades' 
      },
      { 
        icon: 'shield', 
        title: 'Garantía Total', 
        description: 'Tu satisfacción es nuestra prioridad número uno, respaldamos nuestro trabajo' 
      },
      { 
        icon: 'clock', 
        title: 'Puntualidad', 
        description: 'Respetamos tu tiempo con entregas y citas siempre a la hora acordada' 
      }
    ],
    ctaText: '¡Contáctanos Ahora!',
    heroImage: categoryImages[0],
    testimonials: [
      { 
        name: 'María García', 
        text: `${businessInfo.name} superó todas mis expectativas. ¡Totalmente recomendado!`, 
        rating: 5,
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
      },
      { 
        name: 'Carlos Rodríguez', 
        text: 'Excelente atención y calidad profesional. Mi primera opción siempre.', 
        rating: 5,
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
      }
    ],
    suggestedGallery: categoryImages
  };
}
