import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Frutos2025!';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    const visionId = parseInt(params.id);
    const { emails } = await request.json();
    if (!emails || !visionId) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 });
    }
    // Parse emails (comma, newline, or space separated)
    const emailList = emails
      .split(/[\s,;\n]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (emailList.length === 0) {
      return NextResponse.json({ success: false, error: 'No se detectaron correos válidos' }, { status: 400 });
    }
    // Verificar visión y organización
    const vision = await prisma.vision.findUnique({ where: { id: visionId } });
    if (!vision) return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });
    const director = await prisma.usuario.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
    if (!director?.organizationId || vision.organizationId !== director.organizationId) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta visión' }, { status: 403 });
    }
    // Buscar usuarios existentes
    const existingUsers = await prisma.usuario.findMany({
      where: { email: { in: emailList }, organizationId: director.organizationId },
      select: { id: true, email: true }
    });
    const existingEmails = existingUsers.map(u => u.email);
    const newEmails = emailList.filter(e => !existingEmails.includes(e));
    // Crear usuarios nuevos
    const created: any[] = [];
    for (const email of newEmails) {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const user = await prisma.usuario.create({
        data: {
          email,
          nombre: email.split('@')[0],
          password: hashed,
          rol: 'PARTICIPANTE',
          isActive: true,
          organizationId: director.organizationId,
          requirePasswordChange: true,
        },
        select: { id: true, email: true }
      });
      created.push(user);
    }
    // Agregar todos (nuevos y existentes) a la visión
    const allUsers = await prisma.usuario.findMany({
      where: { email: { in: emailList }, organizationId: director.organizationId },
      select: { id: true, email: true }
    });
    const results = [];
    for (const user of allUsers) {
      // Verificar si ya está en la visión
      const already = await prisma.visionParticipante.findFirst({ where: { visionId, participanteId: user.id } });
      if (!already) {
        await prisma.visionParticipante.create({ data: { visionId, participanteId: user.id } });
        results.push(user.email);
      }
    }
    return NextResponse.json({ success: true, created, existing: existingUsers, added: results });
  } catch (error) {
    console.error('Error alta masiva participantes:', error);
    return NextResponse.json({ success: false, error: 'Error al agregar participantes' }, { status: 500 });
  }
}
