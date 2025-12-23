// instrucciones-socket.js - Guía de prueba de Socket.IO
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ SISTEMA DE NOTIFICACIONES EN TIEMPO REAL INSTALADO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🎯 QUÉ SE HA INSTALADO:\n');
console.log('  ✅ Servidor Socket.IO (http://localhost:3000)');
console.log('  ✅ Cliente React hooks (useSocket, useSocketEvent)');
console.log('  ✅ Componente SocketStatus (indicador de conexión)');
console.log('  ✅ Componente NotificacionesRealtime (panel + toasts)');
console.log('  ✅ Notificaciones en API routes (aprobar/rechazar evidencias)');
console.log('  ✅ Sistema de rooms por usuario\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 CÓMO PROBAR:\n');

console.log('1️⃣  VERIFICA QUE EL SERVIDOR ESTÉ CORRIENDO:');
console.log('   El servidor Socket.IO debe estar activo en otra terminal');
console.log('   Si no está corriendo, ejecuta: npm run dev:socket\n');

console.log('2️⃣  ABRE EL NAVEGADOR:');
console.log('   Ve a: http://localhost:3000\n');

console.log('3️⃣  INICIA SESIÓN COMO PARTICIPANTE:');
console.log('   Usa cualquier cuenta con rol PARTICIPANTE');
console.log('   En la esquina inferior derecha verás el indicador de conexión\n');

console.log('4️⃣  OBSERVA LOS COMPONENTES:');
console.log('   🟢 Indicador verde = Conectado a Socket.IO');
console.log('   🔔 Campana en la esquina = Panel de notificaciones\n');

console.log('5️⃣  GENERA UNA NOTIFICACIÓN:');
console.log('   En otra pestaña/ventana:');
console.log('   a) Inicia sesión como MENTOR');
console.log('   b) Ve a "Revisión de Evidencias"');
console.log('   c) Aprueba o rechaza alguna evidencia pendiente\n');

console.log('6️⃣  OBSERVA LA MAGIA:');
console.log('   Vuelve a la pestaña del participante');
console.log('   Deberías ver:\n');
console.log('   • Una notificación toast flotante (auto-desaparece en 5s)');
console.log('   • El contador en la campana se incrementa');
console.log('   • La notificación aparece en el historial\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🔧 EVENTOS DISPONIBLES:\n');
console.log('  • evidencia_aprobada   → Cuando el mentor aprueba');
console.log('  • evidencia_rechazada  → Cuando el mentor rechaza');
console.log('  • nueva_tarea         → Cuando se asigna una tarea (TODO)');
console.log('  • nueva_evidencia     → Cuando un estudiante sube evidencia (TODO)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('💡 AGREGAR MÁS NOTIFICACIONES:\n');
console.log('En cualquier API route, importa y usa:\n');
console.log('  import { emitToUser } from \'@/lib/socket\';\n');
console.log('  emitToUser(userId.toString(), \'nombre_evento\', {');
console.log('    mensaje: "Tu mensaje aquí",');
console.log('    // ... más datos');
console.log('  });\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📊 ESCALABILIDAD:\n');
console.log('  • Actual: Modo standalone (1 servidor, ~1k usuarios)');
console.log('  • Producción: Agregar Redis para multi-servidor');
console.log('  • Ver: SOCKET-IO-SETUP.md para instrucciones completas\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Sistema listo para usar. ¡Abre http://localhost:3000!\n');
