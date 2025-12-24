// config/menuPermissions.ts

// =====================================================
// CONFIGURACIÓN MAESTRA DEL MENÚ Y PERMISOS
// =====================================================
// Este archivo define "La Verdad" del sistema de permisos
// Hardcoded para evitar cambios en BD después del fix crítico

// 1. Definimos todos los items de tu menú con un ID único
export const MENU_ITEMS = [
  // General
  { id: 'ranking', label: 'Ranking Global', icon: 'Trophy', section: 'General' },
  { id: 'tienda', label: 'Tienda / Canje', icon: 'Box', section: 'General' },
  { id: 'membresia', label: 'Membresía', icon: 'CreditCard', section: 'General' },
  { id: 'mentor_ia', label: 'Mentor IA', icon: 'Bot', section: 'General' },
  { id: 'carta_frutos', label: 'Carta F.R.U.T.O.S.', icon: 'Target', section: 'General' },
  { id: 'the_vault', label: 'The Vault', icon: 'Camera', section: 'General' },
  { id: 'hoy', label: 'HOY - Vista Diaria', icon: 'CalendarCheck', section: 'General' },
  { id: 'guia_inicio', label: 'Guía de Inicio', icon: 'Compass', section: 'General' },
  
  // Panel de Mentor
  { id: 'mentor_revisar_cartas', label: 'Revisar Cartas', icon: 'ClipboardCheck', section: 'Panel Mentor' },
  { id: 'mentor_validar_evidencias', label: 'Validar Evidencias', icon: 'CheckCircle2', section: 'Panel Mentor' },
  { id: 'mentor_misiones', label: 'Misiones y Eventos', icon: 'Zap', section: 'Panel Mentor' },
  { id: 'mentor_participantes', label: 'Mis Participantes', icon: 'Users', section: 'Panel Mentor' },
  { id: 'mentor_horarios_llamadas', label: 'Horarios Llamadas', icon: 'Calendar', section: 'Panel Mentor' },
  { id: 'mentor_horarios_mentorias', label: 'Horarios Mentorías', icon: 'Calendar', section: 'Panel Mentor' },
  { id: 'mentor_sesiones', label: 'Mis Sesiones', icon: 'Calendar', section: 'Panel Mentor' },
  { id: 'mentor_perfil', label: 'Editar Mi Perfil', icon: 'User', section: 'Panel Mentor' },
  { id: 'mentor_service_validation', label: 'Validar Servicio', icon: 'CheckCircle2', section: 'Panel Mentor' },
  
  // Panel Maestro
  { id: 'auth_cartas', label: 'Autorizar Cartas', icon: 'Shield', section: 'Panel Maestro' },
  { id: 'auth_evidencias', label: 'Autorizar Evidencias', icon: 'CheckCircle', section: 'Panel Maestro' },
  { id: 'buzon_anonimo', label: 'Buzón Anónimo', icon: 'ShieldAlert', section: 'Panel Maestro' },
  { id: 'alta_usuarios', label: 'Alta Usuarios', icon: 'UserPlus', section: 'Panel Maestro' },
  { id: 'finanzas', label: 'Finanzas', icon: 'DollarSign', section: 'Panel Maestro' },
  { id: 'inv_recompensas', label: 'Inv. Recompensas', icon: 'Package', section: 'Panel Maestro' },
  { id: 'gestion_precios', label: 'Gestión de Precios', icon: 'Target', section: 'Panel Maestro' },
  { id: 'gestion_usuarios', label: 'Gestión Usuarios', icon: 'Users', section: 'Panel Maestro' },
  { id: 'codigos', label: 'Códigos de Regalo', icon: 'Gift', section: 'Panel Maestro' },
  { id: 'gestion_mentores', label: 'Gestión de Mentores', icon: 'Briefcase', section: 'Panel Maestro' },
  { id: 'misiones_eventos', label: 'Misiones y Eventos Admin', icon: 'Zap', section: 'Panel Maestro' },
  { id: 'gestion_ciclos', label: 'Gestión de Ciclos', icon: 'CalendarCheck', section: 'Panel Maestro' },
  { id: 'gestion_permisos', label: 'Gestión de Permisos', icon: 'Shield', section: 'Panel Maestro' },
  { id: 'quantum_locations', label: 'QUANTUM Locations', icon: 'MapPin', section: 'Panel Maestro' },
];

// 2. Definimos los roles disponibles (usando los valores exactos del enum Prisma)
export const ROLES = [
  'SUPER_ADMIN',      // Administrador global del sistema
  'ADMINISTRADOR',    // Administrador de plataforma
  'SCHOOL_ADMIN',     // Director/Coordinador de escuela
  'COORDINADOR',      // Coordinador de programas
  'MENTOR',           // Mentor/Coach
  'GAMECHANGER',      // GameChanger (estudiante líder)
  'PARTICIPANTE'      // Participante/Estudiante
] as const;

// 3. Tipo para TypeScript
export type RolType = typeof ROLES[number];
export type MenuItemId = typeof MENU_ITEMS[number]['id'];
