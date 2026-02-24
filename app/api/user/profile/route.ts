import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener datos completos del usuario incluyendo organización
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        profileImage: true,
        organizationId: true,
        assignedMentorId: true,
        apodo: true,
        horarioLlamada: true,
        children: true,
        goal1: true,
        goal2: true,
        goal3: true,
        goals: true,
        expectations: true,
        profileCompleted: true,
        profession: true,
        birthdate: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: usuario.id,
        rol: usuario.rol,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        profileImage: usuario.profileImage,
        organizationId: usuario.organizationId,
        Organization: usuario.Organization,
        assignedMentorId: usuario.assignedMentorId,
        assignedMentor: usuario.Usuario_Usuario_assignedMentorIdToUsuario,
        apodo: usuario.apodo,
        horarioLlamada: usuario.horarioLlamada,
        children: usuario.children,
        goal1: usuario.goal1,
        goal2: usuario.goal2,
        goal3: usuario.goal3,
        goals: usuario.goals,
        expectations: usuario.expectations,
        profileCompleted: usuario.profileCompleted,
        profession: usuario.profession,
        birthdate: usuario.birthdate
      }
    });

  } catch (error) {
    logger.error('Error al obtener perfil del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      nombre, 
      telefono, 
      profileImage,
      apodo,
      horarioLlamada,
      children,
      goals, // Array de metas
      goal1,
      goal2,
      goal3,
      expectations,
      profileCompleted
    } = body;

    // Construir objeto de actualización solo con campos presentes
    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono || null;
    if (profileImage !== undefined) updateData.profileImage = profileImage || null;
    if (apodo !== undefined) updateData.apodo = apodo;
    if (horarioLlamada !== undefined) updateData.horarioLlamada = horarioLlamada;
    if (children !== undefined) updateData.children = parseInt(children) || 0;
    if (expectations !== undefined) updateData.expectations = expectations;
    if (profileCompleted !== undefined) updateData.profileCompleted = profileCompleted;
    
    // Manejar metas - puede venir como array o como campos individuales
    if (goals !== undefined && Array.isArray(goals)) {
      if (goals[0]) updateData.goal1 = goals[0];
      if (goals[1]) updateData.goal2 = goals[1];
      if (goals[2]) updateData.goal3 = goals[2];
    } else {
      if (goal1 !== undefined) updateData.goal1 = goal1;
      if (goal2 !== undefined) updateData.goal2 = goal2;
      if (goal3 !== undefined) updateData.goal3 = goal3;
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        profileImage: true,
        rol: true,
        apodo: true,
        horarioLlamada: true,
        children: true,
        goal1: true,
        goal2: true,
        goal3: true,
        expectations: true,
        profileCompleted: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: usuarioActualizado
    });

  } catch (error) {
    logger.error('Error al actualizar perfil:', error);
    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
