import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { reverseVATCalculation } from '../utils/pricingReversalUtils';

const prisma = new PrismaClient();

// Helper to calculate tax for an item
const calculateItemTax = (unitPrice: number, quantity: number, taxType: string | null): number => {
  const cleanTaxType = taxType || 'A'; // Default to 0% (Type A) — deleted products: tax unknown, safer to show 0
  const { totalTax } = reverseVATCalculation(unitPrice, cleanTaxType);
  return totalTax * quantity;
};

// RETAILER TAX VIEW
// Only shows the retailer's own sales to consumers.
// Purchase orders (retailer → wholesaler) are NOT shown here — those taxes belong to the wholesaler.
export const getRetailerTaxes = async (req: any, res: Response) => {
  try {
    const retailerId = Number(req.user.id);
    const retailer = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });

    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }

    const dateFilter = retailer.lastSettlementDate ? { gte: retailer.lastSettlementDate } : undefined;

    // Only retailer's sales to consumers — include 'pending' for USSD orders
    const sales = await prisma.sale.findMany({
      where: {
        retailerId: retailer.id,
        status: { in: ['completed', 'pending_payment', 'pending'] },
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        saleItems: { include: { product: true } },
        consumerProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalTax = 0;
    const history: any[] = [];

    sales.forEach(sale => {
      let saleTax = 0;
      sale.saleItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        saleTax += calculateItemTax(item.price, item.quantity, tType);
      });
      totalTax += saleTax;

      history.push({
        id: `SALE-${sale.id}`,
        customerName: sale.consumerProfile?.fullName || 'Walk-in Customer',
        orderAmount: sale.totalAmount,
        taxPaid: Math.round(saleTax * 100) / 100,
        type: 'Sale',
        createdAt: sale.createdAt
      });
    });

    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        totalOrders: sales.length,
        totalTax: Math.round(totalTax * 100) / 100,
        history
      }
    });

  } catch (error: any) {
    console.error('getRetailerTaxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch retailer taxes' });
  }
};


export const getWholesalerTaxes = async (req: any, res: Response) => {
  try {
    const wholesalerId = Number(req.user.id);
    const wholesaler = await prisma.wholesalerProfile.findUnique({ where: { userId: wholesalerId } });

    if (!wholesaler) {
      return res.status(404).json({ success: false, error: 'Wholesaler not found' });
    }

    const dateFilter = wholesaler.lastSettlementDate ? { gte: wholesaler.lastSettlementDate } : undefined;

    const orders = await prisma.order.findMany({
      where: {
        wholesalerId: wholesaler.id,
        status: { in: ['completed', 'approved', 'delivered'] },
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        orderItems: { include: { product: true } },
        retailerProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalTax = 0;
    const history = orders.map(order => {
      let orderTax = 0;
      order.orderItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        orderTax += calculateItemTax(item.price, item.quantity, tType);
      });
      totalTax += orderTax;

      return {
        id: order.id,
        customerName: order.retailerProfile?.shopName || 'Unknown Retailer',
        orderAmount: order.totalAmount,
        taxPaid: Math.round(orderTax * 100) / 100,
        createdAt: order.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalTax: Math.round(totalTax * 100) / 100,
        history
      }
    });

  } catch (error: any) {
    console.error('getWholesalerTaxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wholesaler taxes' });
  }
};

