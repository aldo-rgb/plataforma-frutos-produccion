# 🚀 Manual - Expo de Futuros Imposibles

## Flujo del Visitante en la Expo

---

## Paso 1: Escanear QR del Negocio

El visitante escanea el código QR que está en el stand/gafete del participante.

```
📱 Escanea con la cámara de tu celular
     ↓
🔗 Se abre: impactocuantico.net/expo/votar/[ID]
```

---

## Paso 2: Registro del Visitante

Al abrir el enlace, el visitante ve un formulario de registro:

### Campos a llenar:

| Campo | Descripción | Obligatorio |
|-------|-------------|-------------|
| **Nombre** | Nombre completo del visitante | ✅ Sí |
| **Email** | Correo electrónico | ✅ Sí |
| **Teléfono** | Número de contacto | ✅ Sí |
| **¿Quién te invitó?** | Buscar nombre del participante que lo trajo | ✅ Sí |
| **Parentesco** | Relación con quien lo invitó (Amigo, Familiar, etc.) | ✅ Sí |

### Pantalla de registro:
```
┌─────────────────────────────────────┐
│     🚀 EXPO DE FUTUROS IMPOSIBLES   │
│                                     │
│  Votando por: [Nombre del Negocio]  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Tu Nombre                   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Tu Email                    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Tu Teléfono                 │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🔍 ¿Quién te invitó?        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Parentesco: [Seleccionar]   │    │
│  └─────────────────────────────┘    │
│                                     │
│      [ 📝 REGISTRARME ]             │
│                                     │
└─────────────────────────────────────┘
```

---

## Paso 3: Calificar el Negocio

Una vez registrado, el visitante puede calificar el negocio:

### Sistema de calificación:

```
⭐⭐⭐⭐⭐  (1-5 estrellas)

Criterios que puede evaluar:
- Presentación del negocio
- Creatividad de la idea
- Potencial del proyecto
- Atención recibida
```

### Pantalla de calificación:
```
┌─────────────────────────────────────┐
│     🎯 CALIFICA ESTE NEGOCIO        │
│                                     │
│        [Logo/Imagen Negocio]        │
│                                     │
│           "CasaNostra"              │
│          Categoría: Otro            │
│                                     │
│     ¿Qué calificación le das?       │
│                                     │
│        ⭐ ⭐ ⭐ ⭐ ⭐                │
│        1  2  3  4  5                │
│                                     │
│      [ ✅ ENVIAR CALIFICACIÓN ]     │
│                                     │
└─────────────────────────────────────┘
```

---

## Paso 4: Confirmación

Después de calificar, el visitante ve un mensaje de confirmación:

```
┌─────────────────────────────────────┐
│                                     │
│            🎉 ¡GRACIAS!             │
│                                     │
│    Tu voto ha sido registrado       │
│                                     │
│    Calificaste a: CasaNostra        │
│    Con: ⭐⭐⭐⭐⭐ (5 estrellas)     │
│                                     │
│    ¡Sigue explorando la Expo!       │
│                                     │
│   [ 🔍 VER CATÁLOGO DE NEGOCIOS ]   │
│                                     │
└─────────────────────────────────────┘
```

---

## Resumen del Flujo Completo

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   ESCANEAR   │ ──▶ │  REGISTRAR   │ ──▶ │  CALIFICAR   │ ──▶ │ CONFIRMACIÓN │
│   QR/GAFETE  │     │    DATOS     │     │   NEGOCIO    │     │   DE VOTO    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      📱                  📝                   ⭐                    ✅
```

---

## Para el Coordinador

### Generación de QRs:

1. Ir a **Dashboard > Expo de Futuros Imposibles**
2. Seleccionar la Visión
3. Click en **"Imprimir QRs"**
4. Click en **"Descargar PDF"** 
5. Imprimir el PDF (cada negocio tiene su página)

### Información que ve el Coordinador:

| Métrica | Descripción |
|---------|-------------|
| **Total Participantes** | Número de participantes nivel PL |
| **Negocios Registrados** | Participantes con negocio configurado |
| **Total Reviews** | Calificaciones recibidas |
| **Promedio Estrellas** | Rating promedio de todos |
| **Visitantes Referidos** | Personas invitadas por participantes |

---

## URLs Importantes

| Página | URL |
|--------|-----|
| Votar por negocio | `/expo/votar/[userId]` |
| Catálogo de negocios | `/expo/catalogo/[visionId]` |
| Dashboard Coordinador | `/dashboard/coordinador/expo-futuros-imposibles` |
| Imprimir QRs | `/dashboard/coordinador/expo-futuros-imposibles/print-qrs` |

---

## Notas Técnicas

- Cada QR es único por participante (contiene su ID)
- El visitante se registra UNA vez y puede votar por múltiples negocios
- Las calificaciones son de 1 a 5 estrellas
- El sistema registra quién invitó a cada visitante para tracking de referidos

---

*Documentación actualizada: Marzo 2026*
