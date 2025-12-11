import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    rol: string
    id: number // En tu schema el ID es Int
  }

  interface Session {
    user: User & {
      rol: string
      id: number
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: string
    id: number
  }
}
