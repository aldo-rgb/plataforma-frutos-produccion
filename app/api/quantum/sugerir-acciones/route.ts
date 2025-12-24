import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { objetivo, area } = await req.json();

    if (!objetivo) {
      return NextResponse.json({ error: 'Objetivo requerido' }, { status: 400 });
    }

    // Detectar timezone del usuario
    const timezone = req.headers.get('x-timezone') || 'America/Mexico_City';
    const isMexico = timezone.includes('Mexico') || timezone.includes('America/Tijuana') || 
                     timezone.includes('America/Mazatlan') || timezone.includes('America/Monterrey');
    const isUSA = timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles') || 
                  timezone.includes('America/Chicago') || timezone.includes('America/Denver');
    
    // Determinar moneda y formato
    const currency = isMexico ? '$' : (isUSA ? 'USD $' : '$');
    const currencyName = isMexico ? 'pesos mexicanos' : (isUSA ? 'dólares estadounidenses' : 'dólares');
    const exampleAmount = isMexico ? '$5,000 MXN' : '$5,000 USD';

    const systemPrompt = `Eres QUANTUM, un estratega de ejecución. Tu misión es descomponer objetivos grandes en acciones SMART ejecutables.

El usuario tiene este OBJETIVO:
"${objetivo}"

Área: ${area || 'General'}
Moneda preferida: ${currencyName} (usa el símbolo ${currency})

🔥 **RESTRICCIÓN CRÍTICA DE LONGITUD: CADA ACCIÓN DEBE TENER MÁXIMO 13 PALABRAS**

Genera exactamente 3 acciones SMART en formato JSON que cumplan estos criterios:

1. **CRITERIOS SMART ESTRICTOS**:
   - **S**pecific (Específica): Acción concreta y clara
   - **M**easurable (Medible): Incluye números, cantidades, o eventos verificables
   - **A**chievable (Alcanzable): Realista y práctica
   - **R**elevant (Relevante): Contribuye directamente al objetivo
   - **T**ime-bound: NO incluir fechas (se definen después)

2. Cada acción debe ser un paso ejecutable hacia el objetivo
3. Usa verbos de acción fuertes: "Crear", "Implementar", "Establecer", "Investigar", "Diseñar"
4. Incluye métricas concretas cuando sea posible
5. Ordena las acciones en secuencia lógica (primeras cosas primero)
6. **IMPORTANTE**: Cuando menciones cantidades monetarias, usa ${currencyName} con el formato ${exampleAmount}
7. **MÁXIMO 13 PALABRAS POR ACCIÓN** - Sé conciso y específico

EJEMPLOS DE ACCIONES SMART CORRECTAS (adaptadas a ${currencyName}, MÁXIMO 13 PALABRAS):
Para objetivo "Aumentar mis ahorros en un 30%":
✅ "Crear presupuesto detallado identificando 5 gastos innecesarios" (7 palabras)
✅ "Establecer ahorro automático del 15% por cada ingreso" (8 palabras)
✅ "Reducir gastos negociando 3 servicios de suscripción actuales" (8 palabras)

Para objetivo "Generar ingresos extra":
${isMexico 
  ? '✅ "Ofrecer servicios freelance con meta de $15,000 MXN mensuales" (9 palabras)\n✅ "Vender 50 unidades en línea generando $25,000 MXN" (8 palabras)\n✅ "Dar 4 consultorías mensuales a $2,500 MXN cada una" (9 palabras)'
  : '✅ "Ofrecer servicios freelance con meta de $1,500 USD mensuales" (9 palabras)\n✅ "Vender 50 unidades en línea generando $2,500 USD" (8 palabras)\n✅ "Dar 4 consultorías mensuales a $250 USD cada una" (9 palabras)'
}

Para objetivo "Correr mi primer medio maratón":
✅ "Establecer rutina de 3 sesiones semanales aumentando 10%" (8 palabras)
✅ "Contratar plan de entrenamiento estructurado de 12 semanas" (8 palabras)
✅ "Registrarme en carrera de 10k como preparación" (7 palabras)

FORMATO INCORRECTO (NO uses estos):
❌ "Ahorrar más dinero" (muy vago, no medible)
❌ "Intentar correr" (palabra débil, sin compromiso)
❌ "Ser más disciplinado" (no es acción específica)
❌ "Hacer ejercicio a veces" (no medible, no específico)
❌ "Establecer un sistema completo de ahorro automático que transfiera el 15% de cada ingreso" (14 palabras - EXCEDE EL LÍMITE)

Devuelve SOLO un JSON con esta estructura exacta:
{
  "acciones": [
    "Acción SMART 1 (primera prioridad)",
    "Acción SMART 2 (segundo paso)",
    "Acción SMART 3 (tercer paso)"
  ]
}

NO incluyas explicaciones adicionales. SOLO el JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera 3 acciones SMART ejecutables para lograr este objetivo: "${objetivo}"` }
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content || '{}';
    const parsedResponse = JSON.parse(responseText);

    if (!parsedResponse.acciones || !Array.isArray(parsedResponse.acciones)) {
      throw new Error('Formato de respuesta inválido');
    }

    return NextResponse.json({
      success: true,
      acciones: parsedResponse.acciones.slice(0, 3), // Asegurar máximo 3
      objetivo: objetivo
    });

  } catch (error: any) {
    console.error('❌ Error generando acciones QUANTUM:', error);
    return NextResponse.json(
      { error: 'Error generando acciones', details: error.message },
      { status: 500 }
    );
  }
}
