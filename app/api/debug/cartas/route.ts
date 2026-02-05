import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Solo disponible en desarrollo o para admins autenticados
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      // En producción, requiere autenticación de admin
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      
      const user = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { rol: true }
      });
      
      if (!user || !['ADMINISTRADOR', 'SUPER_ADMIN'].includes(user.rol)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
    }

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
