import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { metas } = await req.json(); // Recibe: { salud: "Correr 5 veces", ... }

    // PROMPT DE INGENIERÍA: Convierte texto en JSON estructurado
    const prompt = `
      Actúa como un planificador experto. Analiza las metas del usuario y desglozas en tareas semanales específicas.
      
      ENTRADA:
      ${JSON.stringify(metas)}

      REGLAS:
      1. Si la meta implica frecuencia (ej: "3 veces por semana"), crea 3 tareas separadas: "Correr (1/3)", "Correr (2/3)", etc.
      2. Si no especifica frecuencia, crea 1 tarea única.
      3. Devuelve SOLO un JSON válido con este formato:
      
      [
        { "categoria": "salud", "descripcion": "Correr (1/5)" },
        { "categoria": "salud", "descripcion": "Correr (2/5)" },
        ...
      ]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2, // Baja creatividad, alta precisión
    });

    const tareasGeneradas = JSON.parse(completion.choices[0].message.content || "[]");

    return NextResponse.json({ tareas: tareasGeneradas });

  } catch (error) {
    return NextResponse.json({ error: 'Error generando tareas' }, { status: 500 });
  }
}
