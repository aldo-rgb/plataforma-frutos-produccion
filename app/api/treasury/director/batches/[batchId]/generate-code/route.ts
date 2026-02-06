import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const DIRECTOR_ROLES = ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'];

// Palabras de mecánica cuántica y estrellas para códigos de confirmación
const QUANTUM_WORDS = [
  // Mecánica Cuántica
  'QUARK', 'PHOTON', 'NEUTRINO', 'BOSON', 'FERMION', 'GLUON', 'LEPTON', 'MUON',
  'HADRON', 'MESON', 'PLANCK', 'HEISENBERG', 'SCHRODINGER', 'DIRAC', 'PAULI',
  'QUANTUM', 'SPIN', 'ENTANGLE', 'SUPERPOS', 'WAVEFUNC', 'EIGENSTATE', 'ORBITAL',
  'TUNNELING', 'DECOHERE', 'COHERENT', 'COLLAPSE', 'OBSERVE', 'UNCERTAINTY',
  'DUALITY', 'ANTIMATTER', 'POSITRON', 'ELECTRON', 'PROTON', 'NEUTRON',
  // Estrellas y Cosmos
  'NEBULA', 'PULSAR', 'QUASAR', 'SUPERNOVA', 'BLACKHOLE', 'NEUTRONSTAR',
  'REDGIANT', 'WHITEDWARF', 'STARDUST', 'COSMOS', 'GALAXY', 'ANDROMEDA',
  'ORION', 'SIRIUS', 'VEGA', 'POLARIS', 'BETELGEUSE', 'RIGEL', 'ARCTURUS',
  'ALDEBARAN', 'ANTARES', 'CANOPUS', 'PROXIMA', 'STELLAR', 'CELESTIAL',
  'AURORA', 'ECLIPSE', 'SOLARIS', 'LUNAR', 'METEOR', 'COMET', 'ASTEROID',
  'PLASMA', 'FUSION', 'CORONA', 'HELIO', 'ZENITH', 'NADIR', 'EQUINOX',
  'LIGHTYEAR', 'PARSEC', 'HORIZON', 'INFINITY', 'VOID', 'ABYSS', 'SINGULARITY'
];

// Genera un código usando palabras cuánticas/estelares
function generateConfirmationCode(): string {
  const word = QUANTUM_WORDS[Math.floor(Math.random() * QUANTUM_WORDS.length)];
  // Agregar un número aleatorio de 2 dígitos para hacerlo único
  const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${word}${number}`;
}

/**
 * POST /api/treasury/director/batches/[batchId]/generate-code
 * Director genera código de confirmación después de revisar todas las evidencias
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || !DIRECTOR_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Solo directores pueden generar códigos' }, { status: 403 });
    }

    // Obtener el batch con sus gastos
    const batch = await prisma.cashBatch.findUnique({
      where: { id: batchId },
      include: {
        expenses: {
          select: {
            id: true,
            receiptUrl: true,
            concept: true
          }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 });
    }

    if (batch.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso a este corte' }, { status: 403 });
    }

    if (batch.status !== 'PENDING_DELIVERY') {
      return NextResponse.json({ error: 'Este corte ya fue procesado' }, { status: 400 });
    }

    if (batch.confirmationCode) {
      return NextResponse.json({ 
        error: 'Ya se generó un código para este corte',
        confirmationCode: batch.confirmationCode 
      }, { status: 400 });
    }

    // Verificar que todos los gastos tengan evidencia
    const expensesWithoutEvidence = batch.expenses.filter(e => !e.receiptUrl);
    if (expensesWithoutEvidence.length > 0) {
      return NextResponse.json({ 
        error: `Hay ${expensesWithoutEvidence.length} gasto(s) sin evidencia. Debes revisar todas las evidencias antes de generar el código.`,
        expensesWithoutEvidence: expensesWithoutEvidence.map(e => e.concept)
      }, { status: 400 });
    }

    // Generar código único
    const confirmationCode = generateConfirmationCode();

    // Actualizar el batch con el código
    const updatedBatch = await prisma.cashBatch.update({
      where: { id: batchId },
      data: {
        confirmationCode,
        codeGeneratedAt: new Date(),
        codeGeneratedById: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Código de confirmación generado',
      confirmationCode,
      batchNumber: updatedBatch.batchNumber
    });

  } catch (error: any) {
    logger.error('Error generating confirmation code:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al generar código' },
      { status: 500 }
    );
  }
}
