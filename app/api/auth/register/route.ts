import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { registerSchema, validateData, getValidationErrorMessage } from '@/lib/validations';
import { sendWelcomeNotifications, DEFAULT_PASSWORD } from '@/lib/welcome-notification';
import { triggerEnrollmentTaskOnRegistration } from '@/lib/enrollment-task-trigger';

export async function POST(request: Request) {
  try {
    // Rate limiting - muy restrictivo para registro
    const { result, response } = rateLimit(request, RateLimitPresets.auth);
    if (response) {
      logger.warn('Rate limit exceeded on register');
      return response;
    }

    const body = await request.json();
    
    // Validar datos con Zod
    const validation = validateData(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: getValidationErrorMessage(validation.details) },
        { status: 400 }
      );
    }
    
    logger.debug('Registro recibido', { 
      email: body.email,
      organizationId: body.organizationId,
    });
    
    const { 
      nombre, 
      apodo,
      telefono,
      horarioLlamada,
      email, 
      password, 
      organizationCode, 
      organizationId, 
      visionId,
      referralCode,
      profession,
      birthdate,
      children,
      goals,
      expectations
    } = validation.data;

    // Validaciones básicas (password ya no es requerido - se usa Quantum123 por defecto)
    // apodo y horarioLlamada ahora se completan después del pago en /dashboard/completar-perfil
    if (!nombre || !telefono || !email) {
      return NextResponse.json(
        { success: false, error: 'Por favor completa todos los campos requeridos' },
        { status: 400 }
      );
    }
    
    // Usar contraseña por defecto si no se proporciona
    const finalPassword = password || 'Quantum123';
    const requirePasswordChange = !password; // Marcar para cambio si usó contraseña por defecto

    // Verificar si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Determinar organizationId y obtener nombre para notificaciones
    let finalOrganizationId = organizationId;
    let organizationName = 'Impacto Cuántico'; // Default
    
    if (!finalOrganizationId && organizationCode) {
      const organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { slug: organizationCode },
            { id: !isNaN(Number(organizationCode)) ? parseInt(organizationCode) : 0 }
          ]
        },
        select: { id: true, name: true }
      });

      if (organization) {
        finalOrganizationId = organization.id;
        organizationName = organization.name;
      }
    } else if (finalOrganizationId) {
      // Si ya tenemos el ID, buscar el nombre
      const organization = await prisma.organization.findUnique({
        where: { id: finalOrganizationId },
        select: { name: true }
      });
      if (organization) {
        organizationName = organization.name;
      }
    }

    // VALIDACIÓN CRÍTICA: Verificar que haya una visión BASIC disponible
    // Solo permite el registro si hay una visión que aún no ha iniciado
    if (finalOrganizationId && !visionId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const availableVision = await prisma.vision.findFirst({
        where: {
          organizationId: finalOrganizationId,
          isActive: true,
          enabledLevels: { has: 'BASIC' },
          OR: [
            { startDate: null },
            { startDate: { gt: today } }
          ]
        },
        select: { id: true }
      });

      if (!availableVision) {
        return NextResponse.json(
          { success: false, error: 'No hay programa disponible para inscripción en esta sucursal. Por favor intenta más tarde o contacta a la organización.' },
          { status: 400 }
        );
      }
    }

    // Hashear contraseña (usa la proporcionada o Quantum123 por defecto)
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Procesar referido si existe
    let invitedById: number | null = null;
    let invitedByText: string | null = null;
    let generatedReferralCode: string | null = null;

    if (referralCode && referralCode.trim()) {
      // Guardar el texto original que escribió el usuario
      invitedByText = referralCode.trim();

      // Intentar buscar por código de referido primero
      let referrer = await prisma.usuario.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
        select: { id: true }
      });

      // Si no se encuentra por código, buscar por nombre exacto
      if (!referrer) {
        referrer = await prisma.usuario.findFirst({
          where: { 
            nombre: {
              equals: referralCode,
              mode: 'insensitive'
            }
          },
          select: { id: true }
        });
      }

      if (referrer) {
        invitedById = referrer.id;
        
        // Incrementar contador de invitados del referidor
        await prisma.usuario.update({
          where: { id: referrer.id },
          data: { invitedCount: { increment: 1 } }
        });
        
        logger.debug(`✅ Referido encontrado: Usuario ${referrer.id} invitó con texto "${invitedByText}"`);
      } else {
        logger.debug(`ℹ️ No se encontró referido para "${invitedByText}", pero se guardará el texto`);
      }
    }

    // Generar código de referido único para el nuevo usuario
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Limpiar caracteres especiales (tildes, ñ, etc) para evitar problemas con QR
    const nombreLimpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
    generatedReferralCode = `${prefix}${timestamp}${random}`;

    // Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        telefono,
        email,
        password: hashedPassword,
        requirePasswordChange, // Marcar si necesita cambiar contraseña al primer login
        rol: 'PARTICIPANTE',
        tier: 'FREE',
        organizationId: finalOrganizationId,
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0,
        invitedBy: invitedById,
        invitedByText: invitedByText,
        referralCode: generatedReferralCode,
        // Campos opcionales del formulario extendido
        ...(apodo && { apodo }),
        ...(horarioLlamada && { horarioLlamada }),
        ...(profession && { profession }),
        ...(birthdate && { birthdate: new Date(birthdate) }),
        ...(children !== undefined && { children: parseInt(children) }),
        ...(goals && goals.length > 0 && { goals: JSON.stringify(goals) }),
        ...(expectations && { expectations }),
      }
    });

    // IMPORTANTE: Buscar usuarios que tienen el nombre de este nuevo usuario como invitedByText
    // y ligarlos automáticamente
    try {
      const usersToLink = await prisma.usuario.findMany({
        where: {
          invitedByText: {
            contains: nombre,
            mode: 'insensitive'
          },
          invitedBy: null // Solo los que no están ligados aún
        },
        select: { id: true, nombre: true, invitedByText: true }
      });

      if (usersToLink.length > 0) {
        logger.debug(`🔗 Encontrados ${usersToLink.length} usuarios pendientes de ligar con ${nombre}:`);
        
        for (const userToLink of usersToLink) {
          // Verificar que el nombre coincida (búsqueda flexible)
          const normalizedInvitedByText = userToLink.invitedByText?.toLowerCase().trim();
          const normalizedNewUserName = nombre.toLowerCase().trim();
          
          if (normalizedInvitedByText?.includes(normalizedNewUserName) || 
              normalizedNewUserName.includes(normalizedInvitedByText || '')) {
            await prisma.usuario.update({
              where: { id: userToLink.id },
              data: { invitedBy: newUser.id }
            });
            
            // Incrementar el contador de invitados del nuevo usuario
            await prisma.usuario.update({
              where: { id: newUser.id },
              data: { invitedCount: { increment: 1 } }
            });
            
            logger.debug(`  ✅ ${userToLink.nombre} (ID: ${userToLink.id}) ligado a ${nombre} (ID: ${newUser.id})`);
          }
        }
      }
    } catch (linkError) {
      logger.error('Error al ligar usuarios pendientes:', linkError);
      // No fallar el registro si falla el ligado
    }

    // Buscar la próxima visión BASIC disponible para inscribir al usuario
    // Si viene visionId explícito lo usamos, si no, buscamos automáticamente
    let finalVisionId = visionId;
    
    if (!finalVisionId && finalOrganizationId) {
      // Buscar la próxima visión BASIC que aún no ha iniciado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const nextVision = await prisma.vision.findFirst({
        where: {
          organizationId: finalOrganizationId,
          isActive: true,
          enabledLevels: { has: 'BASIC' },
          OR: [
            { startDate: null },
            { startDate: { gt: today } }
          ]
        },
        orderBy: { startDate: 'asc' },
        select: { id: true, coordinadorId: true, nombre: true }
      });

      if (nextVision) {
        finalVisionId = nextVision.id;
        logger.debug(`🎯 Visión BASIC encontrada automáticamente: ${nextVision.nombre} (ID: ${nextVision.id})`);
      } else {
        logger.warn(`⚠️ No hay visión BASIC disponible para organización ${finalOrganizationId}`);
      }
    }

    // Inscribir al usuario en la visión
    let visionName: string | undefined;
    if (finalVisionId && finalOrganizationId) {
      try {
        // Buscar el coordinador de la visión
        const vision = await prisma.vision.findUnique({
          where: { id: finalVisionId },
          select: { coordinadorId: true, nombre: true }
        });

        if (vision) {
          visionName = vision.nombre;
          
          if (vision.coordinadorId) {
            await prisma.vision_enrollments.create({
              data: {
                userId: newUser.id,
                visionId: finalVisionId,
                coordinatorId: vision.coordinadorId,
                level: 'BASIC',
                enrollmentStatus: 'ENROLLED',
                updatedAt: new Date()
              }
            });

            logger.debug(`✅ Usuario ${newUser.id} inscrito en visión ${finalVisionId}`);
          } else {
            logger.warn(`⚠️ Visión ${finalVisionId} no tiene coordinador asignado`);
          }
        }
      } catch (error) {
        logger.error('Error al inscribir usuario en visión:', error);
        // No fallar el registro si falla la inscripción
      }
    }

    // Enviar notificaciones de bienvenida (Email + WhatsApp)
    try {
      await sendWelcomeNotifications({
        userId: newUser.id,
        email,
        telefono,
        nombre,
        password: finalPassword, // Contraseña en texto plano
        organizationName,
        visionName
      });
    } catch (notifError) {
      logger.error('Error enviando notificaciones de bienvenida:', notifError);
      // No fallar el registro si fallan las notificaciones
    }

    // TRIGGER: Completar tarea de enrolamiento del invitador (servicioTrans)
    if (invitedById) {
      try {
        const triggerResult = await triggerEnrollmentTaskOnRegistration(
          newUser.id,
          invitedById,
          nombre
        );
        if (triggerResult.taskCompleted) {
          logger.debug(`🎯 Tarea de enrolamiento completada: ${triggerResult.message}`);
        }
      } catch (triggerError) {
        logger.error('Error en trigger de enrolamiento:', triggerError);
        // No fallar el registro si falla el trigger
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: newUser.id
    });

  } catch (error) {
    logger.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
