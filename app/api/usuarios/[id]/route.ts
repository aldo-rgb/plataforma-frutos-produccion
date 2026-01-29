import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * PUT /api/usuarios/[id]
 * Actualizar rol y estado de un usuario (solo ADMIN)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Validar que el usuario tenga permisos (ADMIN, ADMINISTRADOR o LIDER)
    const rolesPermitidos = ['ADMIN', 'ADMINISTRADOR', 'LIDER'];
    if (!session || !rolesPermitidos.includes(session.user.rol?.toUpperCase())) {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden editar usuarios.' },
        { status: 403 }
      );
    }

    // Await params en Next.js 14+
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, email, rol, isActive, telefono } = body;

    // Validar que al menos uno de los campos esté presente
    if (nombre === undefined && email === undefined && rol === undefined && isActive === undefined && telefono === undefined) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Validar formato de email si se proporciona
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Formato de correo electrónico inválido' },
          { status: 400 }
        );
      }

      // Validar que el email no esté duplicado
      const emailLowerCase = email.trim().toLowerCase();
      const emailExistente = await prisma.usuario.findUnique({
        where: { email: emailLowerCase }
      });

      if (emailExistente && emailExistente.id !== userId) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado por otro usuario' },
          { status: 409 } // Conflict
        );
      }
    }

    // Validar rol si se proporciona
    const rolesValidos = ['PARTICIPANTE', 'MENTOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'GAMECHANGER', 'LIDER', 'TRAINER', 'STAFF', 'ADMIN', 'ADMINISTRADOR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];
    if (rol && !rolesValidos.includes(rol)) {
      return NextResponse.json(
        { error: `Rol inválido. Roles válidos: ${rolesValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Construir objeto de actualización
    const dataToUpdate: any = {};
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (email !== undefined) dataToUpdate.email = email.trim().toLowerCase();
    if (rol !== undefined) dataToUpdate.rol = rol;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (telefono !== undefined) dataToUpdate.telefono = telefono ? telefono.trim() : null;

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true
      }
    });

    console.log(`✅ Usuario actualizado: ${usuarioActualizado.nombre} (${usuarioActualizado.email})`);
    console.log(`   Rol: ${usuarioActualizado.rol}, Activo: ${usuarioActualizado.isActive}`);

    // Si el email cambió, alertar que debe usar el nuevo para login
    if (email && email.trim().toLowerCase() !== body.email) {
      console.log(`📧 Email actualizado: Nuevo correo para login → ${usuarioActualizado.email}`);
    }

    // Si el rol cambió a MENTOR, loguear para visibilidad
    if (rol === 'MENTOR') {
      console.log(`🎯 IMPORTANTE: Usuario ${usuarioActualizado.nombre} ahora es MENTOR`);
      console.log(`   → Ahora aparecerá en el selector de "Gestión de Talentos"`);
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });

  } catch (error: any) {
    console.error('❌ Error al actualizar usuario:', error);
    
    // Error específico: usuario no encontrado
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al actualizar usuario',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/usuarios/[id]
 * Obtener un usuario específico (opcional, para debugging)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Await params en Next.js 14+
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        vision: true,
        imagen: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(usuario);

  } catch (error: any) {
    console.error('❌ Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/usuarios/[id]
 * Eliminar un usuario permanentemente (solo ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Solo ADMIN o ADMINISTRADOR puede eliminar usuarios
    const rolesPermitidos = ['ADMIN', 'ADMINISTRADOR'];
    if (!session || !rolesPermitidos.includes(session.user.rol?.toUpperCase())) {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden eliminar usuarios.' },
        { status: 403 }
      );
    }

    // Await params en Next.js 14+
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Evitar auto-suicidio (Admin no puede borrarse a sí mismo)
    if (Number(session.user.id) === userId) {
      return NextResponse.json(
        { error: '⛔ No puedes eliminarte a ti mismo. Contacta a otro administrador.' },
        { status: 403 }
      );
    }

    // Ejecutar la eliminación
    const usuarioEliminado = await prisma.usuario.delete({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    console.log(`🗑️ Usuario ELIMINADO: ${usuarioEliminado.nombre} (${usuarioEliminado.email})`);
    console.log(`   ID: ${usuarioEliminado.id}, Rol: ${usuarioEliminado.rol}`);

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
      usuario: usuarioEliminado
    });

  } catch (error: any) {
    console.error('❌ Error eliminando usuario:', error);

    // Error: usuario no encontrado
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Error: Foreign Key Constraint (datos vinculados)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: '⛔ No se puede borrar: Este usuario tiene historial (llamadas, pagos, cartas, etc.). Mejor desactívalo en lugar de eliminarlo.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar usuario', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
