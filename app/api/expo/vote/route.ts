import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

// Generar fingerprint simple del dispositivo
function generateFingerprint(req: NextRequest): string {
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const acceptLanguage = req.headers.get('accept-language') || '';
  
  const data = `${userAgent}-${ip}-${acceptLanguage}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

function getIpAddress(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// POST - Crear una evaluación/voto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      exhibitorId, 
      ratingStars,
      rating, // alias 
      hiringIntent, 
      feedbackText,
      feedback, // alias
      visitorToken // Token del visitante registrado
    } = body;

    // Usar aliases si existen
    const finalRating = ratingStars || rating;
    const finalFeedback = feedbackText || feedback;

    // Validaciones básicas
    if (!exhibitorId || !finalRating || !hiringIntent) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 });
    }

    if (finalRating < 1 || finalRating > 5) {
      return NextResponse.json({ 
        error: 'La calificación debe ser entre 1 y 5 estrellas' 
      }, { status: 400 });
    }

    if (!['YES', 'MAYBE', 'NO'].includes(hiringIntent)) {
      return NextResponse.json({ 
        error: 'Intención de contratación inválida' 
      }, { status: 400 });
    }

    // Verificar que el expositor existe
    const exhibitor = await prisma.usuario.findUnique({
      where: { id: parseInt(exhibitorId) },
      select: { 
        id: true, 
        nombre: true,
        imagen: true,
        BusinessProfile: {
          select: { headline: true }
        }
      }
    });

    if (!exhibitor) {
      return NextResponse.json({ 
        error: 'Expositor no encontrado' 
      }, { status: 404 });
    }

    // Generar fingerprint y obtener IP
    const deviceFingerprint = generateFingerprint(req);
    const ipAddress = getIpAddress(req);

    // Variables para el registro
    let visitorId: number | null = null;
    let expoVisitorId: string | null = null;
    let resolvedVisitorName: string = 'Anónimo';
    let resolvedVisitorEmail: string = 'anonimo@expo.com';
    let resolvedVisitorPhone: string = 'N/A';

    // Si tiene token de visitante registrado
    if (visitorToken) {
      const expoVisitor = await prisma.expoVisitor.findUnique({
        where: { token: visitorToken }
      });

      if (!expoVisitor) {
        return NextResponse.json({ 
          error: 'Token de visitante inválido' 
        }, { status: 401 });
      }

      expoVisitorId = expoVisitor.id;
      resolvedVisitorName = expoVisitor.name;
      resolvedVisitorEmail = expoVisitor.email;
      resolvedVisitorPhone = expoVisitor.phone;

      // Verificar si ya votó este visitante para este expositor
      const existingVote = await prisma.expoReview.findFirst({
        where: {
          exhibitorId: exhibitor.id,
          expoVisitorId: expoVisitor.id
        }
      });

      if (existingVote) {
        return NextResponse.json({ 
          error: 'Ya has evaluado a este expositor',
          alreadyVoted: true
        }, { status: 409 });
      }
    } else {
      // Verificar si el visitante está logueado
      const session = await getServerSession(authOptions);
      visitorId = session?.user?.id ? parseInt(String(session.user.id)) : null;

      // Evitar auto-calificación
      if (visitorId && visitorId === exhibitor.id) {
        return NextResponse.json({ 
          error: 'No puedes calificarte a ti mismo' 
        }, { status: 403 });
      }

      // Verificar si ya votó (por usuario o por fingerprint)
      const existingVote = await prisma.expoReview.findFirst({
        where: {
          exhibitorId: exhibitor.id,
          OR: [
            ...(visitorId ? [{ visitorId }] : []),
            { deviceFingerprint }
          ]
        }
      });

      if (existingVote) {
        return NextResponse.json({ 
          error: 'Ya has evaluado a este expositor',
          alreadyVoted: true
        }, { status: 409 });
      }
    }

    // Crear la evaluación
    const review = await prisma.expoReview.create({
      data: {
        exhibitorId: exhibitor.id,
        visitorId,
        expoVisitorId,
        ratingStars: finalRating,
        hiringIntent,
        feedbackText: finalFeedback?.trim() || null,
        visitorName: resolvedVisitorName,
        visitorPhone: resolvedVisitorPhone,
        visitorEmail: resolvedVisitorEmail,
        deviceFingerprint,
        ipAddress
      }
    });

    return NextResponse.json({ 
      success: true,
      message: '¡Gracias por tu evaluación!',
      reviewId: review.id,
      showConfetti: finalRating === 5
    });

  } catch (error) {
    console.error('Error creating expo review:', error);
    return NextResponse.json({ 
      error: 'Error al guardar la evaluación' 
    }, { status: 500 });
  }
}

// GET - Verificar si ya votó
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exhibitorId = searchParams.get('exhibitorId');
    const visitorToken = searchParams.get('visitorToken');

    if (!exhibitorId) {
      return NextResponse.json({ 
        error: 'Se requiere exhibitorId' 
      }, { status: 400 });
    }

    const deviceFingerprint = generateFingerprint(req);

    // Si tiene token de visitante
    if (visitorToken) {
      const expoVisitor = await prisma.expoVisitor.findUnique({
        where: { token: visitorToken }
      });

      if (expoVisitor) {
        const existingVote = await prisma.expoReview.findFirst({
          where: {
            exhibitorId: parseInt(exhibitorId),
            expoVisitorId: expoVisitor.id
          }
        });

        return NextResponse.json({ 
          hasVoted: !!existingVote,
          vote: existingVote ? {
            ratingStars: existingVote.ratingStars,
            hiringIntent: existingVote.hiringIntent
          } : null
        });
      }
    }

    // Si está logueado
    const session = await getServerSession(authOptions);
    const visitorId = session?.user?.id ? parseInt(String(session.user.id)) : null;

    const existingVote = await prisma.expoReview.findFirst({
      where: {
        exhibitorId: parseInt(exhibitorId),
        OR: [
          ...(visitorId ? [{ visitorId }] : []),
          { deviceFingerprint }
        ]
      }
    });

    return NextResponse.json({ 
      hasVoted: !!existingVote,
      vote: existingVote ? {
        ratingStars: existingVote.ratingStars,
        hiringIntent: existingVote.hiringIntent
      } : null
    });

  } catch (error) {
    console.error('Error checking expo vote:', error);
    return NextResponse.json({ 
      error: 'Error al verificar voto' 
    }, { status: 500 });
  }
}
