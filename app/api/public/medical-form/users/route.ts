import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// API pública para buscar usuarios inscritos a una visión (para registro de formulario médico)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const visionId = searchParams.get('visionId');
    const search = searchParams.get('search') || '';
    
    if (!visionId) {
      return NextResponse.json({ error: 'Vision ID required' }, { status: 400 });
    }

    // Buscar usuarios inscritos a esta visión que NO tengan formulario médico
    const users = await prisma.usuario.findMany({
      where: {
        // Debe estar inscrito a esta visión
        vision_enrollments_vision_enrollments_userIdToUsuario: {
          some: {
            visionId: parseInt(visionId),
            enrollmentStatus: {
              in: ['ENROLLED', 'ACTIVE', 'COMPLETED']
            }
          }
        },
        // NO debe tener formulario médico aún
        MedicalForm: null,
        // Búsqueda por nombre o email
        OR: search ? [
          { nombre: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ] : undefined
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        // No exponer información sensible
      },
      orderBy: {
        nombre: 'asc'
      },
      take: 50 // Limitar resultados
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users for medical form:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
