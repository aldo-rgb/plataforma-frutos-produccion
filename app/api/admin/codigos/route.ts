import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea admin
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (!['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'].includes(user?.rol || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todos los códigos
    const codigos = await prisma.codigoAcceso.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    const codigosFormateados = codigos.map(c => ({
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      cantidadLicencias: c.cantidadLicencias,
      licenciasUsadas: c.licenciasUsadas,
      descripcion: c.descripcion,
      estado: c.estado,
      creado: c.createdAt.toISOString(),
      usuario: c.Usuario?.nombre || c.Usuario?.email || null,
      canjeadoEn: c.canjeadoEn?.toISOString() || null
    }));

    return NextResponse.json({ codigos: codigosFormateados });
  } catch (error) {
    console.error('Error obteniendo códigos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
