const fs = require('fs');
const path = './components/dashboard/CartaWizardRelacional.tsx';

let content = fs.readFileSync(path, 'utf8');

// Buscar y reemplazar el onClick del botón Restaurar
const oldCode = `onClick={() => {
                    setErrorModal({
                      show: true,
                      title: '🔄 Restaurar desde Servidor',
                      message: '¿Deseas restaurar tu carta desde el servidor?\\n\\n✅ Esto cargará los datos guardados en la base de datos.\\n\\n⚠️ El borrador local será reemplazado por los datos del servidor.\\n\\nÚsalo si perdiste tu progreso o si el borrador local tiene errores.'
                    });
                  }}`;

const newCode = `onClick={async () => {
                    // Verificar qué datos hay en el servidor antes de restaurar
                    try {
                      const res = await fetch('/api/carta/preview');
                      const data = await res.json();
                      
                      if (!data.hasData) {
                        setErrorModal({
                          show: true,
                          title: '⚠️ Sin datos en servidor',
                          message: 'No hay datos guardados en el servidor para restaurar.\\n\\nTu carta actual está vacía en la base de datos. El borrador local es tu único progreso.\\n\\n💡 Tip: Continúa editando y el sistema guardará automáticamente.'
                        });
                        return;
                      }
                      
                      const previewText = data.preview
                        .map(p => \`• \${p.name}: \${p.serPreview || '(sin declaración)'}\`)
                        .join('\\n');
                      
                      setErrorModal({
                        show: true,
                        title: '🔄 Restaurar desde Servidor',
                        message: \`Se encontraron \${data.areasConDatos} áreas con datos guardados:\\n\\n\${previewText}\\n\\n⚠️ El borrador local será reemplazado.\\n¿Deseas continuar?\`
                      });
                    } catch (error) {
                      setErrorModal({
                        show: true,
                        title: '🔄 Restaurar desde Servidor',
                        message: '¿Deseas restaurar tu carta desde el servidor?\\n\\n✅ Esto cargará los datos guardados en la base de datos.\\n\\n⚠️ El borrador local será reemplazado por los datos del servidor.'
                      });
                    }
                  }}`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('✅ Archivo actualizado correctamente');
} else {
  console.log('❌ No se encontró el código a reemplazar');
  console.log('Buscando variantes...');
  
  // Intentar una búsqueda más flexible
  const searchPattern = /onClick=\{[^}]*setErrorModal[^}]*Restaurar desde Servidor[^}]*\}\}/;
  if (searchPattern.test(content)) {
    console.log('Se encontró una variante del código');
  } else {
    console.log('No se encontró ninguna variante');
  }
}
