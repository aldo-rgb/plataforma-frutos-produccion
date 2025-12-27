import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Exportamos la configuración por defecto de NextAuth.
// Esto automáticamente redirige al login si no hay token.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // CASO 1: Usuario con contraseña temporal (mayor prioridad)
    if (token?.requirePasswordChange && 
        path !== '/change-password' && 
        path !== '/auth/change-password' && 
        !path.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/auth/change-password', req.url))
    }

    // CASO 2: PARTICIPANTE sin wizard completado accediendo al dashboard principal
    // DESHABILITADO: Ahora permitimos acceso libre a todas las funciones del sidebar
    // aunque el usuario no haya completado el wizard
    // const esParticipante = token?.rol === 'PARTICIPANTE'
    // const esPrimeraVez = token?.onboardingOrigin && !token?.wizardCompleted
    // const estaSaliendoDelWizard = path.startsWith('/dashboard') && 
    //                                !path.startsWith('/dashboard/carta/wizard-v2') &&
    //                                !path.startsWith('/dashboard/mentor-ia') &&
    //                                !path.startsWith('/dashboard/mentorship/sessions') &&
    //                                !path.startsWith('/dashboard/mentorship/request')
    // 
    // if (esParticipante && 
    //     esPrimeraVez && 
    //     !token?.requirePasswordChange && 
    //     estaSaliendoDelWizard && 
    //     !path.startsWith('/api/')) {
    //   return NextResponse.redirect(new URL('/dashboard/carta/wizard-v2', req.url))
    // }

    // CASO 3: Usuario ya completó todo y está intentando acceder a cambio de password
    if (!token?.requirePasswordChange && 
        (path === '/change-password' || path === '/auth/change-password')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login", // Especificamos nuestra página de login personalizada
    },
    callbacks: {
      // Aquí podemos añadir lógica extra, por ejemplo:
      // Permitir el acceso solo si el token existe (retorna true)
      authorized: ({ token }) => !!token,
    },
  }
)

// Configuración de rutas a proteger
export const config = {
  // El matcher usa sintaxis de regex simplificada
  // :path* significa "cualquier sub-ruta"
  matcher: [
    "/dashboard/:path*", // Protege /dashboard, /dashboard/mentor-ia, etc.
    "/admin/:path*",     // Protege todo el panel de administración
    "/staff/:path*",     // Protege las herramientas de mentores
    "/change-password",  // Protege la página de cambio de contraseña (legacy)
    "/auth/change-password", // Nueva ruta de cambio de contraseña
    "/wizard/:path*",    // Protege el wizard de onboarding (legacy)
    "/wizard-v2/:path*", // Protege el wizard V2 de onboarding
  ]
}

