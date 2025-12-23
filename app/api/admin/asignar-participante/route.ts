import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitToMentor } from '@/lib/socket';

// POST: Asignar un participante a un mentor (Solo Admin/Coordinador)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const admin = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo Admin, Coordinador o GameChanger pueden asignar
    if (!['ADMIN', 'COORDINADOR', 'GAMECHANGER'].includes(admin.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { participanteId, mentorId } = body;

    if (!participanteId || !mentorId) {
      return NextResponse.json(
        { error: 'Faltan datos: participanteId y mentorId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el participante existe y es PARTICIPANTE
    const participante = await prisma.usuario.findUnique({
      where: { id: parseInt(participanteId) }
    });

    if (!participante) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    if (participante.rol !== 'PARTICIPANTE') {
      return NextResponse.json(
        { error: 'El usuario no es un participante' },
        { status: 400 }
      );
    }

    // Verificar que el mentor existe y es MENTOR
    const mentor = await prisma.usuario.findUnique({
      where: { id: parseInt(mentorId) }
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor no encontrado' }, { status: 404 });
    }

    if (!['MENTOR', 'COORDINADOR', 'GAMECHANGER'].includes(mentor.rol)) {
      return NextResponse.json(
        { error: 'El usuario no es un mentor' },
        { status: 400 }
      );
    }

    // Asignar participante al mentor
    const participanteActualizado = await prisma.usuario.update({
      where: { id: participante.id },
      data: {
        assignedMentorId: mentor.id,
        mentorId: mentor.id // Por compatibilidad
      }
    });

    console.log(`✅ ${admin.nombre} asignó a ${participante.nombre} → Mentor: ${mentor.nombre}`);

    // 🔔 NOTIFICACIÓN SOCKET.IO EN TIEMPO REAL
    try {
      emitToMentor(mentor.id.toString(), 'participant_assigned', {
        participanteId: participante.id,
        nombre: participante.nombre,
        email: participante.email,
        imagen: participante.imagen,
        asignadoPor: admin.nombre,
        fecha: new Date().toISOString()
      });
      console.log(`📡 Notificación Socket.IO enviada al mentor ${mentor.id}`);
    } catch (socketError) {
      console.error('Error al enviar notificación Socket.IO:', socketError);
      // No fallar la operación si falla el socket
    }

    return NextResponse.json({
      success: true,
      message: `${participante.nombre} fue asignado a ${mentor.nombre}`,
      participante: {
        id: participanteActualizado.id,
        nombre: participanteActualizado.nombre,
        email: participanteActualizado.email
      },
      mentor: {
        id: mentor.id,
        nombre: mentor.nombre,
        email: mentor.email
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al asignar participante:', error);
    return NextResponse.json(
      { error: 'Error al asignar participante' },
      { status: 500 }
    );
  }
}
