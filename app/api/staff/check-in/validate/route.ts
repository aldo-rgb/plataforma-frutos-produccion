import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Validar participante por QR o identifier (usado por la página)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { identifier, productId } = body;

    if (!productId) {
      return NextResponse.json({ 
        valid: false,
        errors: [{ type: 'general', message: 'Se requiere productId', blocking: true }],
        canProceed: false
      }, { status: 400 });
    }

    if (!identifier) {
      return NextResponse.json({ 
        valid: false,
        errors: [{ type: 'general', message: 'Se requiere identificador (QR, email o ID)', blocking: true }],
        canProceed: false
      }, { status: 400 });
    }

    let participantId: number | null = null;
    let user = null;

    // Intentar identificar al usuario
    // 0. Verificar si es un QR de Ticket (formato TICKET:uuid)
    if (identifier.startsWith('TICKET:')) {
      const ticketId = identifier.replace('TICKET:', '').trim();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { ownerId: true, status: true }
      });
      if (ticket && ticket.status === 'ACTIVE') {
        participantId = ticket.ownerId;
      }
    }

    // 1. Intentar como JSON (QR data)
    if (!participantId) {
      try {
        const qrContent = JSON.parse(identifier);
        participantId = qrContent.userId || qrContent.id || qrContent.u;
      } catch {
        // No es JSON
      }
    }

    // 2. Intentar como número directo (ID)
    if (!participantId && !isNaN(parseInt(identifier))) {
      participantId = parseInt(identifier);
    }

    // 3. Intentar como email
    if (!participantId && identifier.includes('@')) {
      user = await prisma.usuario.findUnique({
        where: { email: identifier }
      });
      if (user) participantId = user.id;
    }

    // 4. Buscar por nombre (normalizar espacios múltiples)
    if (!participantId) {
      const normalizedSearch = identifier.trim().replace(/\s+/g, ' ');
      // Separar en palabras para búsqueda más flexible
      const searchWords = normalizedSearch.split(' ').filter(w => w.length > 1);
      
      if (searchWords.length > 0) {
        // Buscar usuarios que contengan TODAS las palabras en su nombre
        const allUsers = await prisma.usuario.findMany({
          where: {
            OR: [
              { nombre: { contains: searchWords[0], mode: 'insensitive' } },
              { apodo: { contains: searchWords[0], mode: 'insensitive' } }
            ]
          },
          take: 20
        });
        
        // Filtrar usuarios que contengan todas las palabras de búsqueda
        user = allUsers.find(u => {
          const nombreNorm = (u.nombre || '').toLowerCase().replace(/\s+/g, ' ');
          const apodoNorm = (u.apodo || '').toLowerCase().replace(/\s+/g, ' ');
          return searchWords.every(word => 
            nombreNorm.includes(word.toLowerCase()) || 
            apodoNorm.includes(word.toLowerCase())
          );
        }) || null;
        
        if (user) participantId = user.id;
      }
    }

    if (!participantId) {
      return NextResponse.json({ 
        valid: false,
        errors: [{ type: 'general', message: 'No se encontró ningún participante con ese identificador', blocking: true }],
        canProceed: false
      });
    }

    // Buscar el usuario si aún no lo tenemos
    if (!user) {
      user = await prisma.usuario.findUnique({
        where: { id: participantId }
      });
    }

    if (!user) {
      return NextResponse.json({ 
        valid: false,
        errors: [{ type: 'general', message: 'Usuario no encontrado', blocking: true }],
        canProceed: false
      });
    }

    // Buscar el producto
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      include: {
        Organization: true,
        Vision: true
      }
    });

    if (!product) {
      return NextResponse.json({ 
        valid: false,
        errors: [{ type: 'general', message: 'Producto no encontrado', blocking: true }],
        canProceed: false
      });
    }

    const errors: { type: string; message: string; blocking: boolean }[] = [];

    // Buscar enrollment del usuario en este producto/visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: participantId,
        ...(product.visionId ? { visionId: product.visionId } : {})
      }
    });

    // También buscar si tiene un Ticket activo para esta visión
    const activeTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: participantId,
        ...(product.visionId ? { visionId: product.visionId } : {}),
        status: 'ACTIVE'
      }
    });

    // Verificar ticket/enrollment - válido si tiene enrollment ENROLLED o Ticket activo
    const hasValidTicket = (enrollment && enrollment.enrollmentStatus === 'ENROLLED') || !!activeTicket;
    if (!hasValidTicket) {
      errors.push({
        type: 'ticket',
        message: `${user.nombre} no tiene un ticket válido para este entrenamiento`,
        blocking: true
      });
    }

    // Buscar formulario médico
    const medicalForm = await prisma.medicalForm.findFirst({
      where: {
        userId: participantId,
        ...(product.visionId ? { visionId: product.visionId } : {})
      }
    });

    const hasMedicalForm = !!medicalForm;
    if (!hasMedicalForm) {
      errors.push({
        type: 'medical',
        message: 'No ha completado el formulario médico',
        blocking: true // BLOQUEANTE - No puede continuar sin formulario médico
      });
    }

    // Verificar foto de perfil
    const hasProfilePhoto = !!(user.imagen || user.profileImage);
    if (!hasProfilePhoto) {
      errors.push({
        type: 'photo',
        message: 'No tiene foto de perfil',
        blocking: false
      });
    }

    // Verificar si ya hizo check-in hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await prisma.checkInRecord.findFirst({
      where: {
        userId: participantId,
        productId: productId,
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingCheckIn) {
      errors.push({
        type: 'general',
        message: 'Este participante ya hizo check-in hoy',
        blocking: true
      });
    }

    // Determinar si puede proceder
    const hasBlockingError = errors.some(e => e.blocking);
    const canProceed = !hasBlockingError;

    return NextResponse.json({
      valid: canProceed && errors.length === 0,
      user: {
        id: user.id,
        nombre: user.nombre,
        apodo: user.apodo,
        email: user.email,
        profileImage: user.imagen || user.profileImage,
        hasPhoto: hasProfilePhoto
      },
      enrollment: enrollment ? {
        id: enrollment.id,
        level: enrollment.level,
        status: enrollment.enrollmentStatus
      } : null,
      medicalForm: medicalForm ? {
        id: medicalForm.id,
        isComplete: true,
        hasAlerts: false
      } : null,
      errors,
      canProceed
    });

  } catch (error) {
    console.error('Error validando participante:', error);
    return NextResponse.json({ 
      valid: false,
      errors: [{ type: 'general', message: 'Error del servidor', blocking: true }],
      canProceed: false
    }, { status: 500 });
  }
}

