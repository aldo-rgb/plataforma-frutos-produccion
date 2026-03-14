import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Probar conexión con Facturapi
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: false, error: 'Sin organización' }, { status: 400 });
    }

    const config = await prisma.facturapiConfig.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!config?.apiKey) {
      return NextResponse.json(
        { success: false, error: 'No hay API Key configurada' },
        { status: 400 }
      );
    }

    // Probar la conexión con Facturapi obteniendo la info de la organización
    const response = await fetch('https://www.facturapi.io/v2/organizations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.message || 'Error al conectar con Facturapi' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Facturapi devuelve un array de organizaciones
    const organization = data.data?.[0];
    
    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa',
      organizationName: organization?.legal_name || organization?.name || 'Conectado',
      isLive: config.isLiveMode,
    });
  } catch (error) {
    console.error('Error testing Facturapi connection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al probar la conexión' },
      { status: 500 }
    );
  }
}
