import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoria, fileName } = body;

    // 1. Guardar la Evidencia en la BD
    // (Asignada al Usuario 1 por ahora)
    const nuevaEvidencia = await prisma.evidencia.create({
      data: {
        usuarioId: 1, 
        categoria: categoria,
        urlFoto: `/uploads/${fileName}`, // Simulamos la ruta del archivo
        // fechaSubida se pone automática por el 'default(now())' de Prisma
      },
    });

    // 2. Sumar Puntos al Usuario (Gamificación)
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: 1 },
      data: {
        puntosCuanticos: {
          increment: 25, // Sumar 25 puntos
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      evidencia: nuevaEvidencia,
      nuevosPuntos: usuarioActualizado.puntosCuanticos 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al procesar evidencia' }, { status: 500 });
  }
}