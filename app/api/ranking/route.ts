import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic'; // Importante para que no se guarde en caché y sea tiempo real

export async function GET() {
  try {
    // 1. Buscar usuarios ordenados por puntos (Mayor a menor)
    const lideres = await prisma.usuario.findMany({
      orderBy: {
        puntosCuanticos: 'desc',
      },
      take: 50, // Traemos el Top 50
      select: {
        id: true,
        nombre: true,
        puntosCuanticos: true,
        rol: true,
      }
    });

    // 2. Procesar datos para el frontend
    // Agregamos propiedades visuales basadas en su posición
    const rankingProcesado = lideres.map((lider, index) => ({
      id: lider.id,
      nombre: lider.nombre || 'Líder Anónimo',
      puntos: lider.puntosCuanticos,
      // Calculamos el rango basado en puntos (Lógica simple de ejemplo)
      rango: lider.puntosCuanticos > 2000 ? 'Maestro Cuántico' : 
             lider.puntosCuanticos > 1000 ? 'Game Changer' : 'Iniciado',
      // Colores aleatorios para avatar si no tienen foto
      avatar: ['bg-yellow-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500'][lider.id % 4],
      posicion: index + 1,
      isMe: lider.id === 1 // Hardcodeado: Simulamos que soy el usuario 1
    }));

    return NextResponse.json(rankingProcesado);

  } catch (error) {
    return NextResponse.json({ error: 'Error obteniendo ranking' }, { status: 500 });
  }
}