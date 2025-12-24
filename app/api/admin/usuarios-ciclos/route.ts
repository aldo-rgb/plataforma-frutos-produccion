import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Listar usuarios por tipo de ciclo
export async function GET(request: Request) {
  try {
    console.log('🔵 Iniciando GET /api/admin/usuarios-ciclos');
    
    const session = await getServerSession(authOptions);
    console.log('🔵 Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('❌ No hay sesión');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true, nombre: true }
    });

    console.log('🔵 Usuario encontrado:', usuario?.nombre, 'Rol:', usuario?.rol);

    if (usuario?.rol !== 'ADMINISTRADOR' && usuario?.rol !== 'COORDINADOR') {
      console.log('❌ Sin permisos, rol:', usuario?.rol);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ALL'; // ALL, SOLO, VISION

    // Construir where clause para filtrar por tipo de ciclo
    let whereClause: any = {
      rol: 'PARTICIPANTE'
    };

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        vision: true, // Campo texto legacy
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            cycleType: true,
            cycleStartDate: true,
            cycleEndDate: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total usuarios encontrados: ${usuarios.length}`);
    console.log(`🔍 Filtro tipo: ${type}`);

    // Filtrar por tipo de ciclo si es necesario
    let usuariosFiltrados = usuarios;
    
    if (type === 'SOLO') {
      // Mostrar TODOS los usuarios que deberían tener ciclo personal
      // Esto incluye usuarios con ciclo SOLO Y usuarios sin ciclo (que lo tendrán al aprobar carta)
      usuariosFiltrados = usuarios.filter(u => {
        const enrollment = u.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
        // Mostrar si: NO tiene ciclo, o tiene ciclo SOLO
        return !enrollment || enrollment.cycleType === 'SOLO';
      });
    } else if (type === 'VISION') {
      // Mostrar solo usuarios con ciclo VISION
      usuariosFiltrados = usuarios.filter(u => 
        u.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.length > 0 &&
        u.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0]?.cycleType === 'VISION'
      );
    }
    // Si type === 'ALL', mostrar todos (no filtrar)

    // Mapear a formato esperado por el frontend
    const usuariosFormateados = usuariosFiltrados.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      createdAt: u.createdAt,
      visionId: null, // Por ahora no hay visiones implementadas
      vision: null,
      ProgramEnrollment: u.ProgramEnrollment_ProgramEnrollment_userIdToUsuario
    }));

    console.log(`✅ Usuarios a retornar: ${usuariosFormateados.length}`);
    
    return NextResponse.json({ usuarios: usuariosFormateados });

  } catch (error) {
    console.error('Error loading usuarios:', error);
    return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 });
  }
}
