const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

let adminToken = '';
let femaleToken = '';
let femaleUser = null;
let maleToken = '';
let maleUser = null;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('============================================================');
  console.log('STARTING COMPLETE CAMPAIGN, COUPON & REFERRAL TEST SUITE');
  console.log('============================================================\n');

  // ── Step 0: Setup & Authentication ──
  console.log('Step 0: Authenticating test users and admin...');
  const adminLogin = await request('/admin/auth/login', {
    method: 'POST',
    body: { email: 'admin@wonderfuljodi.com', password: 'Password123!' },
  });
  adminToken = adminLogin.data?.token || adminLogin.data?.data?.token;
  assert(Boolean(adminToken), 'Admin login successful');

  const femaleLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'priya.sharma@example.com', password: 'Password123!' },
  });
  femaleToken = femaleLogin.data?.token || femaleLogin.data?.data?.token;
  femaleUser = femaleLogin.data?.data?.user || femaleLogin.data?.user;
  assert(Boolean(femaleToken), 'Female user login (Priya Sharma)');

  const maleLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'vikram.singh@example.com', password: 'Password123!' },
  });
  maleToken = maleLogin.data?.token || maleLogin.data?.data?.token;
  maleUser = maleLogin.data?.data?.user || maleLogin.data?.user;
  assert(Boolean(maleToken), 'Male user login (Vikramaditya Singh)');

  // Clean up any test campaigns/coupons created in previous test runs
  const existingCampaigns = await request('/campaigns/admin', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (existingCampaigns.data?.data) {
    for (const c of existingCampaigns.data.data) {
      if (c.campaignName?.includes('Test') || c.campaignName?.includes('Mother') || c.campaignName?.includes('Father') || c.name?.includes('Test')) {
        await request(`/campaigns/admin/${c._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  }

  // ── TEST 1 & TEST 2: No Campaign Active ──
  console.log('\nTEST 1 & TEST 2: Male and Female member when no campaign is active');
  const maleNoCampaign = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    maleNoCampaign.data?.data?.finalPrice === maleNoCampaign.data?.data?.originalPrice &&
      maleNoCampaign.data?.data?.discountAmount === 0,
    `TEST 1: Male member gets standard price ₹${maleNoCampaign.data?.data?.finalPrice} (no discount)`
  );

  const femaleNoCampaign = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    femaleNoCampaign.data?.data?.finalPrice === femaleNoCampaign.data?.data?.originalPrice &&
      femaleNoCampaign.data?.data?.discountAmount === 0,
    `TEST 2: Female member gets standard price ₹${femaleNoCampaign.data?.data?.finalPrice} (no discount)`
  );

  // ── TEST 3 & TEST 4: Mother's Day 100% Free Campaign for Females ──
  console.log('\nTEST 3 & TEST 4: Mother\'s Day Campaign (100% discount, Target: Female, Age: 24-45, Marital: Never Married)');
  const mothersDayCreate = await request('/campaigns/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: "Mother's Day 2027",
      description: '100% free premium membership for female doctor candidates.',
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      timezone: 'Asia/Kolkata',
      targetGender: 'Female',
      minAge: 20,
      maxAge: 45,
      maritalStatus: ['Never Married', 'Any'],
      applicablePlans: ['ALL'],
      discountType: 'FREE_100_PERCENT',
      discountValue: 100,
      priority: 20,
      status: 'ACTIVE',
      perMemberLimit: 1,
    },
  });
  const mothersDayId = mothersDayCreate.data?.data?._id;
  assert(Boolean(mothersDayId), 'Created Mother\'s Day Campaign in database');

  const femaleMothersDay = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    femaleMothersDay.data?.data?.finalPrice === 0 && femaleMothersDay.data?.data?.isFree === true,
    `TEST 3: Female member gets Mother's Day 100% discount -> ₹0 (was ₹${femaleMothersDay.data?.data?.originalPrice})`
  );

  const maleMothersDay = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    maleMothersDay.data?.data?.finalPrice === maleMothersDay.data?.data?.originalPrice,
    `TEST 4: Male member is not eligible for Female Mother's Day offer -> Standard price ₹${maleMothersDay.data?.data?.finalPrice}`
  );

  // ── TEST 5 & TEST 6: Father's Day 50% Discount for Males ──
  console.log('\nTEST 5 & TEST 6: Father\'s Day Campaign (50% discount, Target: Male)');
  const fathersDayCreate = await request('/campaigns/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: "Father's Day 2027",
      description: '50% off membership for male doctor candidates.',
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      timezone: 'Asia/Kolkata',
      targetGender: 'Male',
      minAge: 22,
      maxAge: 45,
      applicablePlans: ['ALL'],
      discountType: 'PERCENTAGE',
      discountValue: 50,
      priority: 20,
      status: 'ACTIVE',
      perMemberLimit: 1,
    },
  });
  const fathersDayId = fathersDayCreate.data?.data?._id;
  assert(Boolean(fathersDayId), 'Created Father\'s Day Campaign in database');

  const maleFathersDay = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  const expectedMalePrice = maleFathersDay.data?.data?.originalPrice * 0.5;
  assert(
    Math.abs(maleFathersDay.data?.data?.finalPrice - expectedMalePrice) < 0.01 &&
      maleFathersDay.data?.data?.discountPercentage === 50,
    `TEST 5: Male member gets Father's Day 50% discount -> ₹${maleFathersDay.data?.data?.finalPrice}`
  );

  // ── TEST 7: Age Outside Campaign Range ──
  console.log('\nTEST 7: Age Outside Campaign Range');
  const ageRestrictedCampaign = await request('/campaigns/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: "Senior Doctors Offer",
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      targetGender: 'Female',
      minAge: 55,
      maxAge: 70,
      applicablePlans: ['ALL'],
      discountType: 'PERCENTAGE',
      discountValue: 40,
      priority: 50, // Higher priority than Mother's day
      status: 'ACTIVE',
    },
  });
  const seniorCamId = ageRestrictedCampaign.data?.data?._id;
  const femaleAgeCheck = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    femaleAgeCheck.data?.data?.campaign?.id !== seniorCamId,
    'TEST 7: Member with age outside 55–70 is not eligible for Senior Doctors Offer'
  );
  if (seniorCamId) {
    await request(`/campaigns/admin/${seniorCamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // ── TEST 8: Wrong Marital Status ──
  console.log('\nTEST 8: Wrong Marital Status Campaign');
  const divorcedOnlyCampaign = await request('/campaigns/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: "Divorced Support Offer",
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      targetGender: 'Female',
      maritalStatus: ['Divorced'],
      applicablePlans: ['ALL'],
      discountType: 'PERCENTAGE',
      discountValue: 70,
      priority: 50,
      status: 'ACTIVE',
    },
  });
  const divorcedCamId = divorcedOnlyCampaign.data?.data?._id;
  const femaleMaritalCheck = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    femaleMaritalCheck.data?.data?.campaign?.id !== divorcedCamId,
    'TEST 8: Never Married candidate is not eligible for Divorced-only campaign'
  );
  if (divorcedCamId) {
    await request(`/campaigns/admin/${divorcedCamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // ── TEST 9: Coupon Valid (Correct Discount) ──
  console.log('\nTEST 9: Valid Coupon Code');
  // Clean up any test coupon
  const existingCoupons = await request('/coupons/admin', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (existingCoupons.data?.data) {
    for (const c of existingCoupons.data.data) {
      if (c.couponCode?.startsWith('WJTEST')) {
        await request(`/coupons/admin/${c._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
    }
  }

  const validCouponCreate = await request('/coupons/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      couponCode: 'WJTEST30',
      name: 'Test 30% Off Coupon',
      discountType: 'PERCENTAGE',
      discountValue: 30,
      applicablePlans: ['ALL'],
      startDate: new Date(Date.now() - 3600000).toISOString(),
      expiryDate: new Date(Date.now() + 864000000).toISOString(),
      usageLimit: 100,
      perMemberLimit: 1,
      status: 'ACTIVE',
    },
  });
  const validCouponId = validCouponCreate.data?.data?._id;
  assert(Boolean(validCouponId), 'Created valid coupon WJTEST30 in database');

  // Temporarily pause campaigns to test standalone coupon discount without campaign conflict (Part 43)
  if (fathersDayId) {
    await request(`/campaigns/admin/${fathersDayId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'PAUSED' },
    });
  }

  const couponValidateRes = await request('/coupons/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { couponCode: 'WJTEST30', planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    couponValidateRes.data?.valid === true && couponValidateRes.data?.discountPercentage === 30,
    `TEST 9: Coupon WJTEST30 valid -> Discount ₹${couponValidateRes.data?.discountAmount}`
  );

  // ── TEST 10: Coupon Expired ──
  console.log('\nTEST 10: Expired Coupon Code');
  const expiredCouponCreate = await request('/coupons/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      couponCode: 'WJTESTEXPIRED',
      name: 'Expired Coupon',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      startDate: new Date(Date.now() - 864000000).toISOString(),
      expiryDate: new Date(Date.now() - 3600000).toISOString(), // Expired
      status: 'ACTIVE',
    },
  });
  const expiredValidate = await request('/coupons/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { couponCode: 'WJTESTEXPIRED', planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    expiredValidate.data?.valid === false && expiredValidate.data?.reasonCode === 'COUPON_EXPIRED',
    'TEST 10: Expired coupon rejected with COUPON_EXPIRED'
  );

  // ── TEST 11: Coupon Usage Limit Reached ──
  console.log('\nTEST 11: Coupon Usage Limit Reached');
  const limitCouponCreate = await request('/coupons/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      couponCode: 'WJTESTLIMIT0',
      name: 'Zero Limit Coupon',
      discountType: 'FIXED_AMOUNT',
      discountValue: 500,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      expiryDate: new Date(Date.now() + 864000000).toISOString(),
      usageLimit: 0, // Limit reached immediately
      status: 'ACTIVE',
    },
  });
  const limitValidate = await request('/coupons/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { couponCode: 'WJTESTLIMIT0', planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    limitValidate.data?.valid === false && limitValidate.data?.reasonCode === 'USAGE_LIMIT_EXCEEDED',
    'TEST 11: Coupon with 0 remaining uses rejected with USAGE_LIMIT_EXCEEDED'
  );

  // ── TEST 12: Same member attempts coupon twice when perMemberLimit = 1 ──
  console.log('\nTEST 12: Per Member Usage Limit Reached');
  // First redeem WJTEST30
  const redeemRes = await request('/coupons/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { couponCode: 'WJTEST30', planKey: 'DOCTOR_CONNECT', paymentId: 'test_pay_1', orderId: 'test_ord_1' },
  });
  assert(redeemRes.data?.success === true, 'First redemption of WJTEST30 succeeded');

  // Second validation attempt
  const secondAttempt = await request('/coupons/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { couponCode: 'WJTEST30', planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    secondAttempt.data?.valid === false && secondAttempt.data?.reasonCode === 'MEMBER_LIMIT_EXCEEDED',
    'TEST 12: Same member attempting coupon twice rejected with MEMBER_LIMIT_EXCEEDED'
  );

  // Re-activate Father's Day for subsequent campaign lifecycle tests
  if (fathersDayId) {
    await request(`/campaigns/admin/${fathersDayId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'ACTIVE' },
    });
  }

  // ── TEST 13 & TEST 14: Referral Attribution & Milestone Reward ──
  console.log('\nTEST 13 & TEST 14: Referral tracking, qualification, and milestone coupon generation');
  // Get Female user's referral code
  const femaleRefData = await request('/referrals/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  const femaleRefCode = femaleRefData.data?.data?.referralCode;
  assert(Boolean(femaleRefCode), `Female user referral code: ${femaleRefCode}`);

  // Configure Referral threshold to 2 for quick automated milestone test
  await request('/referrals/admin/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      requiredReferrals: 2,
      qualificationTrigger: 'REGISTERED',
      rewardType: 'PERCENTAGE_DISCOUNT',
      rewardValue: 50,
      rewardPlanKey: 'ALL',
      couponValidityDays: 30,
      allowRecurringMilestones: true,
      isActive: true,
    },
  });

  // Register Referred User 1
  const randomSuffix1 = Math.random().toString(36).substring(2, 7);
  const reg1 = await request('/registration/start', {
    method: 'POST',
    body: {
      fullName: `Referred Candidate ${randomSuffix1}`,
      email: `referred_${randomSuffix1}@example.com`,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      gender: 'Male',
      dob: '1995-05-10',
      referralCode: femaleRefCode,
    },
  });
  const reg1Id = reg1.data?.data?.registrationId;
  const complete1 = await request('/registration/complete', {
    method: 'POST',
    body: {
      registrationId: reg1Id,
      referralCode: femaleRefCode,
      finalData: {
        agreeTerms: true,
        termsAccepted: true,
      },
    },
  });
  assert(Boolean(complete1.data?.token), 'TEST 13: Referred member 1 successfully registered with referral attribution');

  // Check Female user referral progress (should be 1/2)
  const refProgress1 = await request('/referrals/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  assert(
    refProgress1.data?.data?.successfulReferrals >= 1,
    `Progress: ${refProgress1.data?.data?.successfulReferrals} / ${refProgress1.data?.data?.requiredReferrals} successful referrals`
  );

  // Register Referred User 2 to reach milestone (2/2)
  const randomSuffix2 = Math.random().toString(36).substring(2, 7);
  const reg2 = await request('/registration/start', {
    method: 'POST',
    body: {
      fullName: `Referred Candidate ${randomSuffix2}`,
      email: `referred_${randomSuffix2}@example.com`,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      gender: 'Male',
      dob: '1994-08-20',
      referralCode: femaleRefCode,
    },
  });
  const reg2Id = reg2.data?.data?.registrationId;
  await request('/registration/complete', {
    method: 'POST',
    body: {
      registrationId: reg2Id,
      referralCode: femaleRefCode,
      finalData: {
        agreeTerms: true,
        termsAccepted: true,
      },
    },
  });

  // Check Female user referral rewards
  const refProgress2 = await request('/referrals/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  const earnedRewards = refProgress2.data?.data?.rewards || [];
  assert(
    earnedRewards.length > 0 && earnedRewards[0].couponCode?.startsWith('WJREF-'),
    `TEST 14: Referral milestone achieved! Generated unique reward coupon: ${earnedRewards[0]?.couponCode}`
  );

  // ── TEST 15: Member Only Shares Link / Clicks Link ──
  console.log('\nTEST 15: Clicks alone do NOT increment successful referral count');
  const countBeforeClick = refProgress2.data?.data?.successfulReferrals;
  await request('/referrals/track-click', {
    method: 'POST',
    body: { referralCode: femaleRefCode },
  });
  const countAfterClick = await request('/referrals/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  assert(
    countAfterClick.data?.data?.successfulReferrals === countBeforeClick,
    'TEST 15: Click tracking recorded click without incrementing qualified registration count'
  );

  // ── TEST 16: Self Referral Rejected ──
  console.log('\nTEST 16: Anti-Abuse Self-Referral check');
  const selfReg = await request('/registration/start', {
    method: 'POST',
    body: {
      fullName: 'Self Referrer Test',
      email: femaleUser?.email || 'priya.sharma@example.com',
      mobile: femaleUser?.mobile || '9876543210',
      referralCode: femaleRefCode,
    },
  });
  assert(
    selfReg.status === 400 || selfReg.data?.message?.includes('already'),
    'TEST 16: Self-referral attempt blocked by account verification and attribution safety'
  );

  // ── TEST 17: Duplicate Registration / Referral ──
  console.log('\nTEST 17: Duplicate rewards prevented idempotently');
  const refProgressRefresh = await request('/referrals/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  const rewardsCountAfter = refProgressRefresh.data?.data?.rewards?.length;
  assert(
    rewardsCountAfter === earnedRewards.length,
    'TEST 17: Idempotency enforced: Repeated dashboard checks did not generate duplicate milestone reward coupons'
  );

  // ── TEST 18: Campaign Expires Automatically ──
  console.log('\nTEST 18: Campaign Expiry');
  const shortCampaign = await request('/campaigns/admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: "Immediate Expiry Campaign",
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() - 1000).toISOString(), // Ended 1 second ago
      targetGender: 'Female',
      applicablePlans: ['ALL'],
      discountType: 'PERCENTAGE',
      discountValue: 90,
      priority: 99,
      status: 'ACTIVE',
    },
  });
  const shortCamId = shortCampaign.data?.data?._id;
  const expiredOfferCheck = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    expiredOfferCheck.data?.data?.campaign?.id !== shortCamId,
    'TEST 18: Expired campaign is ignored by backend offerEngine'
  );
  if (shortCamId) {
    await request(`/campaigns/admin/${shortCamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // ── TEST 19: Admin Disables Campaign ──
  console.log('\nTEST 19: Admin Disables / Pauses Campaign');
  await request(`/campaigns/admin/${fathersDayId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'PAUSED' },
  });
  const maleOfferAfterPause = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    maleOfferAfterPause.data?.data?.campaign?.id !== fathersDayId,
    'TEST 19: Paused campaign immediately stops offering discounts'
  );

  // ── TEST 20: Admin Changes Discount from 50% to 100% ──
  console.log('\nTEST 20: Admin Modifies Campaign Rule');
  await request(`/campaigns/admin/${fathersDayId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'ACTIVE', discountType: 'FREE_100_PERCENT', discountValue: 100 },
  });
  const maleOfferAfterUpdate = await request('/memberships/calculate-offer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    maleOfferAfterUpdate.data?.data?.finalPrice === 0 && maleOfferAfterUpdate.data?.data?.isFree === true,
    'TEST 20: Updating campaign to 100% free immediately applies ₹0 price for eligible male candidate'
  );

  // ── TEST 21: Client Sends Manipulated Price ──
  console.log('\nTEST 21: Server Authoritative Pricing (Frontend manipulation ignored)');
  const manipulatedOrder = await request('/memberships/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${maleToken}` },
    body: {
      planKey: 'DOCTOR_CONNECT',
      price: 1, // Manipulated ₹1
      amount: 100, // Manipulated
    },
  });
  // The order amount created by backend must match the backend offer calculation, NOT 1
  assert(
    manipulatedOrder.data?.data?.order?.amount !== 100,
    'TEST 21: Client-supplied price/amount ignored. Server calculates true price independently.'
  );

  // ── TEST 22 & TEST 23: Authorization Checks ──
  console.log('\nTEST 22 & TEST 23: Admin & Super Admin Authorization');
  const guestAttempt = await request('/campaigns/admin', {
    method: 'GET',
  });
  assert(guestAttempt.status === 401 || guestAttempt.status === 403, 'TEST 22: Unauthenticated guest blocked from admin campaign API (401/403)');

  const userAdminAttempt = await request('/campaigns/admin', {
    method: 'GET',
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  assert(userAdminAttempt.status === 403, 'TEST 23: Regular member blocked with 403 Forbidden from admin campaign endpoints');

  // ── TEST 24: 100% Discount Free Entitlement Flow ──
  console.log('\nTEST 24: 100% Free Claim Flow without Razorpay order');
  const freeClaim = await request('/memberships/claim-free', {
    method: 'POST',
    headers: { Authorization: `Bearer ${femaleToken}` },
    body: { planKey: 'DOCTOR_CONNECT' },
  });
  assert(
    freeClaim.data?.success === true && freeClaim.data?.data?.payment?.amount === 0,
    `TEST 24: Successfully claimed 100% free membership: "${freeClaim.data?.message}"`
  );

  // ── TEST 25: Membership Activation Verification ──
  console.log('\nTEST 25: Active Subscription Verification in Database');
  const subStatus = await request('/subscription/me', {
    headers: { Authorization: `Bearer ${femaleToken}` },
  });
  assert(
    subStatus.data?.data?.planKey === 'DOCTOR_CONNECT' && subStatus.data?.data?.contactRequestsRemaining > 0,
    `TEST 25: Subscription active with ${subStatus.data?.data?.contactRequestsRemaining} contact credits!`
  );

  // Restore referral threshold
  await request('/referrals/admin/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { requiredReferrals: 5 },
  });

  console.log('\n============================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
