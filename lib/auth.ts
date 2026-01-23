import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Usamos JWT para sesiones rápidas y sin base de datos constante
  },
  pages: {
    signIn: "/login", // Tu página personalizada de login
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Credenciales incompletas")
        }

        // 1. Buscar usuario en la BD con su perfil de mentor
        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: {
            PerfilMentor: {
              select: {
                id: true,
              },
            },
          },
        })

        // 2. Verificar si existe y tiene password (podría ser usuario de Google en el futuro)
        if (!user || !user.password) {
          throw new Error("Usuario no encontrado")
        }

        // 3. Verificar si está activo (excepto mentores que necesitan completar perfil)
        const isMentor = user.rol === 'MENTOR';
        if (!user.isActive && !isMentor) {
          throw new Error("Usuario desactivado. Contacta al coordinador.")
        }

        // 4. Comparar contraseña hasheada
        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Contraseña incorrecta")
        }

        // 5. Verificar si el usuario está usando la contraseña por defecto "Quantum123."
        // Si es así, marcar para que deba cambiarla
        const DEFAULT_PASSWORD = 'Quantum123.';
        const isUsingDefaultPassword = credentials.password === DEFAULT_PASSWORD;
        
        let requirePasswordChange = user.requirePasswordChange || false;
        
        if (isUsingDefaultPassword && !requirePasswordChange) {
          // Actualizar el flag en la base de datos
          await prisma.usuario.update({
            where: { id: user.id },
            data: { requirePasswordChange: true }
          });
          requirePasswordChange = true;
        }

        // 6. Retornar objeto usuario (excluyendo password, incluyendo flags de onboarding)
        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          requirePasswordChange: requirePasswordChange,
          wizardCompleted: user.wizardCompleted || false,
          onboardingOrigin: user.onboardingOrigin || 'ORGANIC_SIGNUP',
          organizationId: user.organizacionId || undefined,
        }
      }
    })
  ],
  callbacks: {
    // 1. Cuando se crea el JWT, le incrustamos el ID, el ROL y flags de onboarding
    async jwt({ token, user }) {
      if (user) {
        token.id = typeof user.id === "string" ? Number(user.id) : user.id
        token.rol = user.rol
        token.requirePasswordChange = user.requirePasswordChange || false
        token.wizardCompleted = user.wizardCompleted || false
        token.onboardingOrigin = user.onboardingOrigin || 'ORGANIC_SIGNUP'
        token.organizationId = user.organizationId
      }
      return token
    },
    // 2. Cuando el frontend pide la sesión, pasamos los datos del JWT a la sesión
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number
        session.user.rol = token.rol as string
        session.user.requirePasswordChange = token.requirePasswordChange as boolean
        session.user.wizardCompleted = token.wizardCompleted as boolean
        session.user.onboardingOrigin = token.onboardingOrigin as string
        session.user.organizationId = token.organizationId as number | undefined
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}
