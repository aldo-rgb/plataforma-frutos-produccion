import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        organizationId: true,
        gameChangerId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener perfil completo
    let perfilCompleto = await prisma.perfilCompleto.findUnique({
      where: { usuarioId: usuario.id }
    });

    // Si no existe, crear uno vacío
    if (!perfilCompleto) {
      perfilCompleto = await prisma.perfilCompleto.create({
        data: { usuarioId: usuario.id }
      });
    }

    // Obtener GameChanger si existe
    let gameChangerNombre = '';
    if (usuario.gameChangerId) {
      const gameChanger = await prisma.usuario.findUnique({
        where: { id: usuario.gameChangerId },
        select: { nombre: true }
      });
      gameChangerNombre = gameChanger?.nombre || '';
    }

    // Obtener número de visión actual
    let numeroVision = '';
    if (usuario.organizationId) {
      const visionActiva = await prisma.visionParticipante.findFirst({
        where: {
          participanteId: usuario.id,
          Vision: {
            estado: 'ACTIVA'
          }
        },
        include: {
          Vision: {
            select: { nombre: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (visionActiva) {
        numeroVision = visionActiva.Vision.nombre;
      }
    }

    return NextResponse.json({
      success: true,
      configuracion: {
        ...perfilCompleto,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        gameChangerNombre,
        numeroVision
      }
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/configuracion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cargar configuración' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Actualizar nombre del usuario si cambió
    if (body.nombre && body.nombre !== usuario.nombre) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { nombre: body.nombre }
      });
    }

    // Actualizar teléfono del usuario si cambió
    if (body.telefono !== undefined) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { telefono: body.telefono || null }
      });
    }

    // Preparar datos del perfil completo
    const perfilData = {
      apellido: body.apellido || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      whatsapp: body.whatsapp || null,
      misionTribu: body.misionTribu || null,
      logoTribu: body.logoTribu || null,
      fraseFavorita: body.fraseFavorita || null,
      angelEnrolamiento: body.angelEnrolamiento || null,
      calle: body.calle || null,
      numero: body.numero || null,
      colonia: body.colonia || null,
      codigoPostal: body.codigoPostal || null,
      estadoMunicipio: body.estadoMunicipio || null,
      ocupacion: body.ocupacion || null,
      tallaCamiseta: body.tallaCamiseta || null,
      peso: body.peso || null,
      imc: body.imc || null,
      estatura: body.estatura || null,
      fotoTicketPeso: body.fotoTicketPeso || null,
      fuma: body.fuma || false,
      fumaCantidad: body.fumaCantidad || null,
      quiereSerStaff: body.quiereSerStaff || false,
      fotoPrimerDia: body.fotoPrimerDia || null,
      fotoUltimoDiaPL: body.fotoUltimoDiaPL || null,
      fotoContrato: body.fotoContrato || null,
      contratoAvanzado: body.contratoAvanzado || null,
      coachBasico: body.coachBasico || null,
      staffBasico: body.staffBasico || null,
      coachAvanzado: body.coachAvanzado || null,
      staffAvanzado: body.staffAvanzado || null,
      coachPrimerFin: body.coachPrimerFin || null,
      coachSegundoFin: body.coachSegundoFin || null,
      coachTercerFin: body.coachTercerFin || null,
      condecoraciones: body.condecoraciones || []
    };

    // Upsert del perfil completo
    const perfilCompleto = await prisma.perfilCompleto.upsert({
      where: { usuarioId: usuario.id },
      update: perfilData,
      create: {
        usuarioId: usuario.id,
        ...perfilData
      }
    });

    return NextResponse.json({
      success: true,
      perfil: perfilCompleto
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/configuracion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
