const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function executeSql() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });
  
  try {
    console.log('📦 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado');
    
    console.log('📦 Ejecutando SQL para crear tablas de comisiones...');
    
    const sql = fs.readFileSync('create-commissions-tables.sql', 'utf8');
    
    // Dividir por bloques DO $$ ... END $$; y otros statements
    const statements = sql.split(/;(?=\s*(?:CREATE|ALTER|DO|--|\s*$))/);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        console.log('\n🔄 Ejecutando:', trimmed.substring(0, 100) + '...');
        try {
          await client.query(trimmed);
          console.log('✅ Completado');
        } catch (err) {
          // Ignorar errores de objetos que ya existen
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log('ℹ️ Ya existe, continuando...');
          } else {
            console.error('⚠️ Error:', err.message);
          }
        }
      }
    }
    
    console.log('\n✅ Tablas de comisiones configuradas exitosamente');
    
    // Verificar que existen
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('VisionCommissionConfig', 'StaffCommissionsLog')
      ORDER BY table_name
    `);
    console.log('🔍 Verificación:', result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

executeSql();
