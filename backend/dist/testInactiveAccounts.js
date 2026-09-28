"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("./models/User");
const RefreshToken_1 = require("./models/RefreshToken");
const AuditLog_1 = require("./models/AuditLog");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wonderfuljodi';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';
async function runTests() {
    console.log('--- STARTING INACTIVE ACCOUNTS TEST SUITE ---');
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    // 1. Create a test admin and a test normal user
    const adminEmail = `test_admin_${Date.now()}@wonderfuljodi.com`;
    const userEmail = `test_candidate_${Date.now()}@wonderfuljodi.com`;
    const passwordHash = await bcrypt_1.default.hash('SecurePassword@2026', 10);
    const testAdmin = await User_1.User.create({
        fullName: 'Super Admin Test',
        email: adminEmail,
        mobile: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
        password: passwordHash,
        role: 'admin',
        isActive: true,
        verificationStatus: 'VERIFIED',
    });
    const testUser = await User_1.User.create({
        fullName: 'Candidate Test Account',
        email: userEmail,
        mobile: `888${Math.floor(1000000 + Math.random() * 9000000)}`,
        password: passwordHash,
        role: 'user',
        isActive: true,
        verificationStatus: 'VERIFIED',
    });
    console.log('✓ Created test admin:', testAdmin.email);
    console.log('✓ Created test user:', testUser.email);
    // 2. Test Dashboard Counts
    const totalUsersBefore = await User_1.User.countDocuments({ role: 'user' });
    const activeUsersBefore = await User_1.User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsersBefore = await User_1.User.countDocuments({ role: 'user', isActive: false });
    console.log(`[Dashboard Counts] Total: ${totalUsersBefore}, Active: ${activeUsersBefore}, Inactive: ${inactiveUsersBefore}`);
    if (totalUsersBefore !== activeUsersBefore + inactiveUsersBefore) {
        throw new Error('Total users count must equal active + inactive user count!');
    }
    console.log('✓ Verified: Total Users == Active + Inactive');
    // 3. Test Deactivation of user
    testUser.isActive = false;
    await testUser.save();
    await RefreshToken_1.RefreshToken.updateMany({ user: testUser._id }, { isRevoked: true });
    await AuditLog_1.AuditLog.create({
        adminEmail: testAdmin.email,
        action: 'ACCOUNT_DEACTIVATED',
        details: `Updated user ${testUser.email} status to INACTIVE (Reason: Administrative action)`,
        targetModel: 'User',
        targetId: String(testUser._id),
        status: 'SUCCESS',
    });
    // Verify updated counts
    const activeUsersAfter = await User_1.User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsersAfter = await User_1.User.countDocuments({ role: 'user', isActive: false });
    console.log(`[After Deactivation] Active: ${activeUsersAfter}, Inactive: ${inactiveUsersAfter}`);
    if (inactiveUsersAfter !== inactiveUsersBefore + 1) {
        throw new Error('Inactive count should have incremented by 1');
    }
    if (activeUsersAfter !== activeUsersBefore - 1) {
        throw new Error('Active count should have decremented by 1');
    }
    console.log('✓ Verified: Deactivation increments Inactive Accounts and decrements Active Accounts');
    // 4. Test Filtering by isActive
    const inactiveUsersList = await User_1.User.find({ role: 'user', isActive: false }).select('-password');
    const foundDeactivated = inactiveUsersList.find((u) => String(u._id) === String(testUser._id));
    if (!foundDeactivated) {
        throw new Error('Deactivated user not found in inactive users filter');
    }
    console.log('✓ Verified: Deactivated user appears in Inactive Accounts list');
    const activeUsersList = await User_1.User.find({ role: 'user', isActive: true }).select('-password');
    const foundInActive = activeUsersList.find((u) => String(u._id) === String(testUser._id));
    if (foundInActive) {
        throw new Error('Deactivated user unexpectedly found in active users list');
    }
    console.log('✓ Verified: Deactivated user does NOT appear in Active Accounts list');
    // 5. Test Reactivation
    testUser.isActive = true;
    await testUser.save();
    await AuditLog_1.AuditLog.create({
        adminEmail: testAdmin.email,
        action: 'ACCOUNT_REACTIVATED',
        details: `Updated user ${testUser.email} status to ACTIVE`,
        targetModel: 'User',
        targetId: String(testUser._id),
        status: 'SUCCESS',
    });
    const activeUsersRestored = await User_1.User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsersRestored = await User_1.User.countDocuments({ role: 'user', isActive: false });
    if (activeUsersRestored !== activeUsersBefore || inactiveUsersRestored !== inactiveUsersBefore) {
        throw new Error('Reactivation did not restore counts accurately');
    }
    console.log('✓ Verified: Reactivation accurately restores Active / Inactive counts');
    // 6. Cleanup test records
    await User_1.User.deleteMany({ _id: { $in: [testAdmin._id, testUser._id] } });
    await AuditLog_1.AuditLog.deleteMany({ adminEmail: testAdmin.email });
    console.log('✓ Cleaned up test data');
    await mongoose_1.default.disconnect();
    console.log('--- ALL INACTIVE ACCOUNT TESTS PASSED SUCCESSFULLY (100%) ---');
}
runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
//# sourceMappingURL=testInactiveAccounts.js.map