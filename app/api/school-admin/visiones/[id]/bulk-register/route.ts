import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

interface ExcelUser {
  nombre: string;
  email: string;
  telefono?: string;
  referido?: string;
  visionGraduacion?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).rol;
    if (!['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { users } = body as { users: ExcelUser[] };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron usuarios para registrar' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y está activa
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        isActive: true,
        organizationId: true,
        coordinadorId: true,
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener el primer admin/coordinador de la organización
    const adminUser = await prisma.usuario.findFirst({
      where: {
        organizationId: vision.organizationId,
        rol: { in: ['ADMINISTRADOR', 'COORDINADOR', 'SCHOOL_ADMIN'] },
        isActive: true
      },
      select: { id: true }
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'No hay administradores activos en esta organización' },
        { status: 500 }
      );
    }

    const results = {
      success: [] as Array<{ email: string; nombre: string }>,
      failed: [] as Array<{ email: string; nombre: string; reason: string }>,
      duplicates: [] as Array<{ email: string; nombre: string }>
    };

    // Procesar cada usuario
    for (const userData of users) {
      const { nombre, email, telefono, referido, visionGraduacion } = userData;

      // Validar campos requeridos
      if (!nombre || !email) {
        results.failed.push({
          email: email || 'Sin email',
          nombre: nombre || 'Sin nombre',
          reason: 'Nombre y email son requeridos'
        });
        continue;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.failed.push({
          email,
          nombre,
          reason: 'Formato de correo inválido'
        });
        continue;
      }

      // Buscar el ángel de enrolamiento si se proporcionó
      let angelEnrolamientoId: number | null = null;
      let angelEnrolamientoNombre: string | null = null;
      
      if (referido && referido.trim()) {
        // Intentar buscar por código de referido primero
        let referrer = await prisma.usuario.findFirst({
          where: { 
            OR: [
              { referralCode: { equals: referido.trim(), mode: 'insensitive' } },
              { nombre: { contains: referido.trim(), mode: 'insensitive' } }
            ]
          },
          select: { id: true, nombre: true }
        });
        
        if (referrer) {
          angelEnrolamientoId = referrer.id;
        } else {
          // Si no se encuentra, guardar el nombre para búsqueda posterior
          angelEnrolamientoNombre = referido.trim();
        }
      }

      try {
        // Verificar si el email ya existe
        const existingUser = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase().trim() }
        });

        if (existingUser) {
          // Verificar si ya está en esta visión
          const existingEnrollment = await prisma.vision_enrollments.findFirst({
            where: {
              userId: existingUser.id,
              visionId: vision.id,
              level: 'PL'
            }
          });

          if (existingEnrollment) {
            results.duplicates.push({ email, nombre });
          } else {
            // Crear enrollment para usuario existente
            await prisma.vision_enrollments.create({
              data: {
                visionId: vision.id,
                userId: existingUser.id,
                coordinatorId: vision.coordinadorId || adminUser.id,
                level: 'PL',
                enrollmentStatus: 'ENROLLED',
                paymentStatus: 'PAID',
                attendanceStatus: 'PENDING',
                updatedAt: new Date()
              }
            });
            results.success.push({ email, nombre });
          }
          continue;
        }

        // Contraseña estándar Quantum123 - usuario deberá cambiarla en primer login
        const hashedPassword = await bcrypt.hash('Quantum123', 10);
        
        // Generar código de referido único para el nuevo usuario
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Limpiar caracteres especiales (tildes, ñ, etc) para evitar problemas con QR
        const nombreLimpio = nombre.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
        const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
        const generatedReferralCode = `${prefix}${timestamp}${random}`;

        // Crear usuario con tier FREE
        const newUser = await prisma.usuario.create({
          data: {
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            telefono: telefono?.trim() || null,
            password: hashedPassword,
            rol: 'PARTICIPANTE',
            tier: 'FREE',
            isActive: true,
            organizationId: vision.organizationId,
            referralCode: generatedReferralCode,
            requirePasswordChange: true, // Forzar cambio en primer login
            // Campos de graduación del sistema viejo
            visionAngel: visionGraduacion?.trim() || null, // Visión donde se graduó
            invitedBy: angelEnrolamientoId, // ID del ángel si se encontró
            invitedByText: angelEnrolamientoNombre, // Nombre pendiente si no se encontró
          }
        });

        // Si se asignó un ángel encontrado, incrementar su contador de invitados
        if (angelEnrolamientoId) {
          await prisma.usuario.update({
            where: { id: angelEnrolamientoId },
            data: { invitedCount: { increment: 1 } }
          });
        }

        // Asignar a la visión (legacy - VisionParticipante)
        await prisma.visionParticipante.create({
          data: {
            visionId: vision.id,
            participanteId: newUser.id
          }
        });

        // Crear enrollment en nivel PL (LEADERSHIP)
        await prisma.vision_enrollments.create({
          data: {
            visionId: vision.id,
            userId: newUser.id,
            coordinatorId: vision.coordinadorId || adminUser.id,
            level: 'PL',
            enrollmentStatus: 'ENROLLED',
            paymentStatus: 'PAID',
            attendanceStatus: 'PENDING',
            invitedBy: angelEnrolamientoId, // También guardar en enrollment
            updatedAt: new Date()
          }
        });

        results.success.push({ email, nombre });

      } catch (error: any) {
        logger.error(`Error registrando usuario ${email}:`, error);
        results.failed.push({
          email,
          nombre,
          reason: error.message || 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: users.length,
        registered: results.success.length,
        duplicates: results.duplicates.length,
        failed: results.failed.length,
        details: results
      }
    });

  } catch (error: any) {
    logger.error('Error en bulk register:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
