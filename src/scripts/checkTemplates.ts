import prisma from '../utils/prisma';

async function main() {
  const templates = await (prisma as any).emailTemplate.findMany({
    select: { name: true, triggerName: true },
    orderBy: { name: 'asc' }
  });
  console.log('TOTAL IN DB:', templates.length);
  templates.forEach((t: any) => {
    console.log(t.name + ' | ' + (t.triggerName ?? 'NULL'));
  });
}

main().catch(console.error).finally(async () => {
  await (prisma as any).$disconnect();
});
