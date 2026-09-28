import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class PaymentRepository {
  static async createOrder(data: {
    userId: string;
    orderId: string;
    amount: number;
    currency?: string;
    plan: string;
    status?: string;
  }) {
    const id = generateObjectId();
    const payment = await prisma.payment.create({
      data: {
        id,
        userId: String(data.userId),
        orderId: data.orderId,
        providerPaymentId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        planName: data.plan,
        status: data.status || 'PENDING',
      },
    });
    return toClient(payment);
  }

  static async findByOrderId(orderId: string) {
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      include: { user: true },
    });
    return toClient(payment);
  }

  static async verifyPayment(orderId: string, paymentId: string, signature: string) {
    const payment = await prisma.payment.updateMany({
      where: { orderId },
      data: {
        paymentId,
        razorpaySignature: signature,
        status: 'SUCCESS',
      },
    });
    return payment.count > 0;
  }

  static async getUserPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return toClientArray(payments);
  }
}
