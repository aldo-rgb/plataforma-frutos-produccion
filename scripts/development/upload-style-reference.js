/**
 * Script para subir la imagen de referencia de estilo (Style Reference)
 * Personaje de pelo blanco con armadura futurista
 * 
 * Ejecutar: node upload-style-reference.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fteqhmntkmmppxufjrwt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZXFobW50a21tcHB4dWZqcnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQxNDU0MywiZXhwIjoyMDgwOTkwNTQzfQ.VD0IyJ8ATfBk5dSGEqO4OmudGF8_wSvzsPTXC59LNJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadStyleReference() {
  console.log('🎨 Subiendo imagen de referencia de estilo...\n');

  // Buscar la imagen en el directorio actual
  const possibleNames = [
    'style-reference.png',
    'style-reference.jpg',
    'style-reference.jpeg',
    'white-hair-avatar.png',
    'white-hair-avatar.jpg',
    'avatar-reference.png',
    'avatar-reference.jpg',
    'sref-image.png',
    'sref-image.jpg'
  ];

  let imagePath = null;
  let imageBuffer = null;

  // Primero intentar leer desde stdin si se pasa por pipe
  // o buscar archivos con nombres comunes
  
  for (const name of possibleNames) {
    const fullPath = path.join(__dirname, name);
    if (fs.existsSync(fullPath)) {
      imagePath = fullPath;
      console.log(`✅ Imagen encontrada: ${name}`);
      break;
    }
  }

  if (!imagePath) {
    console.log('⚠️  No se encontró ninguna imagen con nombres comunes.');
    console.log('📋 Nombres buscados:', possibleNames.join(', '));
    console.log('\n💡 Instrucciones:');
    console.log('   1. Guarda la imagen en el directorio del proyecto con uno de estos nombres:');
    console.log('      - style-reference.png');
    console.log('      - white-hair-avatar.png');
    console.log('   2. Ejecuta nuevamente: node upload-style-reference.js');
    console.log('\n   O proporciona la ruta como argumento:');
    console.log('   node upload-style-reference.js /ruta/a/tu/imagen.png');
    
    // Verificar si se pasó un argumento
    if (process.argv[2]) {
      imagePath = process.argv[2];
      if (!fs.existsSync(imagePath)) {
        console.error(`\n❌ Error: El archivo no existe: ${imagePath}`);
        process.exit(1);
      }
      console.log(`\n✅ Usando imagen del argumento: ${imagePath}`);
    } else {
      process.exit(1);
    }
  }

  try {
    // Leer la imagen
    imageBuffer = fs.readFileSync(imagePath);
    const fileExtension = path.extname(imagePath).slice(1) || 'png';
    
    // Determinar el content type
    const contentTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp'
    };
    const contentType = contentTypes[fileExtension.toLowerCase()] || 'image/png';

    // Nombre del archivo en Supabase
    const timestamp = Date.now();
    const fileName = `style-references/quantum-avatar-sref-${timestamp}.${fileExtension}`;

    console.log(`\n📤 Subiendo a Supabase Storage...`);
    console.log(`   Bucket: mentor-assets`);
    console.log(`   Path: ${fileName}`);
    console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    // Subir a Supabase
    const { data, error } = await supabase.storage
      .from('mentor-assets')
      .upload(fileName, imageBuffer, {
        contentType: contentType,
        cacheControl: '31536000', // 1 año de cache
        upsert: true
      });

    if (error) {
      console.error('\n❌ Error subiendo a Supabase:', error.message);
      process.exit(1);
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(fileName);

    console.log('\n✅ ¡Imagen subida exitosamente!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 URL PÚBLICA (usa esto para --sref en Midjourney):');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n${publicUrl}\n`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    console.log('\n📝 EJEMPLO DE USO EN MIDJOURNEY:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`/imagine futuristic avatar, white hair, green glowing eyes, cybernetic armor --sref ${publicUrl} --sw 200 --v 6.1`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return publicUrl;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

uploadStyleReference();
