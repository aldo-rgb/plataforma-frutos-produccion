-- =============================================
-- SCHEMA DE COTIZACIONES Y PROPUESTAS
-- Sistema completo de cotizaciones digitales
-- =============================================

-- =============================================
-- 1. TABLA: quote_catalog_items
-- Catálogo de servicios/productos del usuario
-- =============================================
CREATE TABLE IF NOT EXISTS quote_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Información del item
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipo de precio: 'fixed', 'hourly', 'range', 'multiplier'
    price_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
    price DECIMAL(12, 2) NOT NULL,
    price_max DECIMAL(12, 2),  -- Para rango de precios
    unit VARCHAR(50),          -- "hora", "usuario", "licencia", etc.
    
    -- Visual
    photo TEXT,                -- URL de imagen
    icon VARCHAR(10) DEFAULT '📦',
    
    -- Organización
    category VARCHAR(100) DEFAULT 'general',
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_catalog_user ON quote_catalog_items(user_id);
CREATE INDEX idx_catalog_active ON quote_catalog_items(user_id, is_active);
CREATE INDEX idx_catalog_category ON quote_catalog_items(user_id, category);

-- =============================================
-- 2. TABLA: quotes
-- Cotizaciones/Propuestas
-- =============================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(20) UNIQUE NOT NULL,  -- Código corto para URL
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Datos del cliente (JSON)
    client_data JSONB NOT NULL,
    /*
    {
        "name": "Cliente X",
        "email": "cliente@email.com",
        "phone": "+52...",
        "whatsapp": "+52...",
        "company": "Empresa XYZ"
    }
    */
    
    -- Items de la cotización (JSON)
    items JSONB NOT NULL,
    /*
    [
        {
            "id": "item-1",
            "catalogItemId": "uuid",
            "name": "Diseño de Logo",
            "description": "Incluye 3 propuestas",
            "priceType": "fixed",
            "unitPrice": 5000,
            "quantity": 1,
            "total": 5000
        }
    ]
    */
    
    -- Items opcionales/upselling (JSON)
    optional_items JSONB,
    
    -- Montos
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    discount_type VARCHAR(20),  -- 'percentage' o 'fixed'
    tax DECIMAL(5, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Vigencia
    valid_days INTEGER DEFAULT 15,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Opciones
    notes TEXT,
    requires_deposit BOOLEAN DEFAULT FALSE,
    deposit_percent INTEGER DEFAULT 50,
    
    -- Estado: 'draft', 'sent', 'viewed', 'approved', 'rejected', 'expired'
    status VARCHAR(20) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    
    -- Firma digital
    signature_image TEXT,       -- URL o base64 de la firma PNG
    signed_at TIMESTAMPTZ,
    signed_by_name VARCHAR(255),
    signed_by_ip VARCHAR(50),
    
    -- Pago (si aplica)
    payment_intent_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    paid_amount DECIMAL(12, 2),
    
    -- Auto-cotizador
    is_auto_generated BOOLEAN DEFAULT FALSE,
    lead_source VARCHAR(100),
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_short_code ON quotes(short_code);
CREATE INDEX idx_quotes_status ON quotes(user_id, status);
CREATE INDEX idx_quotes_created ON quotes(user_id, created_at DESC);
CREATE INDEX idx_quotes_expires ON quotes(expires_at);

-- =============================================
-- 3. TABLA: quote_comments
-- Comentarios/Negociaciones en cotizaciones
-- =============================================
CREATE TABLE IF NOT EXISTS quote_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Autor: 'provider' o 'client'
    author_type VARCHAR(20) NOT NULL,
    author_name VARCHAR(255),
    
    message TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_comments_quote ON quote_comments(quote_id);

-- =============================================
-- 4. TABLA: quote_widget_config
-- Configuración del widget auto-cotizador
-- =============================================
CREATE TABLE IF NOT EXISTS quote_widget_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    is_enabled BOOLEAN DEFAULT TRUE,
    
    -- Personalización
    title VARCHAR(255) DEFAULT '💰 Cotiza tu proyecto',
    subtitle VARCHAR(255),
    button_text VARCHAR(100) DEFAULT 'Cotizar Ahora',
    primary_color VARCHAR(7) DEFAULT '#8B5CF6',
    
    -- Comportamiento
    show_prices BOOLEAN DEFAULT TRUE,
    require_contact_for_prices BOOLEAN DEFAULT TRUE,
    require_name BOOLEAN DEFAULT TRUE,
    require_email BOOLEAN DEFAULT FALSE,
    require_phone BOOLEAN DEFAULT TRUE,
    
    -- Mensajes
    success_message TEXT DEFAULT '¡Listo! Te enviaremos tu cotización por WhatsApp',
    
    -- Categorías seleccionables (JSON)
    categories JSONB,
    /*
    [
        {
            "id": "categoria-1",
            "name": "Diseño",
            "items": ["uuid1", "uuid2"]
        }
    ]
    */
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widget_config_user ON quote_widget_config(user_id);

-- =============================================
-- 5. TABLA: quote_notifications
-- Notificaciones de cotizaciones
-- =============================================
CREATE TABLE IF NOT EXISTS quote_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Tipo de notificación
    type VARCHAR(50) NOT NULL,
    /*
    'new_quote_request'  - Nuevo lead desde auto-cotizador
    'quote_viewed'       - Cliente vio la cotización
    'quote_approved'     - Cliente firmó/aprobó
    'quote_rejected'     - Cliente rechazó
    'quote_expired'      - Cotización expiró
    'new_comment'        - Nuevo comentario/negociación
    */
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    is_read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_notifications_user ON quote_notifications(user_id, is_read);
CREATE INDEX idx_quote_notifications_quote ON quote_notifications(quote_id);

-- =============================================
-- TRIGGERS para updated_at
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_quote_catalog_items_updated_at
    BEFORE UPDATE ON quote_catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_widget_config_updated_at
    BEFORE UPDATE ON quote_widget_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCIÓN: Auto-expirar cotizaciones
-- =============================================
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS void AS $$
BEGIN
    UPDATE quotes
    SET status = 'expired'
    WHERE status IN ('sent', 'viewed')
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS (Row Level Security) - Opcional
-- =============================================

-- Habilitar RLS
ALTER TABLE quote_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_widget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
-- Los usuarios solo ven sus propios datos

CREATE POLICY "Users can view own catalog items"
    ON quote_catalog_items FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can insert own catalog items"
    ON quote_catalog_items FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can update own catalog items"
    ON quote_catalog_items FOR UPDATE
    USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can delete own catalog items"
    ON quote_catalog_items FOR DELETE
    USING (user_id = current_setting('app.current_user_id')::integer);

-- Similar para quotes
CREATE POLICY "Users can view own quotes"
    ON quotes FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can insert own quotes"
    ON quotes FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can update own quotes"
    ON quotes FOR UPDATE
    USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY "Users can delete own quotes"
    ON quotes FOR DELETE
    USING (user_id = current_setting('app.current_user_id')::integer);

-- =============================================
-- DATOS DE EJEMPLO (opcional)
-- =============================================

-- INSERT INTO quote_catalog_items (user_id, name, description, price_type, price, icon, category) VALUES
-- (1, 'Diseño de Logo', 'Incluye 3 propuestas y archivos en alta resolución', 'fixed', 5000, '🎨', 'diseño'),
-- (1, 'Consultoría Legal', 'Asesoría jurídica profesional', 'hourly', 1500, '⚖️', 'consultoría'),
-- (1, 'Desarrollo Web', 'Sitio web responsivo completo', 'range', 15000, '💻', 'desarrollo'),
-- (1, 'Licencias de Software', 'Licencia por usuario', 'multiplier', 500, '🔑', 'software');

-- =============================================
-- FIN DEL SCHEMA
-- =============================================
