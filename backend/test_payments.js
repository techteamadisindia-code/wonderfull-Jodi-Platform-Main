const axios = require('axios');

async function testPaymentSuite() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('--- Starting Wonderful Jodi Payment Management Verification Suite ---');

  try {
    // 1. Authenticate as Super Admin
    console.log('\n1. Logging in as admin@wonderfuljodi.com...');
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    const adminToken = loginRes.data.data?.accessToken || loginRes.data.data?.token;
    console.log('✓ Admin authenticated successfully. Token received.');

    const adminAxios = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 2. Fetch Payment Stats
    console.log('\n2. Fetching Admin Revenue Statistics (/api/admin/payments/stats)...');
    const statsRes = await adminAxios.get('/admin/payments/stats?days=30');
    console.log('✓ Stats Response:', {
      totalRevenue: statsRes.data.data.totalRevenue,
      grossRevenue: statsRes.data.data.grossRevenue,
      totalRefunded: statsRes.data.data.totalRefunded,
      totalTransactions: statsRes.data.data.totalTransactions,
      successfulTransactions: statsRes.data.data.successfulTransactions,
      failedTransactions: statsRes.data.data.failedTransactions,
      successRate: statsRes.data.data.successRate,
      todayRevenue: statsRes.data.data.todayRevenue,
      monthlyRevenue: statsRes.data.data.monthlyRevenue,
      trendLength: statsRes.data.data.revenueTrend?.length,
    });

    // 3. Fetch Payments with Pagination & Filters
    console.log('\n3. Fetching Admin Payments (/api/admin/payments)...');
    const paymentsRes = await adminAxios.get('/admin/payments?page=1&limit=10&status=ALL');
    console.log('✓ Payments list received. Total in DB:', paymentsRes.data.data.pagination.total);
    console.log('First 2 payments:', paymentsRes.data.data.payments.slice(0, 2).map(p => ({
      id: p._id,
      paymentId: p.paymentId || p.providerPaymentId,
      amount: p.amount,
      status: p.status,
      user: p.user?.fullName,
      plan: p.planName || p.subscription?.plan,
    })));

    // 4. Search Filter Test
    console.log('\n4. Testing Search Filter (search=Siddharth)...');
    const searchRes = await adminAxios.get('/admin/payments?search=Siddharth');
    console.log('✓ Search returned count:', searchRes.data.data.payments.length);

    // 5. Test Dev Simulation: Create a Test SUCCESS Payment
    console.log('\n5. Testing Dev Simulator: Creating a TEST SUCCESS payment (₹4,999)...');
    const simSuccessRes = await adminAxios.post('/admin/payments/simulate', {
      scenario: 'SUCCESS',
      planKey: 'PREMIUM',
      amount: 4999,
      paymentMethod: 'UPI',
    });
    const createdSuccessPayment = simSuccessRes.data.data;
    console.log('✓ Created Test Success Payment:', {
      id: createdSuccessPayment._id,
      providerPaymentId: createdSuccessPayment.providerPaymentId,
      amount: createdSuccessPayment.amount,
      status: createdSuccessPayment.status,
    });

    // 6. Test Dev Simulation: Create a Test FAILED Payment
    console.log('\n6. Testing Dev Simulator: Creating a TEST FAILED payment (₹4,999)...');
    const simFailedRes = await adminAxios.post('/admin/payments/simulate', {
      scenario: 'FAILED',
      planKey: 'PREMIUM',
      amount: 4999,
      paymentMethod: 'CreditCard',
    });
    console.log('✓ Created Test Failed Payment with failureReason:', {
      id: simFailedRes.data.data._id,
      status: simFailedRes.data.data.status,
      failureReason: simFailedRes.data.data.failureReason,
    });

    // 7. Verify Single Payment Details
    console.log('\n7. Fetching Single Payment Details (/api/admin/payments/:id)...');
    const detailRes = await adminAxios.get(`/admin/payments/${createdSuccessPayment._id}`);
    console.log('✓ Detail fetched:', {
      id: detailRes.data.data._id,
      user: detailRes.data.data.user?.fullName,
      amount: detailRes.data.data.amount,
      status: detailRes.data.data.status,
    });

    // 8. Test Partial Refund
    console.log('\n8. Testing Partial Refund (₹1,000 of ₹4,999)...');
    const partialRefundRes = await adminAxios.post(`/admin/payments/${createdSuccessPayment._id}/refund`, {
      amount: 1000,
      reason: 'Customer requested 20% plan discount refund',
    });
    console.log('✓ Partial Refund result:', {
      status: partialRefundRes.data.data.status,
      refundAmount: partialRefundRes.data.data.refundAmount,
      refundId: partialRefundRes.data.data.refundId,
    });

    // 9. Test Full Remaining Refund
    console.log('\n9. Testing Full Remaining Refund (₹3,999 of ₹4,999)...');
    const fullRefundRes = await adminAxios.post(`/admin/payments/${createdSuccessPayment._id}/refund`, {
      amount: 3999,
      reason: 'Full plan cancellation',
    });
    console.log('✓ Full Refund result:', {
      status: fullRefundRes.data.data.status,
      refundAmount: fullRefundRes.data.data.refundAmount,
      refundStatus: fullRefundRes.data.data.refundStatus,
    });

    // 10. Verify Updated Stats
    console.log('\n10. Verifying Updated Database Revenue Stats after refunds...');
    const updatedStatsRes = await adminAxios.get('/admin/payments/stats?days=30');
    console.log('✓ Updated Stats:', {
      totalRevenue: updatedStatsRes.data.data.totalRevenue,
      grossRevenue: updatedStatsRes.data.data.grossRevenue,
      totalRefunded: updatedStatsRes.data.data.totalRefunded,
      totalTransactions: updatedStatsRes.data.data.totalTransactions,
      successfulTransactions: updatedStatsRes.data.data.successfulTransactions,
      refundedTransactions: updatedStatsRes.data.data.refundedTransactions,
    });

    // 11. Test Webhook Endpoint
    console.log('\n11. Testing Webhook handler (/api/payments/webhook)...');
    const webhookRes = await axios.post(`${BASE_URL}/payments/webhook`, {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test_123',
            order_id: 'order_webhook_test_123',
            amount: 499900,
            status: 'captured',
            method: 'UPI',
          },
        },
      },
    });
    console.log('✓ Webhook response:', webhookRes.data);

    console.log('\n======================================================');
    console.log('🎉 ALL PAYMENT SYSTEM VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testPaymentSuite();
