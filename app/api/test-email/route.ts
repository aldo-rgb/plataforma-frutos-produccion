import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }
  
  // Check environment variables
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'NOT SET';
  
  console.log('📧 Test email - RESEND_API_KEY exists:', hasResendKey);
  console.log('📧 Test email - EMAIL_FROM:', emailFrom);
  
  const result = await sendEmail(
    email,
    '🧪 Test Email desde Quantum Platform',
    `<h1>Test Email</h1>
    <p>Este es un email de prueba enviado desde el servidor.</p>
    <p><strong>RESEND_API_KEY configurada:</strong> ${hasResendKey ? 'SÍ' : 'NO'}</p>
    <p><strong>EMAIL_FROM:</strong> ${emailFrom}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`,
    { fromName: 'Quantum Test' }
  );
  
  return NextResponse.json({
    success: result.success,
    hasResendKey,
    emailFrom,
    error: result.error,
    messageId: result.messageId
  });
}
