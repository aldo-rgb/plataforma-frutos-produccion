// config/menuPermissions.ts

// =====================================================
// CONFIGURACIÓN MAESTRA DEL MENÚ Y PERMISOS
// =====================================================
// Este archivo define "La Verdad" del sistema de permisos
// Hardcoded para evitar cambios en BD después del fix crítico

// 1. Definimos todos los items de tu menú con un ID único
export const MENU_ITEMS = [
  { id: 'ranking', label: 'Ranking Global', icon: 'Trophy', section: 'General' },
  { id: 'tienda', label: 'Tienda / Canje', icon: 'Box', section: 'General' },
  { id: 'membresia', label: 'Membresía', icon: 'CreditCard', section: 'General' },
  { id: 'catalogo', label: 'Solicitar Mentoría', icon: 'Search', section: 'General' },
  
  // Panel Maestro
  { id: 'auth_cartas', label: 'Autorizar Cartas', icon: 'Shield', section: 'Panel Maestro' },
  { id: 'auth_evidencias', label: 'Autorizar Evidencias', icon: 'CheckCircle', section: 'Panel Maestro' },
  { id: 'alta_usuarios', label: 'Alta Usuarios', icon: 'UserPlus', section: 'Panel Maestro' },
  { id: 'finanzas', label: 'Finanzas', icon: 'DollarSign', section: 'Panel Maestro' },
  { id: 'inv_recompensas', label: 'Inv. Recompensas', icon: 'Package', section: 'Panel Maestro' },
  { id: 'gestion_precios', label: 'Gestión de Precios', icon: 'Target', section: 'Panel Maestro' },
  { id: 'gestion_usuarios', label: 'Gestión Usuarios', icon: 'Users', section: 'Panel Maestro' },
  { id: 'codigos', label: 'Códigos de Regalo', icon: 'Gift', section: 'Panel Maestro' },
  { id: 'gestion_talentos', label: 'Gestión de Mentores', icon: 'Briefcase', section: 'Panel Maestro' },
];

// 2. Definimos los roles disponibles (usando los valores exactos del enum Prisma)
export const ROLES = ['ADMINISTRADOR', 'MENTOR', 'COORDINADOR', 'GAMECHANGER', 'PARTICIPANTE'] as const;

// 3. Tipo para TypeScript
export type RolType = typeof ROLES[number];
export type MenuItemId = typeof MENU_ITEMS[number]['id'];
