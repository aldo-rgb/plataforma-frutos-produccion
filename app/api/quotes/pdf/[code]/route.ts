import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: { code: string };
}

// GET - Generar PDF de la cotización
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = params;
    
    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }
    
    // Buscar cotización
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        users:user_id (
          id,
          nombre,
          apellido,
          email,
          whatsapp,
          avatar,
          direccion
        )
      `)
      .eq('short_code', code)
      .single();
    
    if (error || !quote) {
      return NextResponse.json({ 
        error: 'Cotización no encontrada' 
      }, { status: 404 });
    }
    
    const client = JSON.parse(quote.client_data || '{}');
    const items = JSON.parse(quote.items || '[]');
    const provider = quote.users;
    
    // Generar HTML del PDF
    const html = generateQuotePDFHtml({
      quote,
      client,
      items,
      provider
    });
    
    // Para producción, usar Puppeteer o similar para generar PDF real
    // Por ahora, devolvemos HTML que el navegador puede imprimir como PDF
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="cotizacion-${code}.html"`
      }
    });
    
  } catch (error: any) {
    logger.error('Error generating PDF:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al generar PDF' 
    }, { status: 500 });
  }
}

function generateQuotePDFHtml(data: {
  quote: any;
  client: any;
  items: any[];
  provider: any;
}) {
  const { quote, client, items, provider } = data;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: quote.currency || 'MXN'
    }).format(amount);
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${quote.short_code}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 40px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: white;
      padding: 40px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header p {
      opacity: 0.9;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding: 40px;
      background: #f8fafc;
    }
    .info-box h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .info-box p {
      font-size: 16px;
      line-height: 1.6;
    }
    .items {
      padding: 40px;
    }
    .items h2 {
      font-size: 18px;
      margin-bottom: 20px;
      color: #1e293b;
    }
    .item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .item:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: 600;
    }
    .item-desc {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .item-qty {
      font-size: 14px;
      color: #64748b;
    }
    .item-price {
      font-weight: 600;
      color: #8b5cf6;
    }
    .totals {
      padding: 40px;
      background: #f8fafc;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.grand {
      font-size: 24px;
      font-weight: bold;
      padding-top: 16px;
      margin-top: 16px;
      border-top: 2px solid #e2e8f0;
    }
    .total-row.grand .amount {
      color: #8b5cf6;
    }
    .notes {
      padding: 40px;
      background: #fefce8;
      border-top: 1px solid #fde047;
    }
    .notes h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #854d0e;
    }
    .notes p {
      color: #713f12;
      line-height: 1.6;
    }
    .footer {
      padding: 30px 40px;
      background: #1e293b;
      color: white;
      text-align: center;
    }
    .footer p {
      font-size: 14px;
      opacity: 0.8;
    }
    .signature-section {
      padding: 40px;
      border-top: 1px dashed #e2e8f0;
    }
    .signature-section h3 {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 20px;
    }
    .signature-box {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
    }
    .signed {
      border-color: #22c55e;
      background: #f0fdf4;
    }
    .signed img {
      max-height: 80px;
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cotización #${quote.short_code.toUpperCase()}</h1>
      <p>Fecha: ${formatDate(quote.created_at)}</p>
    </div>
    
    <div class="info-grid">
      <div class="info-box">
        <h3>De:</h3>
        <p>
          <strong>${provider?.nombre || ''} ${provider?.apellido || ''}</strong><br>
          ${provider?.email || ''}<br>
          ${provider?.whatsapp || ''}
        </p>
      </div>
      <div class="info-box">
        <h3>Para:</h3>
        <p>
          <strong>${client.name || ''}</strong><br>
          ${client.company ? client.company + '<br>' : ''}
          ${client.email || ''}<br>
          ${client.whatsapp || client.phone || ''}
        </p>
      </div>
    </div>
    
    <div class="items">
      <h2>Detalle de Servicios</h2>
      ${items.map(item => `
        <div class="item">
          <div>
            <div class="item-name">${item.name}</div>
            ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
            <div class="item-qty">${item.quantity} × ${formatCurrency(item.unitPrice)}</div>
          </div>
          <div class="item-price">${formatCurrency(item.total)}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(quote.subtotal)}</span>
      </div>
      ${quote.discount > 0 ? `
        <div class="total-row" style="color: #22c55e;">
          <span>Descuento</span>
          <span>-${formatCurrency(quote.discount_type === 'percentage' ? quote.subtotal * quote.discount / 100 : quote.discount)}</span>
        </div>
      ` : ''}
      ${quote.tax > 0 ? `
        <div class="total-row">
          <span>IVA (${quote.tax}%)</span>
          <span>+${formatCurrency(quote.total * quote.tax / 100)}</span>
        </div>
      ` : ''}
      <div class="total-row grand">
        <span>Total</span>
        <span class="amount">${formatCurrency(quote.total)}</span>
      </div>
      ${quote.requires_deposit ? `
        <div class="total-row" style="color: #f59e0b; font-size: 14px;">
          <span>Anticipo requerido (${quote.deposit_percent}%)</span>
          <span>${formatCurrency(quote.total * quote.deposit_percent / 100)}</span>
        </div>
      ` : ''}
    </div>
    
    ${quote.notes ? `
      <div class="notes">
        <h3>📝 Notas y Condiciones</h3>
        <p>${quote.notes}</p>
      </div>
    ` : ''}
    
    <div class="signature-section">
      <h3>Firma de Aceptación</h3>
      ${quote.signature_image ? `
        <div class="signature-box signed">
          <img src="${quote.signature_image}" alt="Firma" />
        </div>
        <p style="margin-top: 12px; font-size: 14px; color: #64748b;">
          Firmado por: ${quote.signed_by_name || client.name}<br>
          Fecha: ${quote.signed_at ? formatDate(quote.signed_at) : ''}
        </p>
      ` : `
        <div class="signature-box">
          Pendiente de firma
        </div>
      `}
    </div>
    
    <div class="footer">
      <p>Válida hasta: ${formatDate(quote.expires_at)}</p>
      <p style="margin-top: 8px;">Generado desde Quantum Platform</p>
    </div>
  </div>
  
  <script>
    // Auto print when opened
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `;
}