export const getAdminTaxes = async (req: any, res: Response) => {
  try {
    // Fetch all retailers and wholesalers with their settlement dates
    const allRetailers = await prisma.retailerProfile.findMany({
      select: { id: true, shopName: true, lastSettlementDate: true }
    });
    const allWholesalers = await prisma.wholesalerProfile.findMany({
      select: { id: true, companyName: true, lastSettlementDate: true }
    });

    const retailerSettlementMap = new Map(allRetailers.map(r => [r.id, r]));
    const wholesalerSettlementMap = new Map(allWholesalers.map(w => [w.id, w]));

    const sales = await prisma.sale.findMany({
      where: { status: { in: ['completed', 'pending_payment', 'pending'] } },
      include: { saleItems: { include: { product: true } }, consumerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    const orders = await prisma.order.findMany({
      where: { status: { in: ['completed', 'approved', 'delivered'] } },
      include: { orderItems: { include: { product: true } }, retailerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    let globalTotalTax = 0;
    let globalTotalOrders = 0;

    // RETAILER detail: only their sales to consumers (same as the retailer's own view)
    const retailersMap = new Map<number, any>();
    sales.forEach(sale => {
      const rId = sale.retailerId;
      const retailerInfo = retailerSettlementMap.get(rId);

      // Skip sales with no valid/known retailer profile — avoids "Unknown Retailer" ghost rows
      if (!retailerInfo) return;

      // Apply the same settlement date filter the retailer sees
      if (retailerInfo?.lastSettlementDate && sale.createdAt < retailerInfo.lastSettlementDate) {
        return;
      }

      let saleTax = 0;
      sale.saleItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        saleTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += saleTax;
      globalTotalOrders += 1;

      if (!retailersMap.has(rId)) {
          retailersMap.set(rId, {
              id: rId,
              name: retailerInfo?.shopName || 'Unknown Retailer',
              totalOrders: 0,
              totalTax: 0,
              history: []
          });
      }

      const retailerData = retailersMap.get(rId);
      retailerData.totalOrders += 1;
      retailerData.totalTax += saleTax;
      retailerData.history.push({
        id: `SALE-${sale.id}`,
        customerName: sale.consumerProfile?.fullName || 'Walk-in Customer (Retail)',
        orderAmount: sale.totalAmount,
        taxPaid: Math.round(saleTax * 100) / 100,
        createdAt: sale.createdAt
      });
    });

    // WHOLESALER detail: their orders received from retailers
    // Purchase orders are NOT added to the retailer's detail — they belong here only.
    const wholesalersMap = new Map<number, any>();
    orders.forEach(order => {
      const wId = order.wholesalerId;
      if (!wId) return;

      const wholesalerInfo = wholesalerSettlementMap.get(wId);

      if (wholesalerInfo?.lastSettlementDate && order.createdAt < wholesalerInfo.lastSettlementDate) {
        return;
      }

      let orderTax = 0;
      order.orderItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        orderTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += orderTax;
      globalTotalOrders += 1;

      if (!wholesalersMap.has(wId)) {
          wholesalersMap.set(wId, {
              id: wId,
              name: wholesalerInfo?.companyName || 'Unknown Wholesaler',
              totalOrders: 0,
              totalTax: 0,
              history: []
          });
      }

      const wholesalerData = wholesalersMap.get(wId);
      wholesalerData.totalOrders += 1;
      wholesalerData.totalTax += orderTax;
      wholesalerData.history.push({
        id: `ORD-${order.id}`,
        customerName: order.retailerProfile?.shopName || 'Unknown Retailer',
        orderAmount: order.totalAmount,
        taxPaid: Math.round(orderTax * 100) / 100,
        createdAt: order.createdAt
      });
    });

    const retailers = Array.from(retailersMap.values()).map(r => ({
        ...r,
        totalTax: Math.round(r.totalTax * 100) / 100,
        history: r.history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }));

    const wholesalers = Array.from(wholesalersMap.values()).map(w => ({
        ...w,
        totalTax: Math.round(w.totalTax * 100) / 100,
        history: w.history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }));

    res.json({
      success: true,
      data: {
        // Use filtered per-account count so the global total matches the sum of all individual rows
        totalOrders: globalTotalOrders,
        totalTax: Math.round(globalTotalTax * 100) / 100,
        retailers,
        wholesalers
      }
    });

  } catch (error: any) {
    console.error('getAdminTaxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin taxes', details: error.message, stack: error.stack });
  }
};
