import prisma from './src/utils/prisma';

async function cleanGasMeters() {
  try {
    const res = await prisma.gasMeter.deleteMany({
      where: { status: 'removed' }
    });
    console.log(`Deleted ${res.count} removed gas meters.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanGasMeters().then(() => process.exit(0));
