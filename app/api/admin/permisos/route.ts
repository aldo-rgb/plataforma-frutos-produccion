import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =====================================================
// OBTENER PERMISOS (GET)
// =====================================================
// Devuelve todos los permisos de la base de datos
export async function GET() {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'ADMINISTRADOR'].includes(session.user.rol?.toUpperCase())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const permisos = await prisma.permisoMenu.findMany({
      orderBy: [
        { role: 'asc' },
        { menuKey: 'asc' }
      ]
    });

    return NextResponse.json(permisos);
  } catch (error) {
    console.error('Error al cargar permisos:', error);
    return NextResponse.json({ error: 'Error al cargar permisos' }, { status: 500 });
  }
}

// =====================================================
// GUARDAR PERMISOS (POST)
// =====================================================
// Recibe array de permisos y los guarda/actualiza en la BD
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'ADMINISTRADOR'].includes(session.user.rol?.toUpperCase())) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json(); 
    // body espera ser un array: [{ role: 'MENTOR', menuKey: 'finanzas', isEnabled: true }, ...]

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Se esperaba un array de permisos' }, { status: 400 });
    }

    // Usamos una transacción para guardar todo de golpe
    const actualizaciones = body.map((p: any) => 
      prisma.permisoMenu.upsert({
        where: {
          role_menuKey: { role: p.role, menuKey: p.menuKey }
        },
        update: { isEnabled: p.isEnabled },
        create: { role: p.role, menuKey: p.menuKey, isEnabled: p.isEnabled, updatedAt: new Date() },
      })
    );

    await prisma.$transaction(actualizaciones);

    return NextResponse.json({ 
      success: true, 
      message: 'Permisos actualizados correctamente',
      count: actualizaciones.length 
    });
  } catch (error) {
    console.error('Error al guardar permisos:', error);
    return NextResponse.json({ error: 'Error al guardar permisos' }, { status: 500 });
  }
}
