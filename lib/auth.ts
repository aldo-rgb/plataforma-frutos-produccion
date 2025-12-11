import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
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

        // 1. Buscar usuario en la BD
        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        })

        // 2. Verificar si existe y tiene password (podría ser usuario de Google en el futuro)
        if (!user || !user.password) {
          throw new Error("Usuario no encontrado")
        }

        // 3. Comparar contraseña hasheada
        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Contraseña incorrecta")
        }

        // 4. Retornar objeto usuario (excluyendo password)
        return {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        }
      }
    })
  ],
  callbacks: {
    // 1. Cuando se crea el JWT, le incrustamos el ID y el ROL
    async jwt({ token, user }) {
      if (user) {
        token.id = typeof user.id === "string" ? Number(user.id) : user.id
        token.rol = user.rol
      }
      return token
    },
    // 2. Cuando el frontend pide la sesión, pasamos los datos del JWT a la sesión
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as number
        session.user.rol = token.rol as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}
