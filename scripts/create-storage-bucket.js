/**
 * Script para crear y configurar el bucket de Supabase Storage
 * Ejecutar: node scripts/create-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorageBucket() {
  console.log('🚀 Iniciando configuración de Supabase Storage...\n');

  try {
    // 1. Verificar si el bucket ya existe
    console.log('📦 Verificando buckets existentes...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listando buckets:', listError.message);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === 'mentor-assets');

    if (bucketExists) {
      console.log('✅ El bucket "mentor-assets" ya existe\n');
    } else {
      // 2. Crear el bucket
      console.log('📦 Creando bucket "mentor-assets"...');
      const { data, error } = await supabase.storage.createBucket('mentor-assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
      });

      if (error) {
        console.error('❌ Error creando bucket:', error.message);
        return;
      }

      console.log('✅ Bucket "mentor-assets" creado exitosamente\n');
    }

    // 3. Información sobre políticas
    console.log('📋 CONFIGURACIÓN DE POLÍTICAS (RLS)\n');
    console.log('⚠️  Las políticas deben configurarse manualmente en el Dashboard de Supabase');
    console.log('   URL: ' + supabaseUrl + '/project/_/storage/buckets/mentor-assets\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('1️⃣  POLÍTICA: Public read access');
    console.log('   • Operation: SELECT');
    console.log('   • Target roles: public');
    console.log('   • Policy definition:');
    console.log('     bucket_id = \'mentor-assets\'');
    console.log('');
    
    console.log('2️⃣  POLÍTICA: Authenticated users can upload');
    console.log('   • Operation: INSERT');
    console.log('   • Target roles: authenticated');
    console.log('   • Policy definition:');
    console.log('     bucket_id = \'mentor-assets\'');
    console.log('');
    
    console.log('3️⃣  POLÍTICA: Users can update their own files');
    console.log('   • Operation: UPDATE');
    console.log('   • Target roles: authenticated');
    console.log('   • Policy definition:');
    console.log('     bucket_id = \'mentor-assets\' AND');
    console.log('     (storage.foldername(name))[1] = auth.uid()::text');
    console.log('');
    
    console.log('4️⃣  POLÍTICA: Users can delete their own files');
    console.log('   • Operation: DELETE');
    console.log('   • Target roles: authenticated');
    console.log('   • Policy definition:');
    console.log('     bucket_id = \'mentor-assets\' AND');
    console.log('     (storage.foldername(name))[1] = auth.uid()::text');
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 PASOS PARA CREAR LAS POLÍTICAS:\n');
    console.log('   1. Ve a: ' + supabaseUrl + '/project/_/storage/buckets');
    console.log('   2. Click en el bucket "mentor-assets"');
    console.log('   3. Ve a la pestaña "Policies"');
    console.log('   4. Click en "New Policy"');
    console.log('   5. Selecciona "For full customization"');
    console.log('   6. Copia y pega cada definición de arriba\n');
    
    console.log('✅ Configuración completada\n');
    console.log('💡 Tip: Después de crear las políticas, prueba subiendo una imagen desde:');
    console.log('   http://localhost:3000/dashboard/mentor/perfil\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

createStorageBucket();
