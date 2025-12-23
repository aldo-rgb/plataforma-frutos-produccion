import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener acciones programadas para hoy con evidencias
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener día actual (L, M, X, J, V, S, D)
    const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const hoy = diasSemana[new Date().getDay()];
    
    // Obtener fecha de hoy (solo fecha, sin hora)
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    // Buscar carta aprobada del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: usuario.id,
        estado: 'APROBADA' // Solo si la carta está aprobada
      },
      include: {
        Meta: {
          include: {
            Accion: {
              where: {
                diasProgramados: {
                  contains: hoy // Acciones programadas para hoy
                }
              }
            }
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ 
        acciones: [],
        message: 'No tienes una carta aprobada o no hay acciones para hoy'
      }, { status: 200 });
    }

    // Obtener evidencias del día
    const evidenciasHoy = await prisma.evidenciaAccion.findMany({
      where: {
        usuarioId: usuario.id,
        fechaSubida: {
          gte: fechaHoy
        }
      }
    });

    // Construir lista de acciones con sus evidencias
    const accionesConEvidencias: any[] = [];

    carta.Meta.forEach((meta: any) => {
      meta.Accion.forEach((accion: any) => {
        const evidencia = evidenciasHoy.find((e: any) => e.accionId === accion.id);
        
        accionesConEvidencias.push({
          id: accion.id,
          metaId: meta.id,
          metaTitulo: meta.metaPrincipal,
          categoria: meta.categoria,
          texto: accion.texto,
          diasProgramados: accion.diasProgramados ? JSON.parse(accion.diasProgramados) : [],
          requiereEvidencia: accion.requiereEvidencia,
          evidenciaHoy: evidencia ? {
            id: evidencia.id,
            fotoUrl: evidencia.fotoUrl,
            estado: evidencia.estado,
            descripcion: evidencia.descripcion,
            comentarioMentor: evidencia.comentarioMentor,
            fechaSubida: evidencia.fechaSubida
          } : null
        });
      });
    });

    return NextResponse.json({ 
      acciones: accionesConEvidencias 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al obtener acciones del día:', error);
    return NextResponse.json({ error: 'Error al cargar acciones' }, { status: 500 });
  }
}
