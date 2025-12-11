import { withAuth } from "next-auth/middleware"

// Exportamos la configuración por defecto de NextAuth.
// Esto automáticamente redirige al login si no hay token.
export default withAuth({
  pages: {
    signIn: "/login", // Especificamos nuestra página de login personalizada
  },
  callbacks: {
    // Aquí podemos añadir lógica extra, por ejemplo:
    // Permitir el acceso solo si el token existe (retorna true)
    authorized: ({ token }) => !!token,
  },
})

// Configuración de rutas a proteger
export const config = {
  // El matcher usa sintaxis de regex simplificada
  // :path* significa "cualquier sub-ruta"
  matcher: [
    "/dashboard/:path*", // Protege /dashboard, /dashboard/mentor-ia, etc.
    "/admin/:path*",     // Protege todo el panel de administración
    "/staff/:path*",     // Protege las herramientas de mentores
  ]
}
