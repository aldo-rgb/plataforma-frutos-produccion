import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/coordinador/participantes-lista
 * Obtiene lista de participantes por estado y nivel
 * Query params:
 *  - status: PENDING | ENROLLED | ACTIVE
 *  - level: BASIC | ADVANCED | PL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario y su organización
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        organizationId: true,
        rol: true
      }
    });

    if (!user || !user.organizationId) {
      return NextResponse.json({ success: false, error: 'Usuario sin organización' }, { status: 404 });
    }

    // Verificar rol de coordinador
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN', 'TRAINER', 'ADMINISTRADOR'];
    if (!allowedRoles.includes(user.rol || '')) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ENROLLED';
    const level = searchParams.get('level') || 'ADVANCED';

    const orgId = user.organizationId;

    // Obtener productos activos del nivel especificado
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        levelType: level as any,
        type: 'CORE_TRAINING'
      },
      select: {
        id: true,
        visionId: true
      }
    });

    const visionIds = activeProducts.filter(p => p.visionId).map(p => p.visionId as number);

    if (visionIds.length === 0) {
      return NextResponse.json({
        success: true,
        participantes: [],
        message: 'No hay visiones activas para este nivel'
      });
    }

    // Mapear status a enrollmentStatus y paymentStatus
    let enrollmentStatuses: string[] = [];
    let paymentFilter: any = undefined;
    
    if (status === 'PENDING') {
      // Pendientes de pago: incluye DECLARED y usuarios con deuda/pago parcial
      enrollmentStatuses = ['PENDING', 'DECLARED', 'ENROLLED', 'ACTIVE'];
      paymentFilter = { 
        OR: [
          { paymentStatus: null },
          { paymentStatus: 'PENDING' },
          { paymentStatus: 'PARTIAL' },
          { paymentStatus: 'UNPAID' }
        ]
      };
    } else if (status === 'ENROLLED') {
      // Inscritos: solo usuarios CON PAGO COMPLETO
      enrollmentStatuses = ['ENROLLED', 'ACTIVE'];
      paymentFilter = { 
        paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
      };
    } else {
      enrollmentStatuses = [status];
    }

    // Obtener participantes de las visiones activas
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: { in: visionIds },
        enrollmentStatus: { in: enrollmentStatuses },
        level: level as any,
        ...(paymentFilter || {})
      },
      select: {
        id: true,
        enrollmentStatus: true,
        paymentStatus: true,
        createdAt: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            imagen: true
          }
        },
        // Incluir información del invitador
        Usuario_vision_enrollments_invitedByToUsuario: {
          select: {
            id: true,
            nombre: true,
            telefono: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // También buscar en pre-registros para PENDING
    let preRegistros: any[] = [];
    if (status === 'PENDING') {
      const productIds = activeProducts.map(p => p.id);
      
      preRegistros = await prisma.advancedPreRegistration.findMany({
        where: {
          targetProductId: { in: productIds },
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              imagen: true
            }
          },
          // El staff que escaneó/registró (puede ser el invitador)
          scannedByStaff: {
            select: {
              id: true,
              nombre: true,
              telefono: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Combinar resultados
    const participantesFromEnrollments = enrollments.map(e => ({
      id: e.id, // ID del enrollment
      userId: e.Usuario_vision_enrollments_userIdToUsuario?.id || null, // ID del usuario
      nombre: e.Usuario_vision_enrollments_userIdToUsuario?.nombre || 'Sin nombre',
      email: e.Usuario_vision_enrollments_userIdToUsuario?.email || '',
      telefono: e.Usuario_vision_enrollments_userIdToUsuario?.telefono || null,
      imagen: e.Usuario_vision_enrollments_userIdToUsuario?.imagen || null,
      status: e.enrollmentStatus,
      paymentStatus: e.paymentStatus,
      source: 'enrollment',
      // Datos del invitador
      invitador: e.Usuario_vision_enrollments_invitedByToUsuario ? {
        nombre: e.Usuario_vision_enrollments_invitedByToUsuario.nombre,
        telefono: e.Usuario_vision_enrollments_invitedByToUsuario.telefono
      } : null
    }));

    const participantesFromPreRegistros = preRegistros.map(pr => ({
      id: pr.id, // ID del pre-registro
      userId: pr.user?.id || null, // ID del usuario
      nombre: pr.user?.nombre || 'Sin nombre',
      email: pr.user?.email || '',
      telefono: pr.user?.telefono || null,
      imagen: pr.user?.imagen || null,
      status: pr.status,
      source: 'preregistro',
      // Datos del invitador (quien escaneó el pre-registro)
      invitador: pr.scannedByStaff ? {
        nombre: pr.scannedByStaff.nombre,
        telefono: pr.scannedByStaff.telefono
      } : null
    }));

    // Combinar y eliminar duplicados por email
    const allParticipantes = [...participantesFromEnrollments, ...participantesFromPreRegistros];
    const uniqueParticipantes = allParticipantes.reduce((acc: any[], current) => {
      const exists = acc.find(p => p.email === current.email);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      participantes: uniqueParticipantes,
      total: uniqueParticipantes.length
    });

  } catch (error) {
    console.error('Error fetching participantes lista:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la lista de participantes' },
      { status: 500 }
    );
  }
}
