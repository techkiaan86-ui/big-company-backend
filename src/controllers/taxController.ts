import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { reverseVATCalculation } from '../utils/pricingReversalUtils';

const prisma = new PrismaClient();

// Helper to calculate tax for an item
const calculateItemTax = (unitPrice: number, quantity: number, taxType: string | null): number => {
  const cleanTaxType = taxType || 'A'; // Default to 0% (Type A) for unknown/deleted products
  const { totalTax } = reverseVATCalculation(unitPrice, cleanTaxType);
  return totalTax * quantity;
};

export const getRetailerTaxes = async (req: any, res: Response) => {
  try {
    const retailerId = Number(req.user.id);
    const retailer = await prisma.retailerProfile.findUnique({ where: { userId: retailerId } });

    if (!retailer) {
      return res.status(404).json({ success: false, error: 'Retailer not found' });
    }

    const dateFilter = retailer.lastSettlementDate ? { gte: retailer.lastSettlementDate } : undefined;

    // Retailer's sales to consumers
    const sales = await prisma.sale.findMany({
      where: {
        retailerId: retailer.id,
        status: { in: ['completed', 'pending_payment'] },
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        saleItems: { include: { product: true } },
        consumerProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Retailer's purchase orders from wholesalers (the "manufacturing/replace orders" the client mentioned)
    const purchaseOrders = await prisma.order.findMany({
      where: {
        retailerId: retailer.id,
        status: { in: ['completed', 'approved', 'delivered'] },
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        orderItems: { include: { product: true } },
        wholesalerProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalTax = 0;
    const history: any[] = [];

    // Process sales tax
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

    // Process purchase orders tax
    purchaseOrders.forEach(order => {
      let orderTax = 0;
      order.orderItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        orderTax += calculateItemTax(item.price, item.quantity, tType);
      });
      totalTax += orderTax;

      history.push({
        id: `ORD-${order.id}`,
        customerName: order.wholesalerProfile?.companyName || 'Unknown Wholesaler',
        orderAmount: order.totalAmount,
        taxPaid: Math.round(orderTax * 100) / 100,
        type: 'Purchase Order',
        createdAt: order.createdAt
      });
    });

    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        totalOrders: sales.length + purchaseOrders.length,
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
    const sales = await prisma.sale.findMany({
      where: { status: { in: ['completed', 'pending_payment'] } },
      include: { saleItems: { include: { product: true } }, consumerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for safety
    });

    const orders = await prisma.order.findMany({
      where: { status: { in: ['completed', 'approved', 'delivered'] } },
      include: { orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for safety
    });

    // Manually fetch profiles to avoid Prisma crashing on deleted relations
    const retailerIds = [...new Set([...sales.map(s => s.retailerId), ...orders.map(o => o.retailerId)].filter(Boolean))];
    const wholesalerIds = [...new Set(orders.map(o => o.wholesalerId).filter(Boolean))];

    const retailersData = await prisma.retailerProfile.findMany({
      where: { id: { in: retailerIds } }
    });
    const wholesalersData = await prisma.wholesalerProfile.findMany({
      where: { id: { in: wholesalerIds } }
    });

    const retailerMapDb = new Map(retailersData.map(r => [r.id, r]));
    const wholesalerMapDb = new Map(wholesalersData.map(w => [w.id, w]));

    let globalTotalTax = 0;
    
    const retailersMap = new Map<number, any>();
    sales.forEach(sale => {
      let saleTax = 0;
      sale.saleItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        saleTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += saleTax;
      
      const rId = sale.retailerId;
      if (!retailersMap.has(rId)) {
          retailersMap.set(rId, {
              id: rId,
              name: retailerMapDb.get(rId)?.shopName || 'Unknown Retailer',
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

    const wholesalersMap = new Map<number, any>();
    orders.forEach(order => {
      let orderTax = 0;
      order.orderItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        orderTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += orderTax;

      const wId = order.wholesalerId;
      if (!wId) return; // skip orders not linked to a wholesaler
      if (!wholesalersMap.has(wId)) {
          wholesalersMap.set(wId, {
              id: wId,
              name: wholesalerMapDb.get(wId)?.companyName || 'Unknown Wholesaler',
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
        customerName: retailerMapDb.get(order.retailerId)?.shopName || 'Unknown Retailer (Wholesale)',
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
        totalOrders: sales.length + orders.length,
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
