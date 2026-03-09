import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener configuración de comisiones de la organización
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Buscar organización donde el usuario es admin
    const organization = await prisma.organization.findUnique({
      where: { schoolAdminId: user.id },
      select: {
        id: true,
        teamCommissionsEnabled: true,
        teamCommissionBasicSeated: true,
        teamCommissionAdvancedSeated: true,
        teamCommissionAdvancedCombo: true,
        teamCommissionPLStart: true,
        referralCommissionsEnabled: true,
        referralCommissionBasicPercent: true,
        referralCommissionAdvancedPercent: true,
        referralCommissionPLPercent: true,
        referralCommissionComboPercent: true,
      }
    });

    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      config: {
        // Comisiones de equipo
        teamCommissionsEnabled: organization.teamCommissionsEnabled,
        teamCommissionBasicSeated: Number(organization.teamCommissionBasicSeated),
        teamCommissionAdvancedSeated: Number(organization.teamCommissionAdvancedSeated),
        teamCommissionAdvancedCombo: Number(organization.teamCommissionAdvancedCombo),
        teamCommissionPLStart: Number(organization.teamCommissionPLStart),
        // Comisiones por referencia
        referralCommissionsEnabled: organization.referralCommissionsEnabled,
        referralCommissionBasicPercent: Number(organization.referralCommissionBasicPercent),
        referralCommissionAdvancedPercent: Number(organization.referralCommissionAdvancedPercent),
        referralCommissionPLPercent: Number(organization.referralCommissionPLPercent),
        referralCommissionComboPercent: Number(organization.referralCommissionComboPercent),
      }
    });

  } catch (error) {
    console.error('Error fetching commissions config:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// PUT: Actualizar configuración de comisiones
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Comisiones de equipo
      teamCommissionsEnabled,
      teamCommissionBasicSeated,
      teamCommissionAdvancedSeated,
      teamCommissionAdvancedCombo,
      teamCommissionPLStart,
      // Comisiones por referencia
      referralCommissionsEnabled,
      referralCommissionBasicPercent,
      referralCommissionAdvancedPercent,
      referralCommissionPLPercent,
      referralCommissionComboPercent,
    } = body;

    // Construir objeto de actualización dinámicamente
    const updateData: any = { updatedAt: new Date() };

    // Solo actualizar campos que fueron enviados
    if (teamCommissionsEnabled !== undefined) {
      updateData.teamCommissionsEnabled = teamCommissionsEnabled;
    }
    if (teamCommissionBasicSeated !== undefined) {
      updateData.teamCommissionBasicSeated = teamCommissionBasicSeated;
    }
    if (teamCommissionAdvancedSeated !== undefined) {
      updateData.teamCommissionAdvancedSeated = teamCommissionAdvancedSeated;
    }
    if (teamCommissionAdvancedCombo !== undefined) {
      updateData.teamCommissionAdvancedCombo = teamCommissionAdvancedCombo;
    }
    if (teamCommissionPLStart !== undefined) {
      updateData.teamCommissionPLStart = teamCommissionPLStart;
    }
    if (referralCommissionsEnabled !== undefined) {
      updateData.referralCommissionsEnabled = referralCommissionsEnabled;
    }
    if (referralCommissionBasicPercent !== undefined) {
      updateData.referralCommissionBasicPercent = referralCommissionBasicPercent;
    }
    if (referralCommissionAdvancedPercent !== undefined) {
      updateData.referralCommissionAdvancedPercent = referralCommissionAdvancedPercent;
    }
    if (referralCommissionPLPercent !== undefined) {
      updateData.referralCommissionPLPercent = referralCommissionPLPercent;
    }
    if (referralCommissionComboPercent !== undefined) {
      updateData.referralCommissionComboPercent = referralCommissionComboPercent;
    }

    const updated = await prisma.organization.update({
      where: { schoolAdminId: user.id },
      data: updateData,
      select: { id: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de comisiones actualizada'
    });

  } catch (error) {
    console.error('Error updating commissions config:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
