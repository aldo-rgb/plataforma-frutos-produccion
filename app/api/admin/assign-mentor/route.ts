import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Validación de permisos
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'COORDINADOR', 'GAMECHANGER'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 1. Buscamos a todos los Mentores activos con contador de alumnos
    const mentorsData = await prisma.usuario.findMany({
      where: { rol: 'MENTOR', isActive: true },
      select: { 
        id: true, 
        nombre: true, 
        email: true,
        _count: {
          select: {
            other_Usuario_Usuario_assignedMentorIdToUsuario: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const mentors = mentorsData.map(m => ({
      id: m.id,
      nombre: m.nombre,
      email: m.email,
      _count: {
        assignedStudents: m._count.other_Usuario_Usuario_assignedMentorIdToUsuario
      }
    }));

    // 2. Buscamos a todos los Participantes activos con mentor asignado
    const studentsData = await prisma.usuario.findMany({
      where: { rol: 'PARTICIPANTE', isActive: true },
      select: { 
        id: true, 
        nombre: true, 
        email: true,
        assignedMentorId: true,
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: { nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const students = studentsData.map(s => ({
      id: s.id,
      nombre: s.nombre,
      email: s.email,
      assignedMentorId: s.assignedMentorId,
      assignedMentor: s.Usuario_Usuario_assignedMentorIdToUsuario
    }));

    console.log(`📊 Cargados: ${mentors.length} mentores, ${students.length} alumnos`);

    return NextResponse.json({ mentors, students });
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    return NextResponse.json({ error: 'Error cargando datos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Validación de permisos
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'COORDINADOR', 'GAMECHANGER'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { studentId, mentorId } = await request.json();

    // Validamos datos
    if (!studentId || !mentorId) {
      return NextResponse.json({ error: 'Faltan datos: studentId y mentorId son requeridos' }, { status: 400 });
    }

    // Verificar que el mentor existe y es activo
    const mentor = await prisma.usuario.findFirst({
      where: { id: Number(mentorId), rol: 'MENTOR', isActive: true }
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor no válido o inactivo' }, { status: 400 });
    }

    // Verificar que el estudiante existe y es participante
    const student = await prisma.usuario.findFirst({
      where: { id: Number(studentId), rol: 'PARTICIPANTE', isActive: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no válido o inactivo' }, { status: 400 });
    }

    // Actualizamos al alumno asignándole el mentor
    await prisma.usuario.update({
      where: { id: Number(studentId) },
      data: { assignedMentorId: Number(mentorId) }
    });

    console.log(`✅ Asignación exitosa: Estudiante ${studentId} → Mentor ${mentorId}`);

    return NextResponse.json({ 
      success: true,
      message: `${student.nombre} asignado a ${mentor.nombre}`
    });
  } catch (error: any) {
    console.error('❌ Error al asignar:', error);
    return NextResponse.json({ error: 'Error al asignar mentor' }, { status: 500 });
  }
}

// DELETE: Desvincular mentor (opcional)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'COORDINADOR', 'GAMECHANGER'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Falta studentId' }, { status: 400 });
    }

    await prisma.usuario.update({
      where: { id: Number(studentId) },
      data: { assignedMentorId: null }
    });

    console.log(`🔓 Desvinculado: Estudiante ${studentId}`);

    return NextResponse.json({ success: true, message: 'Mentor desvinculado' });
  } catch (error) {
    console.error('❌ Error al desvincular:', error);
    return NextResponse.json({ error: 'Error al desvincular' }, { status: 500 });
  }
}
