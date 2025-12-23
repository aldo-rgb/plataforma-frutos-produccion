import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const cartas = await prisma.cartaFrutos.findMany({
      include: {
        Tarea: true,
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      },
      take: 5
    });

    return NextResponse.json({
      success: true,
      total: cartas.length,
      cartas: cartas.map((carta: any) => ({
        id: carta.id,
        usuario: carta.Usuario.nombre,
        email: carta.Usuario.email,
        metas: {
          finanzas: carta.finanzasMeta,
          relaciones: carta.relacionesMeta,
          talentos: carta.talentosMeta,
          pazMental: carta.pazMentalMeta,
          ocio: carta.ocioMeta,
          salud: carta.saludMeta
        },
        tareas: carta.Tarea.map((t: any) => ({
          categoria: t.categoria,
          descripcion: t.descripcion,
          completada: t.completada
        })),
        fechaCreacion: carta.fechaCreacion
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
