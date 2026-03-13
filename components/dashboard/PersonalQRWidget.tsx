'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PersonalQRWidgetProps {
  userName: string;
  userId: number;
  userEmail: string;
  referralCode?: string;
  organizationId?: number | null;
  organizationName?: string;
  organizationLogo?: string | null;
  squadName?: string;
  autoOpen?: boolean;
  onClose?: () => void;
}

export default function PersonalQRWidget({ 
  userName, 
  userId, 
  userEmail, 
  referralCode, 
  organizationId: propOrganizationId,
  organizationName = 'FRUTOS',
  organizationLogo,
  squadName,
  autoOpen = false,
  onClose
}: PersonalQRWidgetProps) {
  const [showModal, setShowModal] = useState(autoOpen);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [premiumCardURL, setPremiumCardURL] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string | null>(organizationLogo || null);
  const [orgName, setOrgName] = useState<string>(organizationName);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [basicPrice, setBasicPrice] = useState<number>(1500);
  const [currency, setCurrency] = useState<string>('MXN');
  const [registrationURL, setRegistrationURL] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<number | null | undefined>(propOrganizationId);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string | undefined>(referralCode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mostrar toast de copiado
  const showCopiedNotification = () => {
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2500);
  };

  // Si no hay referralCode en props, obtenerlo del usuario (puede estar desactualizado en la sesión)
  useEffect(() => {
    if (!referralCode && userId) {
      console.log('🔄 No hay referralCode en props, obteniendo del usuario:', userId);
      fetch(`/api/me`)
        .then(res => res.json())
        .then(data => {
          if (data.referralCode) {
            console.log('✅ ReferralCode obtenido del usuario:', data.referralCode);
            setUserReferralCode(data.referralCode);
          }
        })
        .catch(err => console.error('Error fetching user referralCode:', err));
    }
  }, [referralCode, userId]);

  // Si no hay organizationId en props, obtenerlo del usuario
  useEffect(() => {
    if (!propOrganizationId && userId) {
      console.log('🔄 No hay organizationId en props, obteniendo del usuario:', userId);
      fetch(`/api/user/${userId}/organization`)
        .then(res => res.json())
        .then(data => {
          if (data.organizationId) {
            console.log('✅ OrganizationId obtenido del usuario:', data.organizationId);
            setOrganizationId(data.organizationId);
          }
        })
        .catch(err => console.error('Error fetching user organization:', err));
    }
  }, [propOrganizationId, userId]);

  // Cargar logo, nombre y precios de la organización
  useEffect(() => {
    console.log('🔍 PersonalQRWidget - organizationId recibido:', organizationId, typeof organizationId);
    
    if (organizationId) {
      console.log('🔍 Cargando datos de organización:', organizationId);
      
      // Cargar datos de la organización (logo y nombre)
      fetch(`/api/public/organization/${organizationId}`)
        .then(res => res.json())
        .then(data => {
          console.log('📦 Respuesta de organización:', data);
          
          // La API devuelve childOrganizations con los datos
          let foundLogo: string | null = null;
          let foundName: string | null = null;
          
          if (data.childOrganizations && data.childOrganizations.length > 0) {
            // Buscar la organización actual en childOrganizations
            const currentOrg = data.childOrganizations.find((org: any) => org.id === organizationId) 
              || data.childOrganizations[0];
            
            console.log('🏢 Organización encontrada:', currentOrg);
            
            // PRIORIDAD: Logo de la organización actual
            if (currentOrg?.logoUrl) {
              console.log('✅ Logo de organización actual encontrado:', currentOrg.logoUrl);
              foundLogo = currentOrg.logoUrl;
            }
            if (currentOrg?.name) {
              foundName = currentOrg.name;
            }
          }
          
          // Solo usar masterOrganization si NO hay logo de la organización actual
          if (!foundLogo && data.masterOrganization?.logoUrl) {
            console.log('⚠️ Usando logo de master como fallback:', data.masterOrganization.logoUrl);
            foundLogo = data.masterOrganization.logoUrl;
          }
          
          if (foundLogo) setOrgLogo(foundLogo);
          if (foundName) setOrgName(foundName);
          
          setLogoLoaded(true);
        })
        .catch(err => {
          console.error('Error loading org data:', err);
          setLogoLoaded(true);
        });

      // Cargar precios de la organización
      fetch(`/api/public/prices?organizationId=${organizationId}`)
        .then(res => res.json())
        .then(data => {
          console.log('💰 Precios de organización:', data);
          if (data.success && data.prices?.BASIC) {
            setBasicPrice(data.prices.BASIC);
          }
          if (data.currency) {
            setCurrency(data.currency);
          }
        })
        .catch(err => console.error('Error loading prices:', err));
    } else {
      setLogoLoaded(true);
    }
  }, [organizationId]);

  // Generar la tarjeta premium con diseño completo - ESTILO ANUNCIO PROMOCIONAL
  const generatePremiumCard = async (qrDataUrl: string): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Dimensiones de alta resolución (1080x1350 para stories/vertical)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // === FONDO CON GRADIENTE PREMIUM ===
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0f1a');      // Azul muy oscuro
    gradient.addColorStop(0.3, '#0d1929');    // Azul marino profundo
    gradient.addColorStop(0.6, '#0f172a');    // Slate 900
    gradient.addColorStop(1, '#020617');      // Casi negro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // === PARTÍCULAS DE LUZ / ESTRELLAS ===
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.5 + 0.1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(147, 197, 253, ${opacity})`;
      ctx.fill();
    }

    // === CÍRCULOS DECORATIVOS (Glow effect) ===
    const gradCircle1 = ctx.createRadialGradient(width - 100, 200, 0, width - 100, 200, 350);
    gradCircle1.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
    gradCircle1.addColorStop(1, 'transparent');
    ctx.fillStyle = gradCircle1;
    ctx.beginPath();
    ctx.arc(width - 100, 200, 350, 0, Math.PI * 2);
    ctx.fill();

    const gradCircle2 = ctx.createRadialGradient(100, height - 300, 0, 100, height - 300, 300);
    gradCircle2.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    gradCircle2.addColorStop(1, 'transparent');
    ctx.fillStyle = gradCircle2;
    ctx.beginPath();
    ctx.arc(100, height - 300, 300, 0, Math.PI * 2);
    ctx.fill();

    // === BARRA SUPERIOR DORADA ===
    const goldGradient = ctx.createLinearGradient(0, 0, width, 0);
    goldGradient.addColorStop(0, 'rgba(251, 191, 36, 0)');
    goldGradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.9)');
    goldGradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.9)');
    goldGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = goldGradient;
    ctx.fillRect(0, 0, width, 8);

    let currentY = 50;

    // === LOGO DE LA ORGANIZACIÓN ===
    if (orgLogo) {
      try {
        const logoImage = new Image();
        logoImage.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImage.onload = resolve;
          logoImage.onerror = reject;
          logoImage.src = orgLogo;
        });
        
        // Logo grande y prominente
        const maxLogoWidth = 700;
        const maxLogoHeight = 250;
        let logoWidth = logoImage.width;
        let logoHeight = logoImage.height;
        
        if (logoWidth > maxLogoWidth) {
          logoHeight = (maxLogoWidth / logoWidth) * logoHeight;
          logoWidth = maxLogoWidth;
        }
        if (logoHeight > maxLogoHeight) {
          logoWidth = (maxLogoHeight / logoHeight) * logoWidth;
          logoHeight = maxLogoHeight;
        }
        
        const logoX = (width - logoWidth) / 2;
        ctx.drawImage(logoImage, logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 30;
      } catch (error) {
        console.error('Error loading org logo:', error);
        currentY += 20;
      }
    }

    // === TÍTULO PRINCIPAL ===
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRENAMIENTO', width / 2, currentY + 50);
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.fillText('BÁSICO', width / 2, currentY + 130);
    currentY += 160;

    // Subtítulo
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('Transformación Cuántica', width / 2, currentY);
    currentY += 50;

    // === CONTENEDOR DEL QR ===
    const qrContainerSize = 380;
    const qrX = (width - qrContainerSize) / 2;
    const qrY = currentY;

    // Glow exterior
    for (let i = 4; i > 0; i--) {
      ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
      ctx.shadowBlur = 20 + i * 8;
    }

    // Borde dorado
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(qrX - 6, qrY - 6, qrContainerSize + 12, qrContainerSize + 12, 24);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Contenedor blanco del QR
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrContainerSize, qrContainerSize, 20);
    ctx.fill();

    // Dibujar QR
    const qrImage = new Image();
    await new Promise((resolve, reject) => {
      qrImage.onload = resolve;
      qrImage.onerror = reject;
      qrImage.src = qrDataUrl;
    });
    
    const qrPadding = 25;
    const qrSize = qrContainerSize - qrPadding * 2;
    ctx.drawImage(qrImage, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);

    currentY = qrY + qrContainerSize + 30;

    // === CÓDIGO DE REGISTRO ===
    ctx.fillStyle = '#64748b';
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CÓDIGO DE REGISTRO', width / 2, currentY);
    currentY += 35;

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(userReferralCode || 'ESCANEA EL QR', width / 2, currentY);
    currentY += 50;

    // === PRECIO ===
    // Fondo para el precio
    const priceBoxWidth = 400;
    const priceBoxHeight = 90;
    const priceBoxX = (width - priceBoxWidth) / 2;
    
    const priceGradient = ctx.createLinearGradient(priceBoxX, currentY, priceBoxX + priceBoxWidth, currentY + priceBoxHeight);
    priceGradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
    priceGradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    ctx.fillStyle = priceGradient;
    ctx.beginPath();
    ctx.roundRect(priceBoxX, currentY, priceBoxWidth, priceBoxHeight, 16);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(priceBoxX, currentY, priceBoxWidth, priceBoxHeight, 16);
    ctx.stroke();

    ctx.fillStyle = '#86efac';
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('INVERSIÓN', width / 2, currentY + 30);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$${basicPrice.toLocaleString()} ${currency}`, width / 2, currentY + 72);
    currentY += priceBoxHeight + 25;

    // === LEYENDA DE URGENCIA ===
    // Fondo rojo pulsante
    const urgencyBoxWidth = 680;
    const urgencyBoxHeight = 60;
    const urgencyBoxX = (width - urgencyBoxWidth) / 2;
    
    const urgencyGradient = ctx.createLinearGradient(urgencyBoxX, currentY, urgencyBoxX + urgencyBoxWidth, currentY + urgencyBoxHeight);
    urgencyGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    urgencyGradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
    urgencyGradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
    ctx.fillStyle = urgencyGradient;
    ctx.beginPath();
    ctx.roundRect(urgencyBoxX, currentY, urgencyBoxWidth, urgencyBoxHeight, 12);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(urgencyBoxX, currentY, urgencyBoxWidth, urgencyBoxHeight, 12);
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('⚡ ¡QUEDAN POCOS LUGARES A ESE PRECIO! ⚡', width / 2, currentY + 40);
    currentY += urgencyBoxHeight + 25;

    // === FOOTER - INSTRUCCIÓN ===
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('Escanea el código QR para registrarte', width / 2, currentY);

    // Barra inferior dorada
    ctx.fillStyle = goldGradient;
    ctx.fillRect(0, height - 8, width, 8);

    // Marca de agua
    ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.font = '400 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('quantummatter.app', width / 2, height - 25);

    return canvas.toDataURL('image/png', 1.0);
  };

  const generateQR = async () => {
    setGeneratingQR(true);
    try {
      // URL que dirige al signup con el código de referido (la org se obtiene del referral)
      // Usar userReferralCode que puede venir de props o cargarse desde la API
      const userURL = userReferralCode
        ? `${window.location.origin}/auth/signup?ref=${userReferralCode}`
        : `${window.location.origin}/profile/${userId}`;
      
      // Guardar la URL de registro para compartir
      setRegistrationURL(userURL);
      
      // Importar QRCode dinámicamente
      const QRCodeModule = await import('qrcode');
      const QRCode = QRCodeModule.default || QRCodeModule;
      
      // Generar el QR como data URL (para preview)
      const qrDataUrl = await QRCode.toDataURL(userURL, {
        width: 512,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      
      setQrDataURL(qrDataUrl);

      // Generar la tarjeta premium
      const premiumCard = await generatePremiumCard(qrDataUrl);
      setPremiumCardURL(premiumCard);
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const downloadQR = () => {
    if (!premiumCardURL) return;
    
    const link = document.createElement('a');
    link.href = premiumCardURL;
    link.download = `${userName.replace(/\s+/g, '-')}-credencial-quantummatter.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    // Regenerar siempre el QR para asegurar que tenga el logo actualizado
    // Solo generar si el logo ya se cargó o si no hay organizationId
    if (logoLoaded || !organizationId) {
      generateQR();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    onClose?.();
  };

  // Generar QR automáticamente cuando se abre con autoOpen
  useEffect(() => {
    if (autoOpen && (logoLoaded || !organizationId)) {
      generateQR();
    }
  }, [autoOpen, logoLoaded, organizationId]);

  // Regenerar QR cuando el logo se cargue (si el modal está abierto)
  useEffect(() => {
    if (showModal && logoLoaded && !premiumCardURL) {
      generateQR();
    }
  }, [logoLoaded, showModal]);

  // Si autoOpen es true, solo mostrar el modal directamente (sin el widget card)
  if (autoOpen) {
    return (
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
        onClick={handleCloseModal}
      >
        <div 
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-amber-500/30 max-w-md w-full shadow-2xl my-8 max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Premium */}
          <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-gradient-to-r from-amber-900/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <span className="text-2xl">✦</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-400">Tu Credencial</h3>
                <p className="text-xs text-slate-400">Vista previa de tu tarjeta</p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {/* Vista previa de la tarjeta premium */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl mb-6 border border-amber-500/20">
              {premiumCardURL ? (
                <img 
                  src={premiumCardURL} 
                  alt="Credencial FRUTOS" 
                  className="w-full"
                />
              ) : generatingQR ? (
                <div className="aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 text-sm">Generando tu credencial premium...</p>
                </div>
              ) : (
                <div className="aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4">✦</div>
                  <p className="text-slate-400 text-sm">Tu credencial aparecerá aquí</p>
                </div>
              )}
            </div>

            {/* Info del participante */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-1">
                {userName}
              </h3>
              <p className="text-slate-400 text-sm">
                {userReferralCode ? `Código de referido: ${userReferralCode}` : 'Tu credencial personalizada'}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={downloadQR}
                disabled={!premiumCardURL}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>💾</span> Guardar QR
              </button>
              <button
                onClick={() => {
                  const invitationURL = userReferralCode
                    ? `https://www.impactocuantico.com/auth/signup?ref=${userReferralCode}`
                    : `https://www.impactocuantico.com/auth/signup`;

                  const shareText = `🎓 ¡Te invito a vivir una experiencia que cambiará tu vida!

✨ Entrenamiento Básico de Transformación Cuántica

🌟 3 días intensivos de conciencia y romper creencias limitantes
💫 Entrenamiento práctico para resultados reales  
🤝 Una comunidad extraordinaria

⚡ ¡QUEDAN POCOS LUGARES!

👉 Conoce más y regístrate aquí:
${invitationURL}

¡Te espero! 🚀`;

                  const whatsappURL = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                  window.open(whatsappURL, '_blank');
                }}
                disabled={!userReferralCode && !registrationURL}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
            
            {/* Botón de compartir general */}
            <button
              onClick={async () => {
                const invitationURL = userReferralCode
                  ? `https://www.impactocuantico.com/auth/signup?ref=${userReferralCode}`
                  : `https://www.impactocuantico.com/auth/signup`;

                const shareText = `🎓 ¡Te invito a vivir una experiencia que cambiará tu vida!

✨ Entrenamiento Básico de Transformación Cuántica

🌟 3 días intensivos de conciencia y romper creencias limitantes
💫 Entrenamiento práctico para resultados reales  
🤝 Una comunidad extraordinaria

⚡ ¡QUEDAN POCOS LUGARES!

👉 Conoce más y regístrate aquí:
${invitationURL}

¡Te espero! 🚀`;

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `Invitación al Entrenamiento Básico`,
                      text: shareText
                    });
                  } catch (err) {
                    await navigator.clipboard.writeText(shareText);
                    showCopiedNotification();
                  }
                } else {
                  await navigator.clipboard.writeText(shareText);
                  showCopiedNotification();
                }
              }}
              disabled={!userReferralCode && !registrationURL}
              className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>🔗</span> Compartir
            </button>

            {/* Tip informativo */}
            <div className="mt-6 p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl">
              <p className="text-amber-200/80 text-sm text-center">
                ✨ <strong>Tu Credencial de Transformación</strong> incluye tu QR único para que otros se registren con tu código de referido
              </p>
            </div>
          </div>
        </div>

        {/* Toast de copiado */}
        {showCopiedToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-2xl border border-emerald-400/30">
              <span className="text-xl">✅</span>
              <span className="font-medium">Mensaje copiado al portapapeles</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Widget Card */}
      <div 
        onClick={handleOpenModal}
        className="bg-gradient-to-br from-indigo-900/50 via-blue-900/30 to-slate-900 border-2 border-blue-500/30 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-10"></div>
        
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
            <span className="text-3xl">📱</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Tu Código</span>
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-xl mb-2">
            Mi QR Personal
          </div>
          <p className="text-sm text-slate-400">
            Tu código QR personalizado para compartir tu perfil
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-amber-500/30 max-w-md w-full shadow-2xl my-8 max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Premium */}
            <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-gradient-to-r from-amber-900/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <span className="text-2xl">✦</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-400">Tu Credencial</h3>
                  <p className="text-xs text-slate-400">Vista previa de tu tarjeta</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Vista previa de la tarjeta premium */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl mb-6 border border-amber-500/20">
                {premiumCardURL ? (
                  <img 
                    src={premiumCardURL} 
                    alt="Credencial FRUTOS" 
                    className="w-full h-auto"
                  />
                ) : generatingQR ? (
                  <div className="aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                    <div className="animate-spin text-5xl mb-4">⏳</div>
                    <p className="text-slate-400 text-sm">Generando tu credencial premium...</p>
                  </div>
                ) : (
                  <div className="aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                    <div className="text-6xl mb-4">✦</div>
                    <p className="text-slate-400 text-sm">Tu credencial aparecerá aquí</p>
                  </div>
                )}
              </div>

              {/* Info del participante */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {userName}
                </h3>
                <p className="text-slate-400 text-sm">
                  {userReferralCode ? `Código de referido: ${userReferralCode}` : 'Tu credencial personalizada'}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={downloadQR}
                  disabled={!premiumCardURL}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>💾</span> Guardar QR
                </button>
                <button
                  onClick={() => {
                    // URL fija de producción .com con código de referido
                    const invitationURL = referralCode
                      ? `https://www.impactocuantico.com/auth/signup?ref=${referralCode}`
                      : `https://www.impactocuantico.com/auth/signup`;

                    const shareText = `🎓 ¡Te invito a vivir una experiencia que cambiará tu vida!

✨ Entrenamiento Básico de Transformación Cuántica

🌟 3 días intensivos de conciencia y romper creencias limitantes
💫 Entrenamiento práctico para resultados reales  
🤝 Una comunidad extraordinaria

⚡ ¡QUEDAN POCOS LUGARES!

👉 Conoce más y regístrate aquí:
${invitationURL}

¡Te espero! 🚀`;

                    const whatsappURL = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                    window.open(whatsappURL, '_blank');
                  }}
                  disabled={!referralCode && !registrationURL}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
              
              {/* Botón de compartir general */}
              <button
                onClick={async () => {
                  // URL fija de producción .com con código de referido
                  const invitationURL = referralCode
                    ? `https://www.impactocuantico.com/auth/signup?ref=${referralCode}`
                    : `https://www.impactocuantico.com/auth/signup`;

                  const shareText = `🎓 ¡Te invito a vivir una experiencia que cambiará tu vida!

✨ Entrenamiento Básico de Transformación Cuántica

🌟 3 días intensivos de conciencia y romper creencias limitantes
💫 Entrenamiento práctico para resultados reales  
🤝 Una comunidad extraordinaria

⚡ ¡QUEDAN POCOS LUGARES!

👉 Conoce más y regístrate aquí:
${invitationURL}

¡Te espero! 🚀`;

                  // Usar Web Share API
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `Invitación al Entrenamiento Básico`,
                        text: shareText
                      });
                    } catch (err) {
                      // Usuario canceló o error - copiar al portapapeles
                      await navigator.clipboard.writeText(shareText);
                      showCopiedNotification();
                    }
                  } else {
                    // Copiar al portapapeles como fallback
                    await navigator.clipboard.writeText(shareText);
                    showCopiedNotification();
                  }
                }}
                disabled={!referralCode && !registrationURL}
                className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>🔗</span> Compartir
              </button>

              {/* Toast de copiado */}
              {showCopiedToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-2xl border border-emerald-400/30">
                    <span className="text-xl">✅</span>
                    <span className="font-medium">Mensaje copiado al portapapeles</span>
                  </div>
                </div>
              )}

              {/* Tip informativo */}
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl">
                <p className="text-amber-200/80 text-sm text-center">
                  ✨ <strong>Tu Credencial de Transformación</strong> incluye tu QR único para que otros se registren con tu código de referido
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
