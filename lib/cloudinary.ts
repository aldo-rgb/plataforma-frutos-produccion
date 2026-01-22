import { v2 as cloudinary } from 'cloudinary';

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Tipos de respuesta
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

// Opciones de upload por tipo de contenido
export const UPLOAD_PRESETS = {
  // Fotos del Álbum Cuántico - Calidad alta, optimizadas
  QUANTUM_ALBUM: {
    folder: 'quantum-album',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    resource_type: 'image' as const,
  },
  
  // Fotos de Legacy Capture (GC captura datos críticos)
  LEGACY_CAPTURE: {
    folder: 'legacy-capture',
    transformation: [
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: 'auto:best' }, // Máxima calidad para contratos, etc.
      { fetch_format: 'auto' }
    ],
    resource_type: 'image' as const,
  },
  
  // Thumbnails para preview rápido
  THUMBNAIL: {
    folder: 'thumbnails',
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:low' },
      { fetch_format: 'auto' }
    ],
    resource_type: 'image' as const,
  },
  
  // Audio (canción de cuna, etc.)
  AUDIO: {
    folder: 'audio',
    resource_type: 'video' as const, // Cloudinary usa 'video' para audio también
  },
  
  // Perfil de usuario
  PROFILE: {
    folder: 'profiles',
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    resource_type: 'image' as const,
  },
};

/**
 * Sube una imagen a Cloudinary
 * @param file - Buffer o base64 de la imagen
 * @param preset - Preset de configuración
 * @param customFolder - Subcarpeta opcional
 * @returns URL de la imagen subida
 */
export async function uploadImage(
  file: Buffer | string,
  preset: keyof typeof UPLOAD_PRESETS = 'QUANTUM_ALBUM',
  customFolder?: string
): Promise<CloudinaryUploadResult> {
  const config = UPLOAD_PRESETS[preset];
  
  // Si es un Buffer, convertir a base64 data URI
  const uploadData = Buffer.isBuffer(file) 
    ? `data:image/jpeg;base64,${file.toString('base64')}`
    : file;
  
  const result = await cloudinary.uploader.upload(uploadData, {
    folder: customFolder ? `${config.folder}/${customFolder}` : config.folder,
    transformation: config.transformation,
    resource_type: config.resource_type,
  });
  
  return result as CloudinaryUploadResult;
}

/**
 * Sube un archivo de audio a Cloudinary
 * @param file - Buffer o base64 del audio
 * @param customFolder - Subcarpeta opcional
 * @returns URL del audio subido
 */
export async function uploadAudio(
  file: Buffer | string,
  customFolder?: string
): Promise<CloudinaryUploadResult> {
  const config = UPLOAD_PRESETS.AUDIO;
  
  const uploadData = Buffer.isBuffer(file)
    ? `data:audio/webm;base64,${file.toString('base64')}`
    : file;
  
  const result = await cloudinary.uploader.upload(uploadData, {
    folder: customFolder ? `${config.folder}/${customFolder}` : config.folder,
    resource_type: config.resource_type,
  });
  
  return result as CloudinaryUploadResult;
}

/**
 * Genera URL de thumbnail desde una URL existente
 * @param url - URL original de Cloudinary
 * @param width - Ancho del thumbnail
 * @param height - Alto del thumbnail
 */
export function getThumbnailUrl(url: string, width = 300, height = 300): string {
  // Transformar URL de Cloudinary para generar thumbnail on-the-fly
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,g_auto,q_auto:low/`);
}

/**
 * Elimina un archivo de Cloudinary
 * @param publicId - ID público del archivo
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
