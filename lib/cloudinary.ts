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
  QUANTUM_ALBUM: {
    folder: 'quantum-album',
    resource_type: 'image' as const,
  },
  LEGACY_CAPTURE: {
    folder: 'legacy-capture',
    resource_type: 'image' as const,
  },
  THUMBNAIL: {
    folder: 'thumbnails',
    resource_type: 'image' as const,
  },
  AUDIO: {
    folder: 'audio',
    resource_type: 'video' as const,
  },
  PROFILE: {
    folder: 'profiles',
    resource_type: 'image' as const,
  },
  IDENTITY_LAB: {
    folder: 'identity-lab',
    resource_type: 'image' as const,
  },
};

/**
 * Sube una imagen a Cloudinary usando upload firmado (más confiable)
 */
export async function uploadImage(
  file: Buffer | string,
  preset: keyof typeof UPLOAD_PRESETS = 'QUANTUM_ALBUM',
  customFolder?: string,
  mimeType?: string
): Promise<CloudinaryUploadResult> {
  const config = UPLOAD_PRESETS[preset];
  
  const type = mimeType || 'image/jpeg';
  const uploadData = Buffer.isBuffer(file) 
    ? `data:${type};base64,${file.toString('base64')}`
    : file;
  
  const folder = customFolder ? `${config.folder}/${customFolder}` : config.folder;
  
  try {
    const result = await cloudinary.uploader.upload(
      uploadData,
      {
        folder: folder,
        resource_type: config.resource_type,
      }
    );
    
    return result as CloudinaryUploadResult;
  } catch (error: any) {
    console.error('Cloudinary upload error:', {
      message: error?.message,
      error: error?.error,
      http_code: error?.http_code
    });
    throw error;
  }
}

/**
 * Sube un archivo de audio a Cloudinary
 */
export async function uploadAudio(
  file: Buffer | string,
  customFolder?: string,
  mimeType: string = 'audio/mpeg'
): Promise<CloudinaryUploadResult> {
  const config = UPLOAD_PRESETS.AUDIO;
  
  const uploadData = Buffer.isBuffer(file)
    ? `data:${mimeType};base64,${file.toString('base64')}`
    : file;
  
  try {
    const result = await cloudinary.uploader.upload(
      uploadData,
      {
        folder: customFolder ? `${config.folder}/${customFolder}` : config.folder,
        resource_type: config.resource_type,
      }
    );
    
    return result as CloudinaryUploadResult;
  } catch (error: any) {
    console.error('Cloudinary audio upload error:', {
      message: error?.message,
      error: error?.error,
      http_code: error?.http_code
    });
    throw error;
  }
}

/**
 * Genera URL de thumbnail desde una URL existente
 */
export function getThumbnailUrl(url: string, width = 300, height = 300): string {
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,g_auto,q_auto:low/`);
}

/**
 * Elimina un archivo de Cloudinary
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
