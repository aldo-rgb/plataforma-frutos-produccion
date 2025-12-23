/**
 * Script para crear el bucket de almacenamiento en Supabase
 * Ejecutar: node scripts/setup-storage-bucket.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupStorageBucket() {
  try {
    console.log('🗄️  Configurando bucket de almacenamiento...');

    // Verificar si el bucket ya existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listando buckets:', listError);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === 'mentor-assets');

    if (bucketExists) {
      console.log('✅ El bucket "mentor-assets" ya existe');
    } else {
      // Crear el bucket
      const { data, error } = await supabase.storage.createBucket('mentor-assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB en bytes
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

      if (error) {
        console.error('❌ Error creando bucket:', error);
        return;
      }

      console.log('✅ Bucket "mentor-assets" creado exitosamente');
    }

    // Configurar políticas de acceso (RLS)
    console.log('📋 Configurando políticas de acceso...');
    console.log('⚠️  IMPORTANTE: Ve a tu panel de Supabase y configura estas políticas:');
    console.log('');
    console.log('1. Política de SELECT (lectura pública):');
    console.log('   Nombre: "Public read access"');
    console.log('   Operation: SELECT');
    console.log('   Policy definition: true');
    console.log('');
    console.log('2. Política de INSERT (autenticados pueden subir):');
    console.log('   Nombre: "Authenticated users can upload"');
    console.log('   Operation: INSERT');
    console.log('   Policy definition: auth.role() = \'authenticated\'');
    console.log('');
    console.log('3. Política de UPDATE (usuarios pueden actualizar sus archivos):');
    console.log('   Nombre: "Users can update their own files"');
    console.log('   Operation: UPDATE');
    console.log('   Policy definition: auth.uid()::text = (storage.foldername(name))[1]');
    console.log('');
    console.log('4. Política de DELETE (usuarios pueden borrar sus archivos):');
    console.log('   Nombre: "Users can delete their own files"');
    console.log('   Operation: DELETE');
    console.log('   Policy definition: auth.uid()::text = (storage.foldername(name))[1]');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupStorageBucket();
