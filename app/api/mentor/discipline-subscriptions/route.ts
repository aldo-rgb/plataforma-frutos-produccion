import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener suscripciones activas de los alumnos del mentor
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get("mentorId");

    if (!mentorId) {
      return NextResponse.json({ error: "mentorId requerido" }, { status: 400 });
    }

    // Obtener todas las suscripciones activas de este mentor
    const subscriptions = await prisma.disciplineSubscription.findMany({
      where: {
        mentorId: parseInt(mentorId),
        status: 'ACTIVE'
      },
      include: {
        Student: {
          select: {
            id: true,
            nombre: true,
            email: true,
            disciplineSubAsStudent: {
              select: {
                missedCallsCount: true
              }
            }
          }
        },
        mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { day1: 'asc' },
        { time1: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length
    });

  } catch (error) {
    console.error("Error obteniendo suscripciones del mentor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
