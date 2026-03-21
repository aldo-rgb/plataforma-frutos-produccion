const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFile() {
  const filePath = './Personaje.png';
  const fileBuffer = fs.readFileSync(filePath);
  
  // Primero listar buckets disponibles
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log('Error listando buckets:', bucketsError.message);
    return;
  }
  
  console.log('Buckets disponibles:', buckets?.map(b => b.name));
  
  // Intentar subir a mentor-assets
  const { data, error } = await supabase.storage
    .from('mentor-assets')
    .upload('images/Personaje.png', fileBuffer, {
      contentType: 'image/png',
      upsert: true
    });
    
  if (error) {
    console.log('Error subiendo:', error.message);
    return;
  }
  
  console.log('Subido correctamente');
  
  const { data: urlData } = supabase.storage.from('mentor-assets').getPublicUrl('images/Personaje.png');
  console.log('URL:', urlData.publicUrl);
}

uploadFile();
