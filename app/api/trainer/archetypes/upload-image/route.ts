import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadImage } from '@/lib/cloudinary'
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no válido. Usa JPG, PNG, WebP o GIF' 
      }, { status: 400 })
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'El archivo es muy grande. Máximo 5MB' 
      }, { status: 400 })
    }

    // Convertir a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Subir a Cloudinary
    const result = await uploadImage(
      buffer,
      'PROFILE', // Usamos el preset de profiles
      'arquetipos', // Carpeta personalizada
      file.type
    )

    return NextResponse.json({ 
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    })

  } catch (error: any) {
    logger.error('Error uploading archetype image:', error)
    return NextResponse.json({ 
      error: 'Error al subir la imagen',
      details: error?.message 
    }, { status: 500 })
  }
}
