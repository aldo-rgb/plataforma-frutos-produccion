// Test script para verificar el endpoint de upload
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fteqhmntkmmppxufjrwt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZXFobW50a21tcHB4dWZqcnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQxNDU0MywiZXhwIjoyMDgwOTkwNTQzfQ.VD0IyJ8ATfBk5dSGEqO4OmudGF8_wSvzsPTXC59LNJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión con Supabase Storage...');
  console.log('URL:', supabaseUrl);
  console.log('');

  try {
    // 1. Listar buckets
    console.log('📦 Listando buckets disponibles...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError);
      return;
    }
    
    console.log('✅ Buckets encontrados:', buckets?.map(b => b.name).join(', '));
    console.log('');

    // 2. Verificar si existe el bucket 'mentor-assets'
    const mentorAssetsBucket = buckets?.find(b => b.name === 'mentor-assets');
    
    if (!mentorAssetsBucket) {
      console.log('⚠️  El bucket "mentor-assets" NO existe');
      console.log('📝 Creando bucket "mentor-assets"...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('mentor-assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        console.error('❌ Error creando bucket:', createError);
        return;
      }
      
      console.log('✅ Bucket "mentor-assets" creado exitosamente');
    } else {
      console.log('✅ El bucket "mentor-assets" existe');
      console.log('   - Público:', mentorAssetsBucket.public);
    }
    console.log('');

    // 3. Probar subida de un archivo de prueba
    console.log('📤 Probando subida de archivo de prueba...');
    const testBuffer = Buffer.from('Test file content');
    const testPath = 'profile-images/test-upload.txt';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mentor-assets')
      .upload(testPath, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Error subiendo archivo:', uploadError);
      return;
    }
    
    console.log('✅ Archivo de prueba subido exitosamente');
    console.log('');

    // 4. Obtener URL pública
    console.log('🔗 Obteniendo URL pública...');
    const { data: { publicUrl } } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(testPath);
    
    console.log('✅ URL pública:', publicUrl);
    console.log('');

    // 5. Eliminar archivo de prueba
    console.log('🗑️  Eliminando archivo de prueba...');
    const { error: deleteError } = await supabase.storage
      .from('mentor-assets')
      .remove([testPath]);
    
    if (deleteError) {
      console.error('⚠️  Error eliminando archivo:', deleteError);
    } else {
      console.log('✅ Archivo de prueba eliminado');
    }
    console.log('');

    console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('');
    console.log('📋 Resumen:');
    console.log('   ✓ Conexión a Supabase: OK');
    console.log('   ✓ Bucket "mentor-assets": OK');
    console.log('   ✓ Subida de archivos: OK');
    console.log('   ✓ URLs públicas: OK');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSupabaseConnection();
