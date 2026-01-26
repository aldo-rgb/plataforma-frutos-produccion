import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const action = searchParams.get('action');

    if (!websiteId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const id = parseInt(websiteId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid websiteId' }, { status: 400 });
    }

    // Update counters based on action
    if (action === 'whatsapp') {
      await prisma.quantumWebsite.update({
        where: { id },
        data: { whatsappClicks: { increment: 1 } }
      }).catch(() => {}); // Silently fail if record doesn't exist
    } else if (action === 'phone') {
      await prisma.quantumWebsite.update({
        where: { id },
        data: { phoneClicks: { increment: 1 } }
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ success: true }); // Don't fail silently
  }
}
