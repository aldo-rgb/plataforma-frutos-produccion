import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No hay sesión');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Sesión encontrada:', session.user.email);

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    console.log('✅ Usuario encontrado:', { id: usuario?.id, rol: usuario?.rol });

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    
    if (!usuario || !coordinadorRoles.includes(usuario.rol)) {
      console.log('❌ No es coordinador');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('🔍 Buscando usuarios para coordinador:', {
      coordinadorId: usuario.id,
      organizationId: usuario.organizationId
    });

    // Buscar usuarios de forma simple
    let usuarios: any[] = [];

    try {
      // Primero intentar buscar por organizationId si existe
      if (usuario.organizationId) {
        usuarios = await prisma.usuario.findMany({
          where: {
            organizationId: usuario.organizationId
          },
          include: {
            CartaFrutos: {
              select: {
                id: true,
                estado: true
              }
            }
          },
        });
        console.log(`✅ Encontrados ${usuarios.length} usuarios por organizationId`);
      }

      // Si no hay usuarios por organización, buscar por coordinadorId
      if (usuarios.length === 0) {
        usuarios = await prisma.usuario.findMany({
          where: {
            coordinadorId: usuario.id
          },
          include: {
            CartaFrutos: {
              select: {
                id: true,
                estado: true
              }
            }
          },
        });
        console.log(`✅ Encontrados ${usuarios.length} usuarios por coordinadorId`);
      }
    } catch (dbError: any) {
      console.error('❌ Error en query de usuarios:', dbError);
      throw dbError;
    }

    // Si no hay usuarios, retornar datos vacíos
    if (usuarios.length === 0) {
      console.log('⚠️ No hay usuarios, retornando datos vacíos');
      return NextResponse.json({
        success: true,
        stats: {
          overview: {
            totalStudents: 0,
            activeStudents: 0,
            completionRate: 0,
            totalCommunityMembers: 0,
          },
          tierDistribution: [],
          topStudents: [],
          availableCredits: 0,
        },
      });
    }

    console.log('📊 Calculando estadísticas...');

    // Calcular estadísticas
    const totalStudents = usuarios.filter(u => 
      u.rol === 'PARTICIPANTE' || u.rol === 'GAMECHANGER'
    ).length;

    const activeStudents = usuarios.filter(u => 
      (u.rol === 'PARTICIPANTE' || u.rol === 'GAMECHANGER') && u.isActive
    ).length;

    // Calcular tasa de cumplimiento
    const cartasAprobadas = usuarios.filter(u => 
      u.CartaFrutos && u.CartaFrutos.length > 0 && u.CartaFrutos.some((c: any) => c.estado === 'APROBADA')
    ).length;
    
    const completionRate = totalStudents > 0 
      ? Math.round((cartasAprobadas / totalStudents) * 100) 
      : 0;

    // Contar miembros de la comunidad
    const totalCommunityMembers = usuarios.filter(u => u.isActive).length;

    // Distribución por tier
    const tierCounts: Record<string, number> = {};
    usuarios.forEach(u => {
      const tier = u.tier || 'BASIC';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    const tierDistributionArray = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: usuarios.length > 0 ? (count / usuarios.length) * 100 : 0,
    }));

    // Top estudiantes
    const topStudents = usuarios
      .filter(u => u.rol === 'PARTICIPANTE' || u.rol === 'GAMECHANGER')
      .sort((a, b) => (b.experienciaXP || 0) - (a.experienciaXP || 0))
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        nombre: u.nombre,
        puntosCultivo: u.experienciaXP || 0,
        racha: 0,
        tier: u.tier || 'BASIC',
      }));

    // Licencias disponibles - Buscar en Organization
    let availableCredits = 0;
    
    // Intentar obtener licencias de la organización del coordinador
    if (usuario.organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: usuario.organizationId },
          select: {
            totalLicenses: true,
            activeLicenses: true
          }
        });
        
        if (organization) {
          // Calcular licencias disponibles = total - activas
          availableCredits = (organization.totalLicenses || 0) - (organization.activeLicenses || 0);
          
          console.log('✅ Licencias de organización:', {
            organizationId: usuario.organizationId,
            totalLicenses: organization.totalLicenses,
            activeLicenses: organization.activeLicenses,
            available: availableCredits
          });
        } else {
          console.log('⚠️ Organización no encontrada');
        }
      } catch (orgError) {
        console.error('⚠️ Error obteniendo licencias de organización:', orgError);
      }
    } else {
      console.log('⚠️ Coordinador sin organizationId');
    }

    console.log('✅ Estadísticas calculadas exitosamente');

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalStudents,
          activeStudents,
          completionRate,
          totalCommunityMembers,
        },
        tierDistribution: tierDistributionArray,
        topStudents,
        availableCredits,
      },
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas del coordinador:', error);
    console.error('Stack:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Error al obtener estadísticas',
        message: error?.message || 'Error desconocido',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
