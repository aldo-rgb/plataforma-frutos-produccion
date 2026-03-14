import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener configuración de Facturapi de la organización
export async function GET() {
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

    // Enmascarar la API Key para seguridad
    const maskedConfig = config ? {
      ...config,
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}${'*'.repeat(20)}` : '',
    } : null;

    return NextResponse.json({
      success: true,
      config: maskedConfig,
    });
  } catch (error) {
    console.error('Error fetching Facturapi config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// POST - Guardar/Actualizar configuración de Facturapi
export async function POST(request: Request) {
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

    const body = await request.json();
    const { apiKey, isActive, isLiveMode, defaultSatKey, defaultUnitKey } = body;

    if (!apiKey || apiKey.includes('*')) {
      // Si la API Key contiene asteriscos, no la actualizamos (está enmascarada)
      const existingConfig = await prisma.facturapiConfig.findUnique({
        where: { organizationId: user.organizationId },
      });

      if (existingConfig) {
        // Solo actualizar otros campos
        const updated = await prisma.facturapiConfig.update({
          where: { organizationId: user.organizationId },
          data: {
            isActive: isActive ?? existingConfig.isActive,
            isLiveMode: isLiveMode ?? existingConfig.isLiveMode,
            defaultSatKey: defaultSatKey ?? existingConfig.defaultSatKey,
            defaultUnitKey: defaultUnitKey ?? existingConfig.defaultUnitKey,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Configuración actualizada',
          config: {
            ...updated,
            apiKey: `${updated.apiKey.slice(0, 8)}${'*'.repeat(20)}`,
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'API Key es requerida' },
        { status: 400 }
      );
    }

    // Validar la API Key con Facturapi
    try {
      const testResponse = await fetch('https://www.facturapi.io/v2/organizations', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!testResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'API Key inválida. Verifica tus credenciales de Facturapi.' },
          { status: 400 }
        );
      }
    } catch (testError) {
      console.error('Error validating Facturapi API Key:', testError);
      return NextResponse.json(
        { success: false, error: 'No se pudo validar la API Key con Facturapi' },
        { status: 400 }
      );
    }

    // Crear o actualizar la configuración
    const config = await prisma.facturapiConfig.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        apiKey,
        isActive: isActive ?? true,
        isLiveMode: isLiveMode ?? false,
        defaultSatKey: defaultSatKey ?? '86132000',
        defaultUnitKey: defaultUnitKey ?? 'E48',
      },
      update: {
        apiKey,
        isActive: isActive ?? true,
        isLiveMode: isLiveMode ?? false,
        defaultSatKey: defaultSatKey ?? '86132000',
        defaultUnitKey: defaultUnitKey ?? 'E48',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de Facturapi guardada correctamente',
      config: {
        ...config,
        apiKey: `${config.apiKey.slice(0, 8)}${'*'.repeat(20)}`,
      },
    });
  } catch (error) {
    console.error('Error saving Facturapi config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar configuración de Facturapi
export async function DELETE() {
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

    await prisma.facturapiConfig.delete({
      where: { organizationId: user.organizationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de Facturapi eliminada',
    });
  } catch (error) {
    console.error('Error deleting Facturapi config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la configuración' },
      { status: 500 }
    );
  }
}
