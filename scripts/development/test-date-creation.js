// Test directo para ver cómo se crean las fechas
const date1 = new Date(2025, 11, 29, 0, 0, 0, 0);  // Medianoche
const date2 = new Date(2025, 11, 29, 12, 0, 0, 0); // Mediodía

console.log('Con hora 00:00 (medianoche):');
console.log('  ISO:', date1.toISOString());
console.log('  México:', date1.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
console.log('');
console.log('Con hora 12:00 (mediodía):');
console.log('  ISO:', date2.toISOString());
console.log('  México:', date2.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
console.log('');

// Simular lo que hace calculateCycleDates
const today = new Date();
const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
console.log('StartDate que se crearía HOY:');
console.log('  ISO:', startDate.toISOString());
console.log('  México:', startDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