// GET - Validar participante por QR o userId
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qrData = searchParams.get('qr');
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Se requiere productId' }, { status: 400 });
    }

    if (!qrData && !userId) {
      return NextResponse.json({ error: 'Se requiere QR o userId' }, { status: 400 });
    }

    let participantId: number;

    // Decodificar QR si se proporciona
    if (qrData) {
      try {
        const qrContent = JSON.parse(qrData);
        participantId = qrContent.userId || qrContent.id;
      } catch {
        // Si no es JSON, intentar como número directo
        participantId = parseInt(qrData);
      }
    } else {
      participantId = parseInt(userId!);
    }

    if (isNaN(participantId)) {
      return NextResponse.json({ 
        valid: false,
        alertType: 'red',
        error: 'ID de usuario inválido' 
      }, { status: 400 });
    }

    // Buscar el producto con su organización
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) },
      include: {
        Organization: true,
        Vision: true
      }
    });

    if (!product) {
      return NextResponse.json({ 
        valid: false,
        alertType: 'red',
        error: 'Producto no encontrado' 
      }, { status: 404 });
    }

    // Buscar enrollments del usuario en este producto
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: participantId,
        ...(product.visionId ? { visionId: product.visionId } : {})
      },
      include: {
        Vision: true
      }
    });

    // Buscar el usuario
    const user = await prisma.usuario.findUnique({
      where: { id: participantId }
    });

    if (!user) {
      return NextResponse.json({ 
        valid: false,
        alertType: 'red',
        error: 'Usuario no encontrado',
        message: 'El QR escaneado no corresponde a ningún participante registrado'
      });
    }

    // Buscar formulario médico
    const medicalForm = await prisma.medicalForm.findFirst({
      where: {
        userId: participantId,
        ...(product.visionId ? { visionId: product.visionId } : {})
      }
    });

    // Verificar si tiene ticket válido (enrollment activo en este producto)
    const hasValidTicket = enrollments.length > 0 && 
      enrollments.some((e: { enrollmentStatus: string }) => e.enrollmentStatus === 'ENROLLED');

    if (!hasValidTicket) {
      return NextResponse.json({ 
        valid: false,
        alertType: 'red',
        error: 'Sin ticket válido',
        message: `${user.nombre} no tiene un ticket válido para este entrenamiento`,
        participant: {
          id: user.id,
          name: user.nombre,
          email: user.email
        }
      });
    }

    // Verificar formulario médico
    const hasMedicalForm = !!medicalForm;

    // Verificar foto de perfil
    const hasProfilePhoto = !!(user.imagen || user.profileImage);

    // Determinar tipo de alerta
    let alertType: 'none' | 'amber' | 'camera' = 'none';
    
    if (!hasMedicalForm) {
      alertType = 'amber';
    } else if (!hasProfilePhoto) {
      alertType = 'camera';
    }

    const enrollment = enrollments[0] as { id: number; level: string; visionId: number } | undefined;

    return NextResponse.json({
      valid: true,
      alertType,
      hasTicket: true,
      hasMedicalForm,
      hasProfilePhoto,
      participant: {
        id: user.id,
        name: user.nombre,
        email: user.email,
        nickname: user.apodo,
        photoUrl: user.imagen || user.profileImage,
        role: enrollment?.level || 'Participante',
        visionId: enrollment?.visionId,
        enrollmentId: enrollment?.id
      },
      product: {
        id: product.id,
        name: product.name,
        organization: product.Organization?.name
      }
    });

  } catch (error) {
    console.error('Error validando participante:', error);
    return NextResponse.json({ 
      valid: false,
      alertType: 'red',
      error: 'Error del servidor' 
    }, { status: 500 });
  }
}
