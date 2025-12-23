import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProgresoNivel } from '@/lib/rewardSystem';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        experienciaXP: true,
        puntosCuanticos: true,
        nivelActual: true,
        rangoActual: true,
        completionStreak: true,
        collectionsCompleted: true,
        badges: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Calcular progreso de nivel
    const progreso = getProgresoNivel(usuario.experienciaXP);

    return NextResponse.json({
      usuario: {
        nombre: usuario.nombre,
        xpTotal: usuario.experienciaXP,
        pc: usuario.puntosCuanticos,
        racha: usuario.completionStreak,
        badges: usuario.badges,
        coleccionesCompletadas: usuario.collectionsCompleted
      },
      nivel: {
        nivel: progreso.nivelActual.nivel,
        rango: progreso.nivelActual.descripcion,
        icono: progreso.nivelActual.icono,
        xpActual: progreso.xpActual,
        xpTotal: usuario.experienciaXP,
        xpParaSiguiente: progreso.xpParaSiguiente,
        progreso: progreso.progreso
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener nivel de usuario:', error);
    return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 });
  }
}
