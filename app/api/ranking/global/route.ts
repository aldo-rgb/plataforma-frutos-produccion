// app/api/ranking/global/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


// Datos Mockeados para el Front-end agrupados por Visión
const MOCK_RANKING_BY_VISION = [
  {
    vision: 'Innovación Tecnológica',
    lideres: [
      { id: 1, nombre: 'Ana G. (LA LEYENDA)', puntos: 12500, avatar: '🥇', vision: 'Innovación Tecnológica' },
      { id: 2, nombre: 'Héctor P. (El Fénix)', puntos: 11200, avatar: '🥈', vision: 'Innovación Tecnológica' },
      { id: 3, nombre: 'Sofía M. (The Builder)', puntos: 10850, avatar: '🥉', vision: 'Innovación Tecnológica' },
      { id: 4, nombre: 'Carlos R.', puntos: 9500, avatar: '✨', vision: 'Innovación Tecnológica' },
      { id: 5, nombre: 'Laura V.', puntos: 8750, avatar: '🚀', vision: 'Innovación Tecnológica' },
    ]
  },
  {
    vision: 'Educación Transformadora',
    lideres: [
      { id: 6, nombre: 'Javier Pérez', puntos: 7100, avatar: '💡', vision: 'Educación Transformadora' },
      { id: 7, nombre: 'El Líder Secreto', puntos: 6900, avatar: '👤', vision: 'Educación Transformadora' },
      { id: 8, nombre: 'Líder 8', puntos: 5500, avatar: '👤', vision: 'Educación Transformadora' },
    ]
  },
  {
    vision: 'Sostenibilidad Ambiental',
    lideres: [
      { id: 9, nombre: 'Líder 9', puntos: 4850, avatar: '👤', vision: 'Sostenibilidad Ambiental' },
      { id: 10, nombre: 'Líder 10', puntos: 3100, avatar: '👤', vision: 'Sostenibilidad Ambiental' },
    ]
  }
];

export async function GET(request: Request) {
  try {
    // Obtener la visión del usuario desde query params
    const { searchParams } = new URL(request.url);
    const userVision = searchParams.get('vision');

    // LÓGICA REAL CON PRISMA (Comentada para usar mock)
    // const whereClause = userVision 
    //   ? { activo: true, vision: userVision }
    //   : { activo: true };
    //
    // const usuarios = await prisma.usuario.findMany({ 
    //     where: whereClause,
    //     orderBy: { puntosAcumulados: 'desc' },
    //     select: {
    //       id: true,
    //       nombre: true,
    //       puntosAcumulados: true,
    //       vision: true,
    //     }
    // });
    // 
    // // Agrupar por visión
    // const rankingByVision = usuarios.reduce((acc: any[], usuario) => {
    //   const visionName = usuario.vision || 'Sin Visión';
    //   const existingVision = acc.find(v => v.vision === visionName);
    //   
    //   const leader = {
    //     id: usuario.id,
    //     nombre: usuario.nombre,
    //     puntos: usuario.puntosAcumulados,
    //     avatar: '👤',
    //     vision: visionName
    //   };
    //   
    //   if (existingVision) {
    //     existingVision.lideres.push(leader);
    //   } else {
    //     acc.push({
    //       vision: visionName,
    //       lideres: [leader]
    //     });
    //   }
    //   return acc;
    // }, []);
    // 
    // // Ordenar líderes dentro de cada visión
    // rankingByVision.forEach(visionGroup => {
    //   visionGroup.lideres.sort((a: any, b: any) => b.puntos - a.puntos);
    // });
    //
    // return NextResponse.json(rankingByVision);

    // Filtrar mock data por visión si se proporciona
    const filteredRanking = userVision
      ? MOCK_RANKING_BY_VISION.filter(v => v.vision === userVision)
      : MOCK_RANKING_BY_VISION;

    return NextResponse.json(filteredRanking);
  } catch (error) {
    logger.error('Error al obtener ranking:', error);
    return NextResponse.json({ error: 'Error al cargar el ranking' }, { status: 500 });
  }
}
