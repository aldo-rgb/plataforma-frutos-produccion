# 🛡️ GRANULAR CARTA APPROVAL SYSTEM - Implementation Guide

## Overview
Critical mentorship feedback loop enabling **item-level** approval/rejection instead of all-or-nothing carta validation.

---

## 1. Database Schema Updates

### ✅ COMPLETED - Existing Schema Analysis
The database **already has** extensive granular approval tracking:

**CartaFrutos Model:**
- Each area (finanzas, salud, relaciones, etc.) has:
  - `{area}IdentityStatus`, `{area}IdentityFeedback` 
  - `{area}MetaStatus`, `{area}MetaFeedback`
  - `{area}ActionsStatus`, `{area}ActionsFeedback`

**EstadoCarta Enum:**
```prisma
enum EstadoCarta {
  BORRADOR
  EN_REVISION
  CAMBIOS_REQUERIDOS  // ← Added for partial rejection
  APROBADA
  RECHAZADA
}
```

**EstadoItem Enum (NEW):**
```prisma
enum EstadoItem {
  PENDING
  APPROVED
  REJECTED
}
```

**Meta Model:**
- `status`: EstadoItem
- `mentorFeedback`: String (rejection reason)

---

## 2. Business Logic (carta-approval-logic.ts)

### Core Function: `isFieldEditable()`
```typescript
/**
 * RULES:
 * 1. APROBADA → Nothing editable (locked forever)
 * 2. EN_REVISION → User must wait
 * 3. CAMBIOS_REQUERIDOS → Only REJECTED items editable
 * 4. BORRADOR → Everything editable
 */
```

### Status Calculation: `calculateCartaStatusAfterReview()`
```typescript
// After mentor reviews all items:
- If ALL → APPROVED: carta.estado = 'APROBADA'
- If ANY → REJECTED: carta.estado = 'CAMBIOS_REQUERIDOS'
- Otherwise: carta.estado = 'EN_REVISION' (pending)
```

### Visual Helpers:
- `getFieldStatusClass()` → CSS classes based on status
- `getStatusIndicator()` → Icons (✅ ❌ ⏳)
- `getCartaStatusMessage()` → User-facing banner text

---

## 3. API Endpoint: `/api/carta/review` (UPDATED)

### Request Body:
```typescript
{
  cartaId: number,
  reviews: {
    declarations?: {
      finanzas?: { status: 'APPROVED' | 'REJECTED', feedback?: string },
      salud?: { status: 'APPROVED' | 'REJECTED', feedback?: string },
      // ... other areas
    },
    metas?: [
      { metaId: number, status: 'APPROVED' | 'REJECTED', feedback?: string }
    ]
  }
}
```

### Response:
```typescript
{
  success: true,
  newStatus: 'CAMBIOS_REQUERIDOS',  // or 'APROBADA'
  summary: {
    approved: 5,
    rejected: 2,
    pending: 1
  }
}
```

### Logic Flow:
1. Verify mentor permissions
2. Update individual item statuses + feedback
3. Collect all statuses (reviewed + existing)
4. Calculate final carta estado
5. Update carta record
6. Notify user if changes requested

---

## 4. Frontend Component: `GranularCartaEditor.tsx`

### Features:
- **Global Status Banner**: Shows carta state with color-coded alerts
- **Conditional Rendering**:
  - **Approved items**: 
    - Read-only with 🔒 lock icon
    - Green border, faded background
  - **Rejected items**: 
    - Red border with ⚠️ alert
    - Shows mentor feedback bubble
    - Editable textarea
  - **Pending items**: Yellow/neutral styling

### User Actions:
- Edit button (only for rejected or draft items)
- Inline save/cancel for each field
- "Resubmit for Review" button (only visible when rejected items fixed)

---

## 5. Mentor Review UI (TO BE IMPLEMENTED)

### Required Component: `MentorCartaReviewPanel.tsx`

```typescript
interface ReviewPanel {
  cartaId: number;
  declarations: Array<{
    key: string;
    label: string;
    value: string;
    currentStatus: EstadoItem;
  }>;
  metas: Array<{
    metaId: number;
    categoria: string;
    texto: string;
    currentStatus: EstadoItem;
  }>;
}
```

