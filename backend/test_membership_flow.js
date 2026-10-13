/**
 * WONDERFUL JODI: MEMBERSHIP SECURITY & FLOW VERIFICATION TEST SUITE
 *
 * Runs isolated security unit tests by default to protect production databases.
 * All 11 security scenarios are validated in-memory without network or database dependencies:
 * - Missing signature in gateway mode
 * - Invalid signature (and malformed signature format)
 * - Fabricated payment ID
 * - Unknown order ID
 * - Payment belonging to another user
 * - Subscription belonging to another user
 * - Client-supplied plan tampering
 * - Gateway order-creation failure
 * - Duplicate verification (idempotency)
 * - Valid payment verification
 * - Legitimate free-plan claim
 */

// If executed directly, run the isolated security test suite
require('./test_membership_security.js');
