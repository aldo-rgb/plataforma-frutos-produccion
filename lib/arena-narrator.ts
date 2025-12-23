/**
 * 🤖 QUANTUM CASTER - Narrador IA para Duelos
 * Genera narrativas épicas basadas en el desempeño diario
 */

interface NarrationContext {
  myHP: number;
  rivalHP: number;
  myDamage: number;
  rivalDamage: number;
  myName: string;
  rivalName: string;
  daysRemaining: number;
}

/**
 * Generar narración épica del día
 */
export function generateNarration(context: NarrationContext): string {
  const { myHP, rivalHP, myDamage, rivalDamage, myName, rivalName, daysRemaining } = context;

  // Caso 1: Ambos fallaron (Doble daño)
  if (myDamage > 0 && rivalDamage > 0) {
    return `💥 ¡Ambos guerreros caen! Ni ${myName} ni ${rivalName} cumplieron ayer. Este duelo está descontrolado. Solo quedan ${daysRemaining} días.`;
  }

  // Caso 2: Solo yo fallé
  if (myDamage > 0) {
    if (rivalHP > myHP + 30) {
      return `⚠️ ¡CUIDADO! ${rivalName} es una máquina. Tropezaste ayer (-${myDamage} HP) y ahora lideras con ${rivalHP - myHP} HP de ventaja. ¡Recupera terreno HOY o pierdes tu apuesta!`;
    } else {
      return `⚔️ ${rivalName} aprovechó tu error. Fallaste ayer y perdiste ${myDamage} HP. La batalla está reñida. No vuelvas a fallar.`;
    }
  }

  // Caso 3: Solo el rival falló
  if (rivalDamage > 0) {
    if (myHP > rivalHP + 30) {
      return `🔥 ¡DOMINACIÓN TOTAL! ${rivalName} cayó ayer (-${rivalDamage} HP). Su botín de PC ya casi es tuyo. Mantén la presión, quedan ${daysRemaining} días.`;
    } else {
      return `💪 Bien hecho. ${rivalName} tropezó ayer mientras tú cumpliste. Lideras por ${myHP - rivalHP} HP. No bajes la guardia.`;
    }
  }

  // Caso 4: Ambos cumplieron (Empate)
  const hpDiff = Math.abs(myHP - rivalHP);
  if (hpDiff < 10) {
    return `⚡ Choque de titanes. Ambos cumplieron ayer. ${myHP} HP vs ${rivalHP} HP. El primero que parpadee, pierde.`;
  } else if (myHP > rivalHP) {
    return `🛡️ Sólido desempeño. Ambos cumplieron, pero tú lideras por ${hpDiff} HP. ${rivalName} está sintiendo la presión.`;
  } else {
    return `🎯 ${rivalName} lleva ventaja de ${hpDiff} HP aunque ambos cumplieron. Necesitas un golpe crítico para voltear el duelo.`;
  }
}

/**
 * Prompt para GPT-4 (futuro)
 * Cuando quieras integrar OpenAI API
 */
export function getQuantumPrompt(context: NarrationContext): string {
  return `Eres QUANTUM, el narrador épico de duelos 1v1 en una plataforma de productividad.

CONTEXTO DEL DUELO:
- ${context.myName} tiene ${context.myHP} HP
- ${context.rivalName} tiene ${context.rivalHP} HP
- Ayer, ${context.myName} ${context.myDamage > 0 ? `FALLÓ y perdió ${context.myDamage} HP` : 'CUMPLIÓ todas sus tareas'}
- Ayer, ${context.rivalName} ${context.rivalDamage > 0 ? `FALLÓ y perdió ${context.rivalDamage} HP` : 'CUMPLIÓ todas sus tareas'}
- Quedan ${context.daysRemaining} días de duelo

INSTRUCCIONES:
- Genera UNA sola frase (máximo 2 líneas)
- Tono: Urgente, épico, como comentarista de MMA
- Si ${context.myName} va perdiendo: Advertencia + motivación
- Si ${context.myName} va ganando: Congratulación + mantén presión
- Si empate: Tensión máxima, "el primero que parpadee pierde"
- Menciona los PC en juego (${context.myHP + context.rivalHP} PC totales)

GENERA LA NARRACIÓN:`;
}

/**
 * Emojis según el estado del duelo
 */
export function getDuelEmoji(myHP: number, rivalHP: number): string {
  const diff = myHP - rivalHP;
  
  if (diff > 30) return '🔥'; // Dominando
  if (diff > 15) return '💪'; // Ventaja
  if (diff >= -15) return '⚔️'; // Empate
  if (diff >= -30) return '⚠️'; // Desventaja
  return '💀'; // Peligro crítico
}
