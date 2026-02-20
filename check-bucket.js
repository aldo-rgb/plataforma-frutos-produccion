const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Configurado' : 'NO CONFIGURADO');
console.log('Service Key:', supabaseKey ? 'Configurado' : 'NO CONFIGURADO');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Listar buckets existentes
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.log('Error listando buckets:', listError.message);
  } else {
    console.log('\nBuckets existentes:');
    buckets.forEach(b => console.log('  -', b.name, '(public:', b.public, ')'));
  }

  // Intentar crear el bucket si no existe
  const bucketName = 'capsule-messages';
  const exists = buckets && buckets.find(b => b.name === bucketName);
  
  if (!exists) {
    console.log('\nCreando bucket:', bucketName);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['audio/*'],
      fileSizeLimit: 10485760
    });
    
    if (error) {
      console.log('Error creando bucket:', error.message);
    } else {
      console.log('✅ Bucket creado');
    }
  } else {
    console.log('\n✅ Bucket ya existe:', bucketName);
  }
}

main().catch(console.error);
