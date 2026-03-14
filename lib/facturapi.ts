/**
 * Facturapi Integration - Sistema de Facturación Electrónica CFDI 4.0
 * 
 * Este módulo maneja la integración con Facturapi para emitir facturas
 * electrónicas válidas ante el SAT de México.
 * 
 * Documentación: https://docs.facturapi.io/
 */

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface FacturapiCustomer {
  legal_name: string;
  tax_id: string; // RFC
  tax_system: string; // Régimen fiscal (ej: "601", "612", "616")
  address: {
    zip: string;
    country?: string;
  };
  email?: string;
  phone?: string;
}

export interface FacturapiProduct {
  description: string;
  product_key: string; // Clave SAT del producto/servicio
  price: number;
  quantity?: number;
  tax_included?: boolean;
  taxes?: FacturapiTax[];
}

export interface FacturapiTax {
  type: 'IVA' | 'ISR' | 'IEPS';
  rate: number; // 0.16 para 16%
  withholding?: boolean;
}

export interface FacturapiInvoice {
  customer: FacturapiCustomer | string; // Customer object or customer ID
  items: FacturapiProduct[];
  payment_form: string; // "03" = transferencia, "04" = tarjeta, "28" = tarjeta débito
  payment_method?: string; // "PUE" = Pago en Una sola Exhibición
  use?: string; // Uso CFDI (ej: "G03" = Gastos en general)
  series?: string;
  folio_number?: number;
  currency?: string; // "MXN"
  exchange?: number; // 1 para MXN
  conditions?: string;
  related?: string[];
  external_id?: string; // Tu ID interno para referencia
}

export interface FacturapiInvoiceResponse {
  id: string;
  created_at: string;
  livemode: boolean;
  status: 'valid' | 'canceled' | 'pending';
  cancellation_status?: string;
  verification_url: string;
  customer: {
    id: string;
    legal_name: string;
    tax_id: string;
  };
  total: number;
  uuid: string; // UUID del CFDI (Timbre Fiscal)
  folio_number: number;
  series: string;
  pdf_url?: string;
  xml_url?: string;
  stamp: {
    signature: string;
    date: string;
    sat_cert_number: string;
    sat_signature: string;
  };
}

export interface FacturapiError {
  message: string;
  code?: string;
  details?: any;
}

// Catálogos SAT
export const REGIMEN_FISCAL = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
};

export const USO_CFDI = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina por inversiones',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de cómputo y accesorios',
  'I05': 'Dados, troqueles, moldes, matrices y herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas para el ahorro, primas de pensiones',
  'D10': 'Pagos por servicios educativos (colegiaturas)',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
};

export const FORMA_PAGO = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '12': 'Dación en pago',
  '13': 'Pago por subrogación',
  '14': 'Pago por consignación',
  '15': 'Condonación',
  '17': 'Compensación',
  '23': 'Novación',
  '24': 'Confusión',
  '25': 'Remisión de deuda',
  '26': 'Prescripción o caducidad',
  '27': 'A satisfacción del acreedor',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '30': 'Aplicación de anticipos',
  '31': 'Intermediario pagos',
  '99': 'Por definir',
};

// Claves de producto SAT comunes para cursos/talleres
export const PRODUCT_KEYS = {
  CURSO_CAPACITACION: '86101700', // Servicios de capacitación en administración
  TALLER_EDUCATIVO: '86101705', // Servicios de capacitación gerencial
  EVENTO_CONFERENCIA: '80141609', // Servicios de organización de conferencias
  SERVICIO_EDUCATIVO: '86111700', // Servicios de educación superior
  COACHING: '80111620', // Servicios de consultoría en desarrollo personal
};

// ============================================================================
// FACTURAPI CLIENT
// ============================================================================

/**
 * Obtiene la configuración de Facturapi para una organización
 */
export async function getFacturapiConfig(organizationId: number): Promise<{
  apiKey: string;
  isActive: boolean;
  isLiveMode: boolean;
  defaultSatKey: string;
  defaultUnitKey: string;
} | null> {
  try {
    const config = await prisma.facturapiConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.isActive || !config.apiKey) {
      return null;
    }

    return {
      apiKey: config.apiKey,
      isActive: config.isActive,
      isLiveMode: config.isLiveMode,
      defaultSatKey: config.defaultSatKey || '86132000',
      defaultUnitKey: config.defaultUnitKey || 'E48',
    };
  } catch (error) {
    logger.error('Error obteniendo config de Facturapi:', error);
    return null;
  }
}

