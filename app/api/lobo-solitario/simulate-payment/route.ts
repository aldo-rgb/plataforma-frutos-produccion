import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 🎭 GET /api/lobo-solitario/simulate-payment
 * Página de simulación de pago que muestra una interfaz para aprobar/rechazar
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ordenId = searchParams.get('ordenId');
    const paymentId = searchParams.get('paymentId');

    if (!ordenId || !paymentId) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - Simulación de Pago</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #1f2937; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️</div>
            <h1>Error</h1>
            <p>Parámetros inválidos</p>
          </div>
        </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Obtener información de la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: { id: ordenId },
      include: {
        Usuario: {
          select: { nombre: true, email: true }
        },
        Mentor: {
          select: { nombre: true }
        }
      }
    });

    if (!orden) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - Orden No Encontrada</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #1f2937; margin: 0 0 10px 0; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌</div>
            <h1>Orden No Encontrada</h1>
            <p>No se encontró la orden especificada</p>
          </div>
        </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Retornar página HTML de simulación con diseño de suscripción
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>🎭 Simulación de Pago - Frutos del Espíritu</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(to bottom right, rgb(2 6 23), rgb(88 28 135), rgb(2 6 23));
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: linear-gradient(to bottom right, rgb(15 23 42 / 0.5), rgb(88 28 135 / 0.3));
            backdrop-filter: blur(12px);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 24px;
            padding: 48px;
            max-width: 700px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            color: rgb(250, 204, 21);
            padding: 10px 20px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 24px;
          }
          h1 { 
            color: white;
            margin: 0 0 16px 0;
            font-size: 36px;
            font-weight: 900;
            font-style: italic;
            text-transform: uppercase;
            letter-spacing: -0.025em;
          }
          .gradient-text {
            background: linear-gradient(to right, rgb(168, 85, 247), rgb(236, 72, 153));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .subtitle {
            color: rgb(148, 163, 184);
            margin-bottom: 32px;
            line-height: 1.5;
            font-size: 16px;
          }
          .info-box {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .info-row:last-child { border-bottom: none; padding-top: 20px; margin-top: 8px; }
          .info-label {
            color: rgb(148, 163, 184);
            font-size: 14px;
            font-weight: 500;
          }
          .info-value {
            color: white;
            font-weight: 700;
            text-align: right;
            font-size: 15px;
          }
          .total-row {
            background: linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 20px;
            margin: 0 -16px -16px -16px;
          }
          .total-label {
            color: white;
            font-size: 16px;
            font-weight: 700;
          }
          .total-value {
            font-size: 32px;
            font-weight: 900;
            background: linear-gradient(to right, rgb(168, 85, 247), rgb(236, 72, 153));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
          .btn {
            padding: 18px 32px;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .btn-success {
            background: linear-gradient(to right, rgb(34, 197, 94), rgb(22, 163, 74));
            color: white;
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
          }
          .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(34, 197, 94, 0.4);
          }
          .btn-danger {
            background: linear-gradient(to right, rgb(239, 68, 68), rgb(220, 38, 38));
            color: white;
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
          }
          .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(239, 68, 68, 0.4);
          }
          .btn:active {
            transform: translateY(0);
          }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .processing {
            text-align: center;
            padding: 40px 20px;
            display: none;
          }
          .processing.active { display: block; }
          .spinner {
            border: 4px solid rgba(139, 92, 246, 0.2);
            border-top: 4px solid rgb(139, 92, 246);
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .processing-text {
            color: rgb(168, 85, 247);
            font-weight: 600;
            font-size: 16px;
          }
          .note {
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-left: 4px solid rgb(234, 179, 8);
            padding: 16px 20px;
            border-radius: 12px;
            color: rgb(250, 204, 21);
            font-size: 13px;
            line-height: 1.6;
          }
          .note strong {
            font-weight: 700;
            display: block;
            margin-bottom: 4px;
          }
          @media (max-width: 640px) {
            .container { padding: 32px 24px; }
            h1 { font-size: 28px; }
            .buttons { grid-template-columns: 1fr; }
            .info-box { padding: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">
            <span>🎭</span>
            <span>Modo Simulación</span>
          </span>
          
          <h1>
            Confirmar <span class="gradient-text">Pago</span>
          </h1>
          
          <p class="subtitle">
            Esta es una simulación de pago. En producción, serías redirigido a ${orden.metodoPago || 'la pasarela de pago'}.
          </p>

          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span class="info-value">${orden.Usuario.nombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${orden.Usuario.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mentor:</span>
              <span class="info-value">${orden.Mentor.nombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Frecuencia:</span>
              <span class="info-value">${(orden.paymentData as any)?.frecuencia || 'Anual'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Método de Pago:</span>
              <span class="info-value">${orden.metodoPago || 'No especificado'}</span>
            </div>
            
            <div class="info-row total-row">
              <span class="total-label">Total a Pagar:</span>
              <span class="total-value">$${orden.precioTotal.toLocaleString()}</span>
            </div>
          </div>

          <div id="actionButtons" class="buttons">
            <button class="btn btn-success" onclick="processPayment('approved')">
              <span>✅</span>
              <span>Aprobar Pago</span>
            </button>
            <button class="btn btn-danger" onclick="processPayment('cancelled')">
              <span>❌</span>
              <span>Cancelar</span>
            </button>
          </div>

          <div id="processing" class="processing">
            <div class="spinner"></div>
            <p class="processing-text">Procesando pago simulado...</p>
          </div>

          <div class="note">
            <strong>💡 Nota de Desarrollo</strong>
            Este es un entorno de desarrollo. Los pagos no son reales.
          </div>
        </div>

        <script>
          async function processPayment(status) {
            const buttons = document.getElementById('actionButtons');
            const processing = document.getElementById('processing');
            
            buttons.style.display = 'none';
            processing.classList.add('active');

            // Simular delay de procesamiento
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (status === 'approved') {
              // Redirigir a success
              window.location.href = '/api/lobo-solitario/payment-success?ordenId=${ordenId}&simulationStatus=approved';
            } else {
              // Redirigir a cancelled
              window.location.href = '/dashboard/suscripcion?payment=cancelled&simulation=true';
            }
          }
        </script>
      </body>
      </html>
      `,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      }
    );
  } catch (error: any) {
    console.error('Error en simulación de pago:', error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Simulación de Pago</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
          h1 { color: #1f2937; margin: 0 0 10px 0; }
          p { color: #6b7280; line-height: 1.6; }
          pre { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 8px; 
            text-align: left; 
            overflow-x: auto;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">💥</div>
          <h1>Error en Simulación</h1>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
        </div>
      </body>
      </html>
      `,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' } 
      }
    );
  }
}
