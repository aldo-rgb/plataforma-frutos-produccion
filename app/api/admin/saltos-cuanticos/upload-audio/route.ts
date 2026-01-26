import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadAudio } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRol = session.user.rol
    if (!['ADMIN', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string || 'general' // song, cunaSong

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no válido. Usa MP3, WAV, WebM, OGG o M4A' 
      }, { status: 400 })
    }

    // Validar tamaño (máximo 15MB para audio)
    const maxSize = 15 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'El archivo es muy grande. Máximo 15MB' 
      }, { status: 400 })
    }

    // Convertir a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Carpeta según tipo
    const folder = `saltos-cuanticos/${type}/audio`

    // Subir a Cloudinary (usando la función uploadAudio)
    const result = await uploadAudio(buffer, folder)

    return NextResponse.json({ 
      success: true,
      audioUrl: result.secure_url,
      publicId: result.public_id
    })

  } catch (error: any) {
    console.error('Error uploading salto cuantico audio:', error)
    return NextResponse.json({ 
      error: 'Error al subir el audio',
      details: error?.message 
    }, { status: 500 })
  }
}
