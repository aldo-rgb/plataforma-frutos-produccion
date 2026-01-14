import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📝 Registro recibido:', { 
      nombre: body.nombre,
      email: body.email,
      organizationId: body.organizationId,
      referralCode: body.referralCode,
      expectations: body.expectations
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
    } = body;

    // Validaciones básicas
    if (!nombre || !apodo || !telefono || !horarioLlamada || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor completa todos los campos requeridos' },
        { status: 400 }
      );
    }

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

    // Determinar organizationId
    let finalOrganizationId = organizationId;
    
    if (!finalOrganizationId && organizationCode) {
      const organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { slug: organizationCode },
            { id: !isNaN(Number(organizationCode)) ? parseInt(organizationCode) : 0 }
          ]
        }
      });

      if (organization) {
        finalOrganizationId = organization.id;
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

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

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
        
        console.log(`✅ Referido encontrado: Usuario ${referrer.id} invitó con texto "${invitedByText}"`);
      } else {
        console.log(`ℹ️ No se encontró referido para "${invitedByText}", pero se guardará el texto`);
      }
    }

    // Generar código de referido único para el nuevo usuario
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    generatedReferralCode = `${nombre.substring(0, 3).toUpperCase()}${timestamp}${random}`;

    // Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        apodo,
        telefono,
        horarioLlamada,
        email,
        password: hashedPassword,
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
        ...(profession && { profession }),
        ...(birthdate && { birthdate: new Date(birthdate) }),
        ...(children !== undefined && { children: parseInt(children) }),
        ...(goals && goals.length > 0 && { goals: JSON.stringify(goals) }),
        ...(expectations && { expectations }),
      }
    });

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
        console.log(`🎯 Visión BASIC encontrada automáticamente: ${nextVision.nombre} (ID: ${nextVision.id})`);
      } else {
        console.warn(`⚠️ No hay visión BASIC disponible para organización ${finalOrganizationId}`);
      }
    }

    // Inscribir al usuario en la visión
    if (finalVisionId && finalOrganizationId) {
      try {
        // Buscar el coordinador de la visión
        const vision = await prisma.vision.findUnique({
          where: { id: finalVisionId },
          select: { coordinadorId: true }
        });

        if (vision?.coordinadorId) {
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

          console.log(`✅ Usuario ${newUser.id} inscrito en visión ${finalVisionId}`);
        } else {
          console.warn(`⚠️ Visión ${finalVisionId} no tiene coordinador asignado`);
        }
      } catch (error) {
        console.error('Error al inscribir usuario en visión:', error);
        // No fallar el registro si falla la inscripción
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: newUser.id
    });

  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
