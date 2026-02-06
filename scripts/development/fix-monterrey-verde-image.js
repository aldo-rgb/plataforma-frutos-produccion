/**
 * Script para corregir la imagen de la campaña "Monterrey Verde"
 * La URL de DALL-E expiró, así que necesitamos subir una nueva imagen a Supabase
 * 
 * Uso:
 * 1. Coloca una imagen llamada "monterrey-verde-new.jpg" en el directorio raíz del proyecto
 * 2. Ejecuta: node fix-monterrey-verde-image.js
 * 
 * O simplemente ejecuta el script y generará una imagen de reemplazo
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImage() {
  try {
    console.log('🔍 Buscando la campaña "Monterrey Verde"...');
    
    const campaign = await prisma.legacyCampaign.findFirst({
      where: {
        title: { contains: 'Monterrey Verde' }
      }
    });
    
    if (!campaign) {
      console.error('❌ No se encontró la campaña');
      return;
    }
    
    console.log(`✅ Campaña encontrada: ID ${campaign.id}, "${campaign.title}"`);
    console.log(`📸 Imagen actual: ${campaign.coverImage?.substring(0, 100)}...`);
    
    // Buscar si hay una imagen local para subir
    const localImagePath = path.join(process.cwd(), 'monterrey-verde-new.jpg');
    const localImagePath2 = path.join(process.cwd(), 'monterrey-verde-new.png');
    
    let imageBuffer;
    let contentType;
    let extension;
    
    if (fs.existsSync(localImagePath)) {
      console.log('📂 Encontrada imagen local: monterrey-verde-new.jpg');
      imageBuffer = fs.readFileSync(localImagePath);
      contentType = 'image/jpeg';
      extension = 'jpg';
    } else if (fs.existsSync(localImagePath2)) {
      console.log('📂 Encontrada imagen local: monterrey-verde-new.png');
      imageBuffer = fs.readFileSync(localImagePath2);
      contentType = 'image/png';
      extension = 'png';
    } else {
      console.log('⚠️  No se encontró imagen local.');
      console.log('   Coloca una imagen llamada "monterrey-verde-new.jpg" o "monterrey-verde-new.png" en el directorio raíz.');
      console.log('   O puedes actualizar manualmente en la base de datos con una nueva URL.');
      
      // Opción: poner un placeholder o dejar vacío
      console.log('\n🔄 Poniendo imagen en blanco temporalmente...');
      
      await prisma.legacyCampaign.update({
        where: { id: campaign.id },
        data: { coverImage: null }
      });
      
      console.log('✅ coverImage actualizado a null');
      return;
    }
    
    // Subir a Supabase
    const timestamp = Date.now();
    const fileName = `campaign-monterrey-verde-${timestamp}.${extension}`;
    const filePath = `legacy-campaigns/${fileName}`;
    
    console.log(`📤 Subiendo imagen a Supabase: ${filePath}...`);
    
    const { data, error } = await supabase.storage
      .from('mentor-assets')
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error('❌ Error subiendo a Supabase:', error);
      return;
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('mentor-assets')
      .getPublicUrl(filePath);
    
    console.log(`✅ Imagen subida: ${publicUrl}`);
    
    // Actualizar en la base de datos
    await prisma.legacyCampaign.update({
      where: { id: campaign.id },
      data: { coverImage: publicUrl }
    });
    
    console.log('✅ Base de datos actualizada correctamente');
    console.log(`\n🎉 ¡Listo! La campaña "${campaign.title}" ahora tiene la imagen:`);
    console.log(`   ${publicUrl}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImage();
