import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Permitir SCHOOL_ADMIN y otros roles autorizados
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    if (!session?.user || !allowedRoles.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nombre, email, telefono, visionId, createNewUser } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Obtener organización del director
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 403 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    let userId: number;

    if (existingUser) {
      // Usuario existe - verificar organización
      if (existingUser.organizationId && existingUser.organizationId !== director.organizationId) {
        // Usuario pertenece a OTRA organización
        return NextResponse.json(
          { success: false, error: 'Este usuario pertenece a otra organización' },
          { status: 403 }
        );
      }

      // Usuario SIN organización (LOBO_SOLITARIO) o de la MISMA organización
      if (!existingUser.organizationId) {
        // Incorporar lobo solitario a la organización
        await prisma.usuario.update({
          where: { id: existingUser.id },
          data: {
            organizationId: director.organizationId,
            rol: 'GAMECHANGER',
            tier: 'STANDARD', // ✅ Asignar tier STANDARD
            updatedAt: new Date(),
          },
        });
        
        userId = existingUser.id;

        return NextResponse.json({
          success: true,
          userId,
          message: 'Lobo Solitario incorporado a la organización como Game Changer',
          isExisting: true,
          wasLoboSolitario: true,
        });
      }

      // Usuario de la misma organización - solo convertir rol si es necesario
      if (existingUser.rol !== 'GAMECHANGER') {
        await prisma.usuario.update({
          where: { id: existingUser.id },
          data: {
            rol: 'GAMECHANGER',
            tier: 'STANDARD', // ✅ Asignar tier STANDARD
            updatedAt: new Date(),
          },
        });
      }

      userId = existingUser.id;

      return NextResponse.json({
        success: true,
        userId,
        message: 'Usuario convertido a Game Changer exitosamente',
        isExisting: true,
      });
    } else {
      // Usuario no existe - crear nuevo con contraseña Quantum123
      
      // ✅ Verificar licencias disponibles en tabla License
      // Obtener todas las licencias activas de la organización
      const allLicenses = await prisma.license.findMany({
        where: {
          organizationId: director.organizationId,
          isActive: true,
        },
        select: {
          code: true
        }
      });

      // Obtener códigos de licencias ya asignadas
      const assignedCodes = await prisma.licenseAssignment.findMany({
        where: {
          organizationId: director.organizationId,
          isActive: true,
        },
        select: {
          licenseCode: true
        }
      });

      const assignedCodesSet = new Set(assignedCodes.map(a => a.licenseCode));
      const availableLicenses = allLicenses.filter(l => !assignedCodesSet.has(l.code));
      
      if (availableLicenses.length < 1) {
        return NextResponse.json({ 
          success: false, 
          error: `No hay licencias disponibles. Disponibles: ${availableLicenses.length}, Necesarias: 1. Compra más licencias primero.` 
        }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash('Quantum123', 10);

      const newUser = await prisma.usuario.create({
        data: {
          nombre,
          email: email.toLowerCase(),
          telefono: telefono || null,
          password: hashedPassword,
          rol: 'GAMECHANGER',
          tier: 'STANDARD',
          organizationId: director.organizationId,
          isActive: true,
          requirePasswordChange: true, // ✅ Forzar cambio de contraseña al iniciar sesión
        },
      });

      userId = newUser.id;

      // Tomar una licencia disponible y asignarla
      const licenseToAssign = availableLicenses[0];

      // Crear licencia STANDARD ACTIVADA automáticamente
      await prisma.licenseAssignment.create({
        data: {
          userId: newUser.id,
          organizationId: director.organizationId,
          visionId: visionId || null,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          licenseCode: licenseToAssign.code, // ✅ Usar código de licencia real
          isActive: true,
          activatedAt: new Date(),
          notes: 'Licencia STANDARD automática - Game Changer creado por School Admin - Activada'
        }
      });

      return NextResponse.json({
        success: true,
        userId,
        message: 'Game Changer creado exitosamente con licencia STANDARD activada',
        isExisting: false,
        defaultPassword: 'Quantum123',
        licensesRemaining: availableLicenses.length - 1
      });
    }

  } catch (error) {
    logger.error('Error creating/converting game changer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
