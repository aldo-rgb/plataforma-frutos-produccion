/**
 * 💰 SMART PRICING & SCHOOL LIFECYCLE
 * Sistema de precios individuales y licencias escolares
 */

export type SubscriptionPlan = 
  | 'NONE'
  | 'MONTHLY_STANDARD'
  | 'ANNUAL_STANDARD'
  | 'ANNUAL_PREMIUM'  // Premium SOLO anual
  | 'SCHOOL_LICENSE';

export type PaymentStatus = 
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type RenewalStatus = 
  | 'NOT_OFFERED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED';

// 💵 PRECIOS PÚBLICOS (MXN)
export const PRICING = {
  // PLANES MENSUALES (Precio "ancla" - parece caro)
  MONTHLY_STANDARD: {
    price: 99.00,
    annual_equivalent: 1188.00,
    plan: 'MONTHLY_STANDARD' as SubscriptionPlan,
    tier: 'STANDARD' as const,
    features: [
      'Sistema de Accountability',
      'Validación de IA',
      'Puntos Cuánticos',
      'Tablero de Progreso',
      'Comunidad de Apoyo'
    ]
  },
  // PREMIUM solo disponible en plan anual

  // PLANES ANUALES (¡OFERTA IMPERDIBLE!)
  ANNUAL_STANDARD: {
    price: 800.00,
    monthly_equivalent: 66.67,
    savings: 388.00,
    discount_percent: 32,
    plan: 'ANNUAL_STANDARD' as SubscriptionPlan,
    tier: 'STANDARD' as const,
    copywriting: 'Ahorras $388 al año - ¡4 meses gratis!',
    features: [
      'Sistema de Accountability',
      'Validación de IA',
      'Puntos Cuánticos',
      'Tablero de Progreso',
      'Comunidad de Apoyo'
    ]
  },
  ANNUAL_PREMIUM: {
    price: 2500.00,
    monthly_equivalent: 208.33,
    plan: 'ANNUAL_PREMIUM' as SubscriptionPlan,
    tier: 'PREMIUM' as const,
    only_annual: true,  // Premium SOLO se ofrece anual
    copywriting: 'Incluye 2 mentorías 1-a-1 en el año',
    features: [
      'Todo de Standard',
      '2 Mentorías 1-a-1 al año',
      'Llamadas de Disciplina',
      'Coaching Personalizado',
      'Acceso Prioritario',
      'Soporte Premium'
    ]
  },

  // PRECIOS BASE PARA ESCUELAS (Configurables por Admin)
  SCHOOL_DEFAULTS: {
    STANDARD: 600.00,  // Precio sugerido por licencia Standard
    PREMIUM: 1250.00,  // Precio sugerido por licencia Premium
  }
} as const;

// 🎓 OFERTA DE RENOVACIÓN POST-VISIÓN (50% OFF)
export const POST_VISION_RENEWAL = {
  STANDARD: {
    original_price: 800.00,
    renewal_price: 400.00,
    discount_percent: 50,
    copywriting: '¡No pierdas tu ritmo! Continúa por solo $400 tu primer año',
    duration_days: 365
  },
  PREMIUM: {
    original_price: 2500.00,
    renewal_price: 1250.00,
    discount_percent: 50,
    copywriting: 'Gradúate de tu visión y sigue con tu mentor por $1,250',
    duration_days: 365
  }
} as const;

// 📊 INTERFACE PARA TABLA COMPARATIVA
export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  discountPercent: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'standard',
    name: 'Standard',
    monthlyPrice: 99,
    annualPrice: 800,
    annualSavings: 388,
    discountPercent: 32,
    badge: 'Más Popular',
    highlighted: true,
    features: [
      'Sistema de Accountability',
      'Validación de IA',
      'Puntos Cuánticos',
      'Tablero de Progreso',
      'Comunidad de Apoyo',
      'Evidencias Ilimitadas'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 299,
    annualPrice: 2500,
    annualSavings: 1088,
    discountPercent: 30,
    badge: 'Salto Cuántico',
    features: [
      'Todo de Standard',
      'Mentoría 1:1 Semanal',
      'Llamadas de Disciplina',
      'Coaching Personalizado',
      'Acceso Prioritario',
      'Quantum Arena VIP'
    ]
  }
];

// 🏫 INTERFACE PARA CONFIGURACIÓN DE ESCUELAS
export interface SchoolLicenseConfig {
  organizationId: number;
  organizationName: string;
  standardPrice: number;
  premiumPrice: number;
  cycleDurationMonths: number;
  renewalOfferEnabled: boolean;
  renewalDiscount: number;
}

// 📝 INTERFACE PARA CREAR SUSCRIPCIÓN
export interface CreateSubscriptionInput {
  userId: number;
  plan: SubscriptionPlan;
  isPostVisionDiscount?: boolean;
  originalOrganizationId?: number;
}

// 💳 INTERFACE PARA PROCESAR PAGO
export interface ProcessPaymentInput {
  userId: number;
  amount: number;
  subscriptionId?: number;
  organizationId?: number;
  paymentMethod: string;
  isRenewal?: boolean;
  isSchoolPayment?: boolean;
}

// 🔄 INTERFACE PARA OFERTA DE RENOVACIÓN
export interface RenewalOfferData {
  userId: number;
  subscriptionId: number;
  originalPrice: number;
  offeredPrice: number;
  expiresInDays: number;
  message?: string;
}

// 📈 UTILS PARA CÁLCULOS
export const calculateDiscount = (originalPrice: number, finalPrice: number): number => {
  return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
};

export const calculateAnnualSavings = (monthlyPrice: number, annualPrice: number): number => {
  return (monthlyPrice * 12) - annualPrice;
};

export const getPostVisionPrice = (tier: 'STANDARD' | 'PREMIUM'): number => {
  return tier === 'STANDARD' 
    ? POST_VISION_RENEWAL.STANDARD.renewal_price
    : POST_VISION_RENEWAL.PREMIUM.renewal_price;
};

export const getPlanPrice = (plan: SubscriptionPlan): number => {
  switch (plan) {
    case 'MONTHLY_STANDARD':
      return PRICING.MONTHLY_STANDARD.price;
    case 'ANNUAL_STANDARD':
      return PRICING.ANNUAL_STANDARD.price;
    case 'MONTHLY_PREMIUM':
      return PRICING.MONTHLY_PREMIUM.price;
    case 'ANNUAL_PREMIUM':
      return PRICING.ANNUAL_PREMIUM.price;
    default:
      return 0;
  }
};
