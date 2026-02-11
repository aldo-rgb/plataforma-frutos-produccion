import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET: Servir imágenes de evidencias locales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Path requerido' }, { status: 400 });
    }

    // Validar que sea una ruta de evidencias (seguridad)
    if (!filePath.startsWith('/evidencias/')) {
      return NextResponse.json({ error: 'Ruta no válida' }, { status: 403 });
    }

    // Construir la ruta completa en el servidor
    // En producción las evidencias están en /var/www/plataforma-frutos/public/evidencias
    // En desarrollo están en ./public/evidencias
    const publicDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/plataforma-frutos/public'
      : path.join(process.cwd(), 'public');
    
    const fullPath = path.join(publicDir, filePath);

    // Verificar que el archivo existe
    try {
      await fs.access(fullPath);
    } catch {
      // Si no existe localmente, intentar desde el directorio del proyecto
      const altPath = path.join(process.cwd(), 'public', filePath);
      try {
        await fs.access(altPath);
        const fileBuffer = await fs.readFile(altPath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = getContentType(ext);
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      } catch {
        return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
      }
    }

    // Leer y servir el archivo
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Error sirviendo imagen:', error);
    return NextResponse.json({ error: 'Error al servir imagen' }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return types[ext] || 'application/octet-stream';
}
