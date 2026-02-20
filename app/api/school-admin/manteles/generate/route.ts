// API para generar PDF de manteles usando HTML + CSS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'mantel-assets';

// Helper para obtener organizationId desde sesión o BD
async function getOrganizationId(session: any): Promise<number | null> {
  if (session.user.organizationId) {
    return session.user.organizationId;
  }
  // Si no está en la sesión, buscar en la BD
  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { communityOrganizationId: true }
  });
  return user?.communityOrganizationId || null;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

interface MantelData {
  displayName: string;
  contract: string;
  backgroundIndex: number;
}

// Genera el HTML de un mantel individual
function generateMantelHTML(
  data: MantelData,
  orgLogo: string | null,
  visionLogo: string | null,
  backgrounds: (string | null)[]
): string {
  const background = backgrounds[data.backgroundIndex % 4] || '#1a1a2e';
  const bgStyle = background.startsWith('http') 
    ? `background-image: url('${background}'); background-size: cover; background-position: center;`
    : `background-color: ${background};`;

  return `
    <div class="mantel-page" style="${bgStyle}">
      <!-- Logos en las esquinas superiores -->
      <div class="logos-row">
        <div class="logo-container left">
          ${orgLogo ? `<img src="${orgLogo}" alt="Logo Org" class="logo" />` : ''}
        </div>
        <div class="logo-container right">
          ${visionLogo ? `<img src="${visionLogo}" alt="Logo Vision" class="logo" />` : ''}
        </div>
      </div>
      
      <!-- Contenido central -->
      <div class="content-center">
        <h1 class="nombre">${data.displayName}</h1>
        <p class="contrato">"${data.contract}"</p>
      </div>
    </div>
  `;
}

// Genera el documento HTML completo
function generateFullHTML(
  manteles: MantelData[],
  orgLogo: string | null,
  visionLogo: string | null,
  backgrounds: (string | null)[]
): string {
  const pages = manteles.map((m, i) => 
    generateMantelHTML({ ...m, backgroundIndex: i }, orgLogo, visionLogo, backgrounds)
  ).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: 17in 11in;
      margin: 0;
    }
    
    .mantel-page {
      width: 17in;
      height: 11in;
      position: relative;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .mantel-page:last-child {
      page-break-after: avoid;
    }
    
    .logos-row {
      position: absolute;
      top: 0.5in;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 0 0.75in;
    }
    
    .logo-container {
      width: 2in;
      height: 2in;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo-container.left {
      justify-content: flex-start;
    }
    
    .logo-container.right {
      justify-content: flex-end;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .content-center {
      text-align: center;
      padding: 0 1.5in;
    }
    
    .nombre {
      font-family: 'Playfair Display', serif;
      font-size: 144pt;
      font-weight: 700;
      color: white;
      text-shadow: 4px 4px 8px rgba(0,0,0,0.5);
      margin-bottom: 0.3in;
      line-height: 1.1;
    }
    
    .contrato {
      font-family: 'Dancing Script', cursive;
      font-size: 48pt;
      font-weight: 600;
      color: rgba(255,255,255,0.95);
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      font-style: italic;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>
  `;
}

// POST - Generar PDF de manteles
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { visionId, visionLogo, participants, singleTest } = await request.json();

    if (!visionId || !participants || participants.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const orgId = await getOrganizationId(session);
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage no configurado' }, { status: 500 });
    }

    // Obtener configuración de assets
    const configPath = `org-${orgId}/config.json`;
    let orgLogo: string | null = null;
    let backgrounds: (string | null)[] = [null, null, null, null];

    const { data: configData } = await supabase.storage
      .from(BUCKET_NAME)
      .download(configPath);

    if (configData) {
      const config = JSON.parse(await configData.text());
      orgLogo = config.orgLogo;
      backgrounds = config.backgrounds;
    }

    // Si es prueba de un solo mantel
    const manteles: MantelData[] = singleTest 
      ? [participants[0]]
      : participants;

    // Generar HTML
    const html = generateFullHTML(manteles, orgLogo, visionLogo, backgrounds);

    // Devolver HTML para que el frontend use html2pdf o similar
    // O podemos usar una API externa como html-pdf-service
    return NextResponse.json({
      success: true,
      html,
      totalPages: manteles.length,
      message: singleTest 
        ? 'Vista previa generada' 
        : `PDF listo con ${manteles.length} manteles`
    });
  } catch (error) {
    console.error('Error generating manteles:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
