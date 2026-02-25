import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    rol: string
    id: number // En tu schema el ID es Int
    requirePasswordChange?: boolean
    wizardCompleted?: boolean
    onboardingOrigin?: string
    organizationId?: number
    referralCode?: string
    profileCompleted?: boolean
    // Roles múltiples
    esMentor?: boolean
    esEntrenador?: boolean
    esCoordinador?: boolean
    esLider?: boolean
    esCoordinadorBasico?: boolean
    esCoordinadorAvanzado?: boolean
  }

  interface Session {
    user: User & {
      rol: string
      id: number
      requirePasswordChange?: boolean
      wizardCompleted?: boolean
      onboardingOrigin?: string
      organizationId?: number
      referralCode?: string
      profileCompleted?: boolean
      // Roles múltiples
      esMentor?: boolean
      esEntrenador?: boolean
      esCoordinador?: boolean
      esLider?: boolean
      esCoordinadorBasico?: boolean
      esCoordinadorAvanzado?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: string
    id: number
    requirePasswordChange?: boolean
    wizardCompleted?: boolean
    onboardingOrigin?: string
    organizationId?: number
    referralCode?: string
    profileCompleted?: boolean
    // Roles múltiples
    esMentor?: boolean
    esEntrenador?: boolean
    esCoordinador?: boolean
    esLider?: boolean
    esCoordinadorBasico?: boolean
    esCoordinadorAvanzado?: boolean
  }
}
