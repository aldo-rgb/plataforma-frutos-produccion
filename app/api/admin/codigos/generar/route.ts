import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CodigoTipo = 'MEMBRESIA_MENTOR' | 'MEMBRESIA_STANDARD' | 'MEMBRESIA_PREMIUM' | 'MENTORIA_1_1' | 'LICENCIAS_INSTITUCIONAL';

interface CodigoInput {
  codigo: string;
  tipo: CodigoTipo;
  cantidadLicencias?: number;
  descripcion?: string;
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { codigos } = body as { codigos: CodigoInput[] };

    if (!Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Validar códigos institucionales
    for (const codigo of codigos) {
      if (codigo.tipo === 'LICENCIAS_INSTITUCIONAL') {
        if (!codigo.cantidadLicencias || codigo.cantidadLicencias < 50) {
          return NextResponse.json({ 
            error: 'Licencias institucionales requieren mínimo 50 licencias' 
          }, { status: 400 });
        }
      }
    }

    // Crear códigos en la base de datos
    const codigosCreados = await prisma.$transaction(
      codigos.map(c => 
        prisma.codigoAcceso.create({
          data: {
            codigo: c.codigo,
            tipo: c.tipo,
            cantidadLicencias: c.cantidadLicencias || null,
            licenciasUsadas: c.tipo === 'LICENCIAS_INSTITUCIONAL' ? 0 : null,
            descripcion: c.descripcion || null,
            estado: 'DISPONIBLE',
            updatedAt: new Date()
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true, 
      cantidad: codigosCreados.length 
    });

  } catch (error) {
    console.error('Error generando códigos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
