import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Exportamos la configuración por defecto de NextAuth.
// Esto automáticamente redirige al login si no hay token.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Si el usuario necesita cambiar contraseña y no está en /change-password
    if (token?.requirePasswordChange && path !== '/change-password' && !path.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/change-password', req.url))
    }

    // Si ya cambió la contraseña y está en /change-password, redirigir al dashboard
    if (!token?.requirePasswordChange && path === '/change-password') {
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
    "/change-password",  // Protege la página de cambio de contraseña
  ]
}

