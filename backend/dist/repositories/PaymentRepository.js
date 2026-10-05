"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const client_1 = require("../db/client");
class PaymentRepository {
    static async createOrder(data) {
        const id = (0, client_1.generateObjectId)();
        const payment = await client_1.prisma.payment.create({
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
        return (0, client_1.toClient)(payment);
    }
    static async findByOrderId(orderId) {
        const payment = await client_1.prisma.payment.findFirst({
            where: { orderId },
            include: { user: true },
        });
        return (0, client_1.toClient)(payment);
    }
    static async verifyPayment(orderId, paymentId, _signature) {
        const payment = await client_1.prisma.payment.updateMany({
            where: { orderId },
            data: {
                paymentId,
                status: 'SUCCESS',
            },
        });
        return payment.count > 0;
    }
    static async getUserPayments(userId) {
        const payments = await client_1.prisma.payment.findMany({
            where: { userId: String(userId) },
            orderBy: { createdAt: 'desc' },
        });
        return (0, client_1.toClientArray)(payments);
    }
}
exports.PaymentRepository = PaymentRepository;
//# sourceMappingURL=PaymentRepository.js.map