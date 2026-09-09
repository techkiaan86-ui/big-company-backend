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

    let totalTax = 0;
    const history = sales.map(sale => {
      let saleTax = 0;
      sale.saleItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        saleTax += calculateItemTax(item.price, item.quantity, tType);
      });
      totalTax += saleTax;

      return {
        id: sale.id,
        customerName: sale.consumerProfile?.fullName || 'Walk-in Customer',
        orderAmount: sale.totalAmount,
        taxPaid: Math.round(saleTax * 100) / 100,
        createdAt: sale.createdAt
      };
    });

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
    const sales = await prisma.sale.findMany({
      where: { status: { in: ['completed', 'pending_payment'] } },
      include: { saleItems: { include: { product: true } }, consumerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for safety
    });

    const orders = await prisma.order.findMany({
      where: { status: { in: ['completed', 'approved', 'delivered'] } },
      include: { orderItems: { include: { product: true } }, retailerProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for safety
    });

    let globalTotalTax = 0;
    const history: any[] = [];

    sales.forEach(sale => {
      let saleTax = 0;
      sale.saleItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        saleTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += saleTax;

      history.push({
        id: `SALE-${sale.id}`,
        customerName: sale.consumerProfile?.fullName || 'Walk-in Customer (Retail)',
        orderAmount: sale.totalAmount,
        taxPaid: Math.round(saleTax * 100) / 100,
        createdAt: sale.createdAt
      });
    });

    orders.forEach(order => {
      let orderTax = 0;
      order.orderItems.forEach(item => {
        const tType = item.product ? (item.product as any).taxType : 'A';
        orderTax += calculateItemTax(item.price, item.quantity, tType);
      });
      globalTotalTax += orderTax;

      history.push({
        id: `ORD-${order.id}`,
        customerName: order.retailerProfile?.shopName || 'Unknown Retailer (Wholesale)',
        orderAmount: order.totalAmount,
        taxPaid: Math.round(orderTax * 100) / 100,
        createdAt: order.createdAt
      });
    });

    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        totalOrders: sales.length + orders.length,
        totalTax: Math.round(globalTotalTax * 100) / 100,
        history: history.slice(0, 500)
      }
    });

  } catch (error: any) {
    console.error('getAdminTaxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin taxes' });
  }
};