### UI Requirements:
For each item:
- [ ] ✅ Approve button
- [ ] ❌ Reject button (opens feedback modal)
- [ ] Visual indicator of current status
- [ ] Feedback textarea (mandatory on reject)

Final action:
- [ ] "Submit Review" button → calls `/api/carta/review`
- [ ] Shows summary: X approved, Y rejected
- [ ] Displays final carta status change

---

## 6. User Dashboard Integration

### Status Banner Examples:

**BORRADOR:**
```
📝 Tu carta está en modo borrador
→ Completa y envía para revisión
```

**EN_REVISION:**
```
⏳ Tu carta está siendo revisada por tu mentor
→ Espera la retroalimentación
```

**CAMBIOS_REQUERIDOS:**
```
🔧 Tu mentor requiere cambios en algunos puntos
→ Edita los campos marcados en rojo
[Resubmit Button]
```

**APROBADA:**
```
🎉 ¡Tu carta ha sido aprobada!
→ Versión autorizada - Sin cambios permitidos
```

---

## 7. Implementation Checklist

### Backend:
- [x] Update Prisma schema (EstadoItem enum, Meta.status fields)
- [x] Add CAMBIOS_REQUERIDOS to EstadoCarta enum
- [x] Create carta-approval-logic.ts utility
- [x] Update /api/carta/review endpoint
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Update /api/carta/submit to reset statuses on resubmit
- [ ] Add notification trigger for CAMBIOS_REQUERIDOS

### Frontend:
- [x] Create GranularCartaEditor.tsx component
- [ ] Create MentorCartaReviewPanel.tsx component
- [ ] Update wizard to use GranularCartaEditor
- [ ] Update mentor dashboard to use review panel
- [ ] Add status badges to carta list views
- [ ] Implement "isDirty" tracking for rejected fields

### Testing:
- [ ] Mentor approves all items → carta APROBADA
- [ ] Mentor rejects 1 item → carta CAMBIOS_REQUERIDOS
- [ ] User can only edit rejected fields
- [ ] User cannot edit after APROBADA
- [ ] User sees mentor feedback on rejected items
- [ ] Resubmit button only shows after fixing rejected items

---

## 8. Migration Path

### For Existing Cartas:
```sql
-- Set default status for existing declarations
UPDATE "CartaFrutos" 
SET 
  "finanzasDeclaracionStatus" = 'PENDING',
  "saludDeclaracionStatus" = 'PENDING',
  ... (all 8 areas)
WHERE "estado" = 'BORRADOR';

-- Mark approved cartas
UPDATE "CartaFrutos"
SET (all area statuses) = 'APPROVED'
WHERE "estado" = 'APROBADA';
```

---

## 9. User Flow Diagram

```
[User Creates Carta] → BORRADOR
         ↓
[User Submits] → EN_REVISION (all items PENDING)
         ↓
[Mentor Reviews Each Item]
         ↓
    ┌────┴────┐
    ↓         ↓
[ALL OK]  [SOME REJECTED]
    ↓         ↓
APROBADA  CAMBIOS_REQUERIDOS
  (locked)     ↓
         [User Edits Rejected]
               ↓
         [Resubmit] → EN_REVISION
               ↓
         [Repeat Until APROBADA]
```

---

## 10. Key Benefits

✅ **Iteration Speed**: Users fix only what's wrong, not redo entire carta
✅ **Clear Communication**: Mentor feedback attached to specific items
✅ **Data Integrity**: Approved sections locked, preventing accidental changes
✅ **User Experience**: Visual semaphore system (green/yellow/red)
✅ **Accountability**: Tracks who approved/rejected each item

---

## Next Steps

1. **Run Migration**: Execute Prisma migration to add new fields
2. **Build Mentor UI**: Create review panel with approve/reject buttons
3. **Test Workflow**: Full cycle from submission → rejection → resubmit → approval
4. **Deploy**: Push to production with migration rollback plan

---

**Status**: 🟡 **70% Complete** - Core logic ready, UI implementation pending
