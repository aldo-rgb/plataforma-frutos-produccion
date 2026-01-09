import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rutas que NO requieren pago completo
const PUBLIC_PATHS = [
  '/auth',
  '/api/auth',
  '/checkout',
  '/api/checkout',
  '/api/gift-codes',
  '/api/public',
  '/pay-balance',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
];

// Rutas del dashboard que SÍ requieren pago
const PAYWALL_PATHS = [
  '/dashboard/participante',
  '/dashboard/game-changer',
  '/dashboard/training',
  '/dashboard/my-vision',
  '/dashboard/missions',
  '/dashboard/achievements',
];

// Rutas de admin que están exentas de paywall
const ADMIN_EXEMPT_PATHS = [
  '/dashboard/admin',
  '/dashboard/school-admin',
  '/dashboard/mentor',
  '/dashboard/coordinator',
  '/dashboard/director',
];

export async function paywallMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip para rutas públicas
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip para rutas de admin
  if (ADMIN_EXEMPT_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar si la ruta requiere paywall
  const requiresPayment = PAYWALL_PATHS.some(path => pathname.startsWith(path));
  
  if (!requiresPayment) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({ req: request });
    
    if (!token) {
      // No está autenticado, redirigir a login
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Verificar si el usuario tiene status UNPAID
    // Nota: El paymentStatus debería estar en el token de sesión
    const paymentStatus = (token as any).paymentStatus;
    
    if (paymentStatus === 'UNPAID') {
      // Usuario no ha pagado, redirigir a pay-balance
      const redirectUrl = new URL('/pay-balance', request.url);
      redirectUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Paywall middleware error:', error);
    return NextResponse.next();
  }
}
