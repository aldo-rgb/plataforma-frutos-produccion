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
}

export default function PersonalQRWidget({ 
  userName, 
  userId, 
  userEmail, 
  referralCode, 
  organizationId: propOrganizationId,
  organizationName = 'FRUTOS',
  organizationLogo,
  squadName
}: PersonalQRWidgetProps) {
  const [showModal, setShowModal] = useState(false);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mostrar toast de copiado
  const showCopiedNotification = () => {
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2500);
  };

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
          if (data.childOrganizations && data.childOrganizations.length > 0) {
            // Buscar la organización actual en childOrganizations
            const currentOrg = data.childOrganizations.find((org: any) => org.id === organizationId) 
              || data.childOrganizations[0];
            
            console.log('🏢 Organización encontrada:', currentOrg);
            
            if (currentOrg?.logoUrl) {
              console.log('✅ Logo encontrado:', currentOrg.logoUrl);
              setOrgLogo(currentOrg.logoUrl);
            }
            if (currentOrg?.name) {
              setOrgName(currentOrg.name);
            }
          }
          
          // También verificar masterOrganization para el logo
          if (!orgLogo && data.masterOrganization?.logoUrl) {
            console.log('✅ Logo de master encontrado:', data.masterOrganization.logoUrl);
            setOrgLogo(data.masterOrganization.logoUrl);
          }
          
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
        
        const maxLogoWidth = 400;
        const maxLogoHeight = 120;
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

    // === BADGE "INSCRIPCIONES ABIERTAS" ===
    const badgeWidth = 380;
    const badgeHeight = 50;
    const badgeX = (width - badgeWidth) / 2;
    
    // Fondo del badge con gradiente rojo/naranja
    const badgeGradient = ctx.createLinearGradient(badgeX, currentY, badgeX + badgeWidth, currentY);
    badgeGradient.addColorStop(0, '#dc2626');
    badgeGradient.addColorStop(1, '#ea580c');
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.roundRect(badgeX, currentY, badgeWidth, badgeHeight, 25);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 INSCRIPCIONES ABIERTAS 🔥', width / 2, currentY + 33);
    currentY += badgeHeight + 25;

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
    ctx.fillText(referralCode || 'ESCANEA EL QR', width / 2, currentY);
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
      const userURL = referralCode
        ? `${window.location.origin}/auth/signup?ref=${referralCode}`
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

  // Regenerar QR cuando el logo se cargue (si el modal está abierto)
  useEffect(() => {
    if (showModal && logoLoaded && !premiumCardURL) {
      generateQR();
    }
  }, [logoLoaded, showModal]);

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
          onClick={() => setShowModal(false)}
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
                onClick={() => setShowModal(false)}
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
                  {referralCode ? `Código de referido: ${referralCode}` : 'Tu credencial personalizada'}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    // URL directa al registro con código de referido (la org se obtiene del referral)
                    const invitationURL = referralCode
                      ? `${window.location.origin}/auth/signup?ref=${referralCode}`
                      : registrationURL || `${window.location.origin}/auth/signup`;

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
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>🔗</span> Compartir
                </button>
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
