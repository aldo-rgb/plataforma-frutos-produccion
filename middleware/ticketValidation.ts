import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware para validar tickets del usuario
 * Verifica que el usuario tenga un ticket válido para la visión actual
 */
export async function ticketValidationMiddleware(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Aquí puedes agregar lógica adicional de validación de tickets
    // Por ejemplo, verificar si el usuario tiene un ticket activo para contenido premium

    return NextResponse.next();
  } catch (error) {
    console.error('Error in ticket validation middleware:', error);
    return NextResponse.json(
      { error: 'Error de validación' },
      { status: 500 }
    );
  }
}

/**
 * Verifica si un usuario tiene acceso a un nivel específico
 */
export function hasTicketAccess(userTickets: any[], requiredLevel: string): boolean {
  return userTickets.some(ticket => 
    ticket.status === 'ACTIVE' && 
    ticket.level === requiredLevel &&
    new Date(ticket.validUntil) > new Date()
  );
}

/**
 * Obtiene el nivel más alto de acceso del usuario
 */
export function getHighestTicketLevel(userTickets: any[]): string | null {
  const levelOrder = ['BASIC', 'ADVANCED', 'PL'];
  const activeTickets = userTickets.filter(t => 
    t.status === 'ACTIVE' && 
    new Date(t.validUntil) > new Date()
  );

  for (let i = levelOrder.length - 1; i >= 0; i--) {
    if (activeTickets.some(t => t.level === levelOrder[i])) {
      return levelOrder[i];
    }
  }

  return null;
}
