import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      nombre, 
      email, 
      telefono, 
      password,
      // Nuevos campos opcionales para usuarios del sistema viejo
      visionGraduacion,
      angelEnrolamientoId,
      angelEnrolamientoNombre
    } = body;

    // Validaciones
    if (!nombre || !email || !telefono || !password) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Formato de correo inválido' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y está activa
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        maxParticipantes: true,
        isActive: true,
        organizationId: true,
        coordinadorId: true, // Para crear el enrollment
        _count: {
          select: {
            VisionParticipante: true
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    if (!vision.isActive) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no está activa' },
        { status: 403 }
      );
    }

    // Verificar límite de participantes
    if (vision.maxParticipantes && vision._count.VisionParticipante >= vision.maxParticipantes) {
      return NextResponse.json(
        { success: false, error: 'Se ha alcanzado el límite de participantes para esta visión' },
        { status: 403 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este correo electrónico ya está registrado' },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obtener el primer admin/coordinador de la organización para usar como assignedBy
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

    // Generar código de referido único
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nombreLimpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
    const generatedReferralCode = `${prefix}${timestamp}${random}`;

    // Crear usuario con tier FREE (registro vía QR)
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email,
        telefono,
        password: hashedPassword,
        rol: 'PARTICIPANTE',
        tier: 'FREE',
        isActive: true,
        organizationId: vision.organizationId,
        referralCode: generatedReferralCode, // 🎯 Código de referido único
        // Campos para usuarios del sistema viejo
        visionAngel: visionGraduacion || null, // Visión donde se graduó
        invitedBy: angelEnrolamientoId || null, // ID del ángel si se encontró
        invitedByText: (!angelEnrolamientoId && angelEnrolamientoNombre) ? angelEnrolamientoNombre : null // Nombre pendiente si no se encontró
      }
    });

    // Asignar a la visión (legacy - VisionParticipante)
    await prisma.visionParticipante.create({
      data: {
        visionId: vision.id,
        participanteId: newUser.id
      }
    });

    // ==========================================
    // CREAR ENROLLMENT EN NIVEL PL (LEADERSHIP)
    // ==========================================
    // Los usuarios que se registran desde /registro/[id] son graduados
    // y van directo a nivel Liderato (PL)
    if (vision.coordinadorId) {
      await prisma.vision_enrollments.create({
        data: {
          visionId: vision.id,
          userId: newUser.id,
          coordinatorId: vision.coordinadorId,
          level: 'PL', // Nivel Liderato
          enrollmentStatus: 'ENROLLED',
          paymentStatus: 'PAID', // Ya pagaron en el sistema anterior
          attendanceStatus: 'PENDING',
          invitedBy: angelEnrolamientoId || null,
          updatedAt: new Date()
        }
      });
    }

    // Si se asignó un ángel encontrado, incrementar su contador de invitados
    if (angelEnrolamientoId) {
      await prisma.usuario.update({
        where: { id: angelEnrolamientoId },
        data: {
          invitedCount: { increment: 1 }
        }
      });
    }

    // ==========================================
    // ENLACE AUTOMÁTICO DE INVITADOS PENDIENTES
    // ==========================================
    // Buscar usuarios que tenían guardado el nombre de este nuevo usuario como ángel pendiente
    // y enlazarlos automáticamente
    try {
      const pendingInvitees = await prisma.usuario.findMany({
        where: {
          invitedByText: {
            equals: nombre,
            mode: 'insensitive'
          },
          invitedBy: null // Solo los que no tienen ángel asignado todavía
        },
        select: { id: true }
      });

      if (pendingInvitees.length > 0) {
        // Enlazar a todos los invitados pendientes con este nuevo usuario
        await prisma.usuario.updateMany({
          where: {
            id: { in: pendingInvitees.map(u => u.id) }
          },
          data: {
            invitedBy: newUser.id,
            invitedByText: null // Limpiar el texto pendiente
          }
        });

        // Actualizar el contador de invitados del nuevo usuario
        await prisma.usuario.update({
          where: { id: newUser.id },
          data: {
            invitedCount: { increment: pendingInvitees.length }
          }
        });

        logger.debug(`✅ Se enlazaron ${pendingInvitees.length} usuarios pendientes al nuevo ángel: ${nombre}`);
      }
    } catch (linkError) {
      // No fallar el registro si hay error en el enlace automático
      logger.error('Error en enlace automático de invitados:', linkError);
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: newUser.id
    });

  } catch (error) {
    logger.error('Error al registrar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el registro' },
      { status: 500 }
    );
  }
}
