import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, password, organizationCode, organizationId, visionId } = body;

    // Validaciones
    if (!nombre || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor completa todos los campos' },
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

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: 'PARTICIPANTE',
        tier: 'BASIC',
        organizationId: finalOrganizationId,
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0
      }
    });

    // Si hay visionId, inscribir al usuario en la visión como participante
    if (visionId && finalOrganizationId) {
      try {
        await prisma.visionParticipante.create({
          data: {
            usuarioId: newUser.id,
            visionId: visionId,
            nivel: 'BASIC',
            asignadoPor: 'AUTO_REGISTRO',
            estado: 'PENDIENTE'
          }
        });

        console.log(`✅ Usuario ${newUser.id} inscrito en visión ${visionId}`);
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
