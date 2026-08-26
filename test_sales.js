const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const sales = await prisma.sale.findMany({ include: { saleItems: true } }); 
  console.log('Total sales:', sales.length); 
  let total = 0; 
  let retailerTotals = {}; 
  sales.forEach(s => { 
    if (s.status === 'cancelled') return; 
    let saleTotal = 0; 
    (s.saleItems || []).forEach(i => saleTotal += (i.price || 0) * (i.quantity || 0)); 
    total += saleTotal; 
    retailerTotals[s.retailerId] = (retailerTotals[s.retailerId] || 0) + saleTotal; 
  }); 
  console.log('Total Revenue:', total); 
  console.log('By Retailer:', retailerTotals); 

  // Wait, let's also query what retailerProfile has id
  const retailers = await prisma.retailerProfile.findMany();
  console.log('Retailers:', retailers.map(r => ({ id: r.id, name: r.shopName })));
} 
main().finally(() => prisma.$disconnect());
