import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener coordinadores de la organización
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const directorId = parseInt(session.user.id);

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener coordinadores de la organización (todos los tipos)
    const coordinadores = await prisma.usuario.findMany({
      where: {
        organizationId: director.organizationId,
        rol: {
          in: ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER']
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true, // Incluir el tipo de coordinador
        isActive: true,
        createdAt: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            VisionParticipante: {
              select: {
                participanteId: true
              }
            },
            VisionGameChanger: {
              select: {
                gameChangerId: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Procesar datos
    const coordinadoresConInfo = coordinadores.map(coord => ({
      ...coord,
      totalVisiones: coord.Vision.length,
      totalParticipantes: coord.Vision.reduce((acc, v) => 
        acc + v.VisionParticipante.length + v.VisionGameChanger.length, 0
      )
    }));

    return NextResponse.json({
      success: true,
      coordinadores: coordinadoresConInfo
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo coordinadores:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener coordinadores',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo coordinador
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const directorId = parseInt(session.user.id);
    const body = await request.json();

    const { nombre, email, password, rol } = body;

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar que el rol sea un tipo de coordinador válido
    const validCoordinatorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    if (!validCoordinatorRoles.includes(rol)) {
      return NextResponse.json(
        { error: 'Tipo de coordinador inválido' },
        { status: 400 }
      );
    }

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Crear coordinador
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar código de licencia especial para coordinador (no consume créditos)
    const adminLicenseCode = `COORD-ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const coordinador = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol, // Usar el rol enviado desde el formulario
        tier: 'STANDARD', // ✅ Licencia de cortesía STANDARD
        organizationId: director.organizationId,
        isActive: true,
        // Asignar licencia administrativa directamente (no consume créditos de la organización)
        LicenseAssignment_LicenseAssignment_userIdToUsuario: {
          create: {
            licenseCode: adminLicenseCode,
            isActive: true,
            organizationId: director.organizationId,
            assignedBy: directorId,
            assignedAt: new Date(),
            // Esta licencia no tiene visionId porque es administrativa
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        createdAt: true,
        LicenseAssignment_LicenseAssignment_userIdToUsuario: {
          select: {
            licenseCode: true,
            isActive: true
          }
        }
      }
    });

    console.log(`✅ Coordinador creado con licencia administrativa: ${adminLicenseCode}`);

    return NextResponse.json({
      success: true,
      coordinador,
      message: 'Coordinador creado exitosamente con licencia administrativa'
    });

  } catch (error: any) {
    console.error('❌ Error creando coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear coordinador',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
