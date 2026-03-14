import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Catálogos del SAT para CFDI 4.0
export const SAT_REGIMEN_FISCAL = [
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', name: 'Arrendamiento' },
  { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', name: 'Demás ingresos' },
  { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', name: 'Ingresos por intereses' },
  { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', name: 'Sin obligaciones fiscales' },
  { code: '620', name: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { code: '621', name: 'Incorporación Fiscal' },
  { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { code: '623', name: 'Opcional para Grupos de Sociedades' },
  { code: '624', name: 'Coordinados' },
  { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { code: '626', name: 'Régimen Simplificado de Confianza' },
];

export const SAT_USO_CFDI = [
  { code: 'G01', name: 'Adquisición de mercancías' },
  { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', name: 'Gastos en general' },
  { code: 'I01', name: 'Construcciones' },
  { code: 'I02', name: 'Mobilario y equipo de oficina por inversiones' },
  { code: 'I03', name: 'Equipo de transporte' },
  { code: 'I04', name: 'Equipo de cómputo y accesorios' },
  { code: 'I05', name: 'Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', name: 'Comunicaciones telefónicas' },
  { code: 'I07', name: 'Comunicaciones satelitales' },
  { code: 'I08', name: 'Otra maquinaria y equipo' },
  { code: 'D01', name: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'D02', name: 'Gastos médicos por incapacidad o discapacidad' },
  { code: 'D03', name: 'Gastos funerales' },
  { code: 'D04', name: 'Donativos' },
  { code: 'D05', name: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { code: 'D06', name: 'Aportaciones voluntarias al SAR' },
  { code: 'D07', name: 'Primas por seguros de gastos médicos' },
  { code: 'D08', name: 'Gastos de transportación escolar obligatoria' },
  { code: 'D09', name: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { code: 'D10', name: 'Pagos por servicios educativos (colegiaturas)' },
  { code: 'S01', name: 'Sin efectos fiscales' },
  { code: 'CP01', name: 'Pagos' },
  { code: 'CN01', name: 'Nómina' },
];

export const FORMA_PAGO = {
  stripe: '04', // Tarjeta de crédito
  mercadopago: '04', // Tarjeta de crédito
  transfer: '03', // Transferencia electrónica de fondos
  cash: '01', // Efectivo
};

interface CreateInvoiceParams {
  registrationId: number;
  organizationId: number;
}

/**
 * Crea una factura en Facturapi para un registro de evento
 */
export async function createInvoice({ registrationId, organizationId }: CreateInvoiceParams) {
  try {
    // Obtener el registro con datos fiscales
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        SchoolProduct: {
          select: {
            name: true,
            basePrice: true,
            promoPrice: true,
          },
        },
      },
    });

    if (!registration) {
      throw new Error('Registro no encontrado');
    }

    if (!registration.requiresInvoice) {
      return { success: false, message: 'El usuario no requiere factura' };
    }

    // Verificar que tenga todos los datos fiscales
    if (!registration.invoiceRfc || !registration.invoiceName || !registration.invoiceZipCode || !registration.invoiceRegime || !registration.invoiceCfdiUse) {
      throw new Error('Datos fiscales incompletos');
    }

    // Obtener configuración de Facturapi de la organización
    const facturapiConfig = await prisma.facturapiConfig.findUnique({
      where: { organizationId },
    });

    if (!facturapiConfig || !facturapiConfig.isActive) {
      throw new Error('Facturapi no está configurado para esta organización');
    }

    const apiKey = facturapiConfig.apiKey;
    const baseUrl = 'https://www.facturapi.io/v2';

    // 1. Buscar o crear cliente en Facturapi
    let customerId: string;
    
    // Buscar si el cliente ya existe por RFC
    const searchResponse = await fetch(`${baseUrl}/customers?q=${registration.invoiceRfc}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const searchData = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
      // Cliente existe, usar el primero encontrado
      customerId = searchData.data[0].id;
      
      // Actualizar datos del cliente si es necesario
      await fetch(`${baseUrl}/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legal_name: registration.invoiceName.toUpperCase(),
          tax_id: registration.invoiceRfc.toUpperCase(),
          tax_system: registration.invoiceRegime,
          address: {
            zip: registration.invoiceZipCode,
          },
          email: registration.email,
        }),
      });
    } else {
      // Crear nuevo cliente
      const createCustomerResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legal_name: registration.invoiceName.toUpperCase(),
          tax_id: registration.invoiceRfc.toUpperCase(),
          tax_system: registration.invoiceRegime,
          address: {
            zip: registration.invoiceZipCode,
          },
          email: registration.email,
        }),
      });

      if (!createCustomerResponse.ok) {
        const error = await createCustomerResponse.json();
        throw new Error(`Error creando cliente: ${error.message || JSON.stringify(error)}`);
      }

      const customerData = await createCustomerResponse.json();
      customerId = customerData.id;
    }

    // 2. Crear la factura
    const amount = registration.amountPaid ? Number(registration.amountPaid) : (registration.SchoolProduct.promoPrice || registration.SchoolProduct.basePrice);
    const paymentForm = FORMA_PAGO[registration.paymentProvider as keyof typeof FORMA_PAGO] || '04';

    const invoiceResponse = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        items: [
          {
            quantity: 1,
            product: {
              description: `Inscripción: ${registration.SchoolProduct.name}`,
              product_key: facturapiConfig.defaultSatKey || '86132000',
              unit_key: facturapiConfig.defaultUnitKey || 'E48',
              unit_name: 'Servicio',
              price: amount,
            },
          },
        ],
        payment_form: paymentForm,
        use: registration.invoiceCfdiUse,
      }),
    });

    if (!invoiceResponse.ok) {
      const error = await invoiceResponse.json();
      // Guardar el error en la base de datos
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          invoiceStatus: 'FAILED',
          invoiceError: error.message || JSON.stringify(error),
        },
      });
      throw new Error(`Error creando factura: ${error.message || JSON.stringify(error)}`);
    }

    const invoiceData = await invoiceResponse.json();

    // 3. Obtener URLs del PDF y XML
    const pdfUrl = `${baseUrl}/invoices/${invoiceData.id}/pdf`;
    const xmlUrl = `${baseUrl}/invoices/${invoiceData.id}/xml`;

    // 4. Actualizar registro con datos de la factura
    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        invoiceStatus: 'CREATED',
        invoiceId: invoiceData.id,
        invoicePdfUrl: pdfUrl,
        invoiceXmlUrl: xmlUrl,
        invoiceError: null,
      },
    });

    // 5. Enviar la factura por correo (Facturapi lo hace automáticamente si está configurado)
    // O podemos forzar el envío:
    await fetch(`${baseUrl}/invoices/${invoiceData.id}/send_email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    console.log(`✅ Factura creada exitosamente: ${invoiceData.id} para registro ${registrationId}`);

    return {
      success: true,
      invoiceId: invoiceData.id,
      pdfUrl,
      xmlUrl,
    };
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    
    // Actualizar registro con error
    try {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          invoiceStatus: 'FAILED',
          invoiceError: error.message || 'Error desconocido al crear factura',
        },
      });
    } catch (updateError) {
      console.error('Error updating registration with invoice error:', updateError);
    }

    return {
      success: false,
      error: error.message || 'Error al crear la factura',
    };
  }
}

// API endpoint para crear factura manualmente (por si falla automáticamente)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'registrationId es requerido' },
        { status: 400 }
      );
    }

    // Obtener el registro para verificar organización
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: parseInt(registrationId) },
      select: { organizationId: true, paymentStatus: true },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    if (registration.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { success: false, error: 'El pago debe estar confirmado antes de emitir factura' },
        { status: 400 }
      );
    }

    const result = await createInvoice({
      registrationId: parseInt(registrationId),
      organizationId: registration.organizationId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in invoice API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar la factura' },
      { status: 500 }
    );
  }
}

// GET - Obtener catálogos del SAT
export async function GET() {
  return NextResponse.json({
    success: true,
    catalogs: {
      regimenFiscal: SAT_REGIMEN_FISCAL,
      usoCfdi: SAT_USO_CFDI,
    },
  });
}