class FacturapiClient {
  private baseUrl: string = 'https://www.facturapi.io/v2';

  private async request<T>(
    apiKey: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as FacturapiError;
        logger.error('❌ Facturapi error:', { 
          status: response.status, 
          error,
          endpoint 
        });
        throw new Error(error.message || `Error de Facturapi: ${response.status}`);
      }

      return data as T;
    } catch (error) {
      logger.error('❌ Facturapi request failed:', { endpoint, error });
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------------------------

  async createCustomer(apiKey: string, customer: FacturapiCustomer): Promise<{ id: string }> {
    logger.info('📝 Creando cliente en Facturapi:', { rfc: customer.tax_id });
    return this.request<{ id: string }>(apiKey, '/customers', 'POST', customer);
  }

  async findCustomerByRfc(apiKey: string, rfc: string): Promise<{ id: string } | null> {
    try {
      const result = await this.request<{ data: Array<{ id: string; tax_id: string }> }>(
        apiKey,
        `/customers?tax_id=${encodeURIComponent(rfc)}`
      );
      
      if (result.data && result.data.length > 0) {
        return { id: result.data[0].id };
      }
      return null;
    } catch (error) {
      logger.warn('⚠️ Error buscando cliente:', { rfc, error });
      return null;
    }
  }

  async getOrCreateCustomer(apiKey: string, customer: FacturapiCustomer): Promise<string> {
    const existing = await this.findCustomerByRfc(apiKey, customer.tax_id);
    if (existing) {
      logger.info('✅ Cliente existente encontrado:', { id: existing.id });
      return existing.id;
    }

    const newCustomer = await this.createCustomer(apiKey, customer);
    logger.info('✅ Cliente creado:', { id: newCustomer.id });
    return newCustomer.id;
  }

  // -------------------------------------------------------------------------
  // INVOICES
  // -------------------------------------------------------------------------

  async createInvoice(apiKey: string, invoice: FacturapiInvoice): Promise<FacturapiInvoiceResponse> {
    logger.info('📄 Creando factura en Facturapi');
    
    const invoiceData = {
      ...invoice,
      payment_method: invoice.payment_method || 'PUE',
      currency: invoice.currency || 'MXN',
      exchange: invoice.exchange || 1,
    };

    const result = await this.request<FacturapiInvoiceResponse>(apiKey, '/invoices', 'POST', invoiceData);
    
    logger.info('✅ Factura creada exitosamente:', {
      id: result.id,
      uuid: result.uuid,
      total: result.total,
      folio: `${result.series}${result.folio_number}`,
    });

    return result;
  }

  async getInvoice(apiKey: string, invoiceId: string): Promise<FacturapiInvoiceResponse> {
    return this.request<FacturapiInvoiceResponse>(apiKey, `/invoices/${invoiceId}`);
  }

  async downloadPdf(apiKey: string, invoiceId: string): Promise<string> {
    const invoice = await this.getInvoice(apiKey, invoiceId);
    return invoice.pdf_url || `${this.baseUrl}/invoices/${invoiceId}/pdf`;
  }

  async downloadXml(apiKey: string, invoiceId: string): Promise<string> {
    const invoice = await this.getInvoice(apiKey, invoiceId);
    return invoice.xml_url || `${this.baseUrl}/invoices/${invoiceId}/xml`;
  }

  async cancelInvoice(apiKey: string, invoiceId: string): Promise<FacturapiInvoiceResponse> {
    logger.info('🚫 Cancelando factura:', { invoiceId });
    return this.request<FacturapiInvoiceResponse>(apiKey, `/invoices/${invoiceId}`, 'DELETE');
  }

  async sendInvoiceByEmail(apiKey: string, invoiceId: string, email: string): Promise<{ success: boolean }> {
    logger.info('📧 Enviando factura por email:', { invoiceId, email });
    return this.request<{ success: boolean }>(apiKey, `/invoices/${invoiceId}/email`, 'POST', { email });
  }

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  getPaymentForm(provider: string): string {
    switch (provider?.toLowerCase()) {
      case 'stripe':
        return '04'; // Tarjeta de crédito
      case 'mercadopago':
        return '04'; // Generalmente tarjeta
      case 'transfer':
      case 'spei':
        return '03'; // Transferencia
      case 'cash':
      case 'oxxo':
        return '01'; // Efectivo
      default:
        return '99'; // Por definir
    }
  }

  /**
   * Verifica si Facturapi está configurado para una organización
   */
  async isConfigured(organizationId: number): Promise<boolean> {
    const config = await getFacturapiConfig(organizationId);
    return config !== null && config.isActive;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const facturapi = new FacturapiClient();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Crea una factura para un registro de evento
 */
export async function createEventInvoice(params: {
  registrationId: number;
  organizationId: number;
  rfc: string;
  legalName: string;
  taxSystem: string;
  zipCode: string;
  cfdiUse: string;
  productName: string;
  amount: number;
  email: string;
  paymentProvider: string;
}): Promise<{
  success: boolean;
  invoiceId?: string;
  uuid?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
}> {
  try {
    // Obtener configuración de Facturapi para la organización
    const config = await getFacturapiConfig(params.organizationId);
    
    if (!config) {
      return {
        success: false,
        error: 'Facturación no configurada para esta organización',
      };
    }

    if (!config.isActive) {
      return {
        success: false,
        error: 'Facturación desactivada para esta organización',
      };
    }

    logger.info('🧾 Generando factura para evento:', {
      registrationId: params.registrationId,
      organizationId: params.organizationId,
      rfc: params.rfc,
      amount: params.amount,
    });

    // 1. Obtener o crear cliente
    const customerId = await facturapi.getOrCreateCustomer(config.apiKey, {
      legal_name: params.legalName,
      tax_id: params.rfc.toUpperCase(),
      tax_system: params.taxSystem,
      address: {
        zip: params.zipCode,
        country: 'MEX',
      },
      email: params.email,
    });

    // 2. Crear la factura
    const invoice = await facturapi.createInvoice(config.apiKey, {
      customer: customerId,
      items: [
        {
          description: params.productName,
          product_key: config.defaultSatKey || PRODUCT_KEYS.TALLER_EDUCATIVO,
          price: params.amount,
          quantity: 1,
          tax_included: true,
          taxes: [
            {
              type: 'IVA',
              rate: 0.16,
            },
          ],
        },
      ],
      payment_form: facturapi.getPaymentForm(params.paymentProvider),
      payment_method: 'PUE',
      use: params.cfdiUse || 'G03',
      external_id: `event-${params.registrationId}`,
    });

    // 3. Enviar por email
    try {
      await facturapi.sendInvoiceByEmail(config.apiKey, invoice.id, params.email);
      logger.info('✅ Factura enviada por email');
    } catch (emailError) {
      logger.warn('⚠️ No se pudo enviar la factura por email:', emailError);
    }

    return {
      success: true,
      invoiceId: invoice.id,
      uuid: invoice.uuid,
      pdfUrl: invoice.pdf_url,
      xmlUrl: invoice.xml_url,
    };
  } catch (error: any) {
    logger.error('❌ Error creando factura:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear factura',
    };
  }
}

/**
 * Valida un RFC mexicano
 */
export function validateRFC(rfc: string): { valid: boolean; type: 'moral' | 'fisica' | null; error?: string } {
  if (!rfc) {
    return { valid: false, type: null, error: 'RFC es requerido' };
  }

  const cleanRfc = rfc.toUpperCase().replace(/\s/g, '');

  // RFC Persona Física: 13 caracteres (4 letras + 6 dígitos + 3 homoclave)
  const rfcFisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  
  // RFC Persona Moral: 12 caracteres (3 letras + 6 dígitos + 3 homoclave)
  const rfcMoral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

  if (rfcFisica.test(cleanRfc)) {
    return { valid: true, type: 'fisica' };
  }
  
  if (rfcMoral.test(cleanRfc)) {
    return { valid: true, type: 'moral' };
  }

  return { 
    valid: false, 
    type: null, 
    error: 'Formato de RFC inválido. Debe tener 12 caracteres (persona moral) o 13 caracteres (persona física)' 
  };
}

/**
 * Valida un código postal mexicano
 */
export function validateZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}

export default facturapi;
