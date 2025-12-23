const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MENU_ITEMS = [
  // General
  { id: 'ranking', section: 'General' },
  { id: 'tienda', section: 'General' },
  { id: 'membresia', section: 'General' },
  { id: 'mentor_ia', section: 'General' },
  { id: 'carta_frutos', section: 'General' },
  { id: 'the_vault', section: 'General' },
  { id: 'hoy', section: 'General' },
  { id: 'guia_inicio', section: 'General' },
  
  // Panel de Mentor
  { id: 'mentor_revisar_cartas', section: 'Panel Mentor' },
  { id: 'mentor_validar_evidencias', section: 'Panel Mentor' },
  { id: 'mentor_misiones', section: 'Panel Mentor' },
  { id: 'mentor_participantes', section: 'Panel Mentor' },
  { id: 'mentor_horarios_llamadas', section: 'Panel Mentor' },
  { id: 'mentor_horarios_mentorias', section: 'Panel Mentor' },
  { id: 'mentor_sesiones', section: 'Panel Mentor' },
  { id: 'mentor_perfil', section: 'Panel Mentor' },
  { id: 'mentor_service_validation', section: 'Panel Mentor' },
  
  // Panel Maestro
  { id: 'auth_cartas', section: 'Panel Maestro' },
  { id: 'auth_evidencias', section: 'Panel Maestro' },
  { id: 'buzon_anonimo', section: 'Panel Maestro' },
  { id: 'alta_usuarios', section: 'Panel Maestro' },
  { id: 'finanzas', section: 'Panel Maestro' },
  { id: 'inv_recompensas', section: 'Panel Maestro' },
  { id: 'gestion_precios', section: 'Panel Maestro' },
  { id: 'gestion_usuarios', section: 'Panel Maestro' },
  { id: 'codigos', section: 'Panel Maestro' },
  { id: 'gestion_mentores', section: 'Panel Maestro' },
  { id: 'misiones_eventos', section: 'Panel Maestro' },
  { id: 'gestion_ciclos', section: 'Panel Maestro' },
  { id: 'gestion_permisos', section: 'Panel Maestro' },
  { id: 'quantum_locations', section: 'Panel Maestro' },
];

const ROLES = ['ADMINISTRADOR', 'COORDINADOR', 'MENTOR', 'GAMECHANGER', 'PARTICIPANTE'];

// Permisos predeterminados por rol
const DEFAULT_PERMISSIONS = {
  ADMINISTRADOR: 'ALL', // Todos los permisos
  COORDINADOR: [
    // General
    'ranking', 'tienda', 'membresia', 'mentor_ia', 'carta_frutos', 'the_vault', 'hoy', 'guia_inicio',
    // Panel Mentor (Admin puede hacer de mentor)
    'mentor_revisar_cartas', 'mentor_validar_evidencias', 'mentor_misiones', 'mentor_participantes',
    'mentor_horarios_llamadas', 'mentor_horarios_mentorias', 'mentor_sesiones', 'mentor_perfil',
    // Panel Maestro (algunos permisos limitados)
    'auth_cartas', 'auth_evidencias', 'alta_usuarios', 'gestion_usuarios', 'misiones_eventos'
  ],
  MENTOR: [
    // General
    'ranking', 'tienda', 'membresia', 'mentor_ia', 'carta_frutos', 'the_vault', 'hoy', 'guia_inicio',
    // Panel Mentor
    'mentor_revisar_cartas', 'mentor_validar_evidencias', 'mentor_misiones', 'mentor_participantes',
    'mentor_horarios_llamadas', 'mentor_horarios_mentorias', 'mentor_sesiones', 'mentor_perfil',
    'mentor_service_validation'
  ],
  GAMECHANGER: [
    // General
    'ranking', 'tienda', 'membresia', 'mentor_ia', 'carta_frutos', 'the_vault', 'hoy', 'guia_inicio',
  ],
  PARTICIPANTE: [
    // General
    'ranking', 'tienda', 'membresia', 'mentor_ia', 'carta_frutos', 'the_vault', 'hoy', 'guia_inicio',
  ]
};

async function initPermissions() {
  try {
    console.log('🔧 Inicializando permisos predeterminados...\n');
    
    let created = 0;
    let updated = 0;
    
    for (const role of ROLES) {
      const allowedMenus = DEFAULT_PERMISSIONS[role] === 'ALL' 
        ? MENU_ITEMS.map(item => item.id)
        : DEFAULT_PERMISSIONS[role];
      
      console.log(`📋 Procesando rol: ${role}`);
      
      for (const item of MENU_ITEMS) {
        const isEnabled = allowedMenus.includes(item.id);
        
        const result = await prisma.permisoMenu.upsert({
          where: {
            role_menuKey: {
              role: role,
              menuKey: item.id
            }
          },
          update: {
            isEnabled: isEnabled
          },
          create: {
            role: role,
            menuKey: item.id,
            isEnabled: isEnabled,
            updatedAt: new Date()
          }
        });
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      }
      
      console.log(`   ✅ ${allowedMenus.length} permisos habilitados`);
    }
    
    console.log(`\n✅ Inicialización completa:`);
    console.log(`   📝 Registros creados: ${created}`);
    console.log(`   🔄 Registros actualizados: ${updated}`);
    console.log(`   📊 Total de permisos: ${ROLES.length * MENU_ITEMS.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initPermissions();
