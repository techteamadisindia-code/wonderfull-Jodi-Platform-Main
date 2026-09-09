export interface PlanConfig {
  planId: string;
  slug: string;
  key: string;
  name: string;
  badge?: string;
  badgeType?: 'free' | 'popular' | 'vip' | 'vvip';
  price: string;
  rawPrice: number;
  duration: string;
  durationMonths: number | null;
  profileViewing: string;
  contactViews: string;
  contactRequestLimit: number;
  isPopular?: boolean;
  isVip?: boolean;
  isVvip?: boolean;
  isUnlimitedContact?: boolean;
  fairUsageEnabled?: boolean;
  description: string;
  features: string[];
  ctaText: string;
  ctaAction: 'register' | 'order' | 'contact';
  disclaimer?: string;
}

export const MEMBERSHIP_PLANS: PlanConfig[] = [
  {
    planId: 'free',
    slug: 'free',
    key: 'FREE',
    name: 'Free',
    price: '₹0',
    rawPrice: 0,
    duration: 'Forever Free',
    durationMonths: null,
    profileViewing: 'Limited',
    contactViews: '0',
    contactRequestLimit: 0,
    description: 'Explore basic doctor profiles and create your professional matrimonial profile.',
    features: [
      'Limited profile browsing',
      'Create and manage profile',
      'Receive profile interest requests',
      'Basic search',
      'Shortlist profiles',
      'Platform messaging where allowed',
      'Contact details remain hidden',
    ],
    ctaText: 'Continue Free',
    ctaAction: 'register',
  },
  {
    planId: 'doctor-connect',
    slug: 'doctor-connect',
    key: 'DOCTOR_CONNECT',
    name: 'Doctor Connect',
    price: '₹5,999',
    rawPrice: 5999,
    duration: '3 Months',
    durationMonths: 3,
    profileViewing: 'Unlimited',
    contactViews: '25 Contacts',
    contactRequestLimit: 25,
    description: 'Direct doctor connections with 25 verified contact requests and unlimited profile browsing.',
    features: [
      'Unlimited doctor profile browsing',
      '25 Contact Requests',
      'Verified Doctor Profiles',
      'Advanced Search',
      'Unlimited Shortlisting',
      'Direct Platform Messaging',
      'Profile Privacy Controls',
      'Secure Contact Request System',
    ],
    ctaText: 'Choose Doctor Connect',
    ctaAction: 'order',
  },
  {
    planId: 'premium-match',
    slug: 'premium-match',
    key: 'PREMIUM_MATCH',
    name: 'Premium Match',
    badge: '⭐ MOST POPULAR',
    badgeType: 'popular',
    isPopular: true,
    price: '₹11,999',
    rawPrice: 11999,
    duration: '6 Months',
    durationMonths: 6,
    profileViewing: 'Unlimited',
    contactViews: '60 Contacts',
    contactRequestLimit: 60,
    description: 'Our most popular plan for doctors seeking direct connections, priority matching, and 60 contacts.',
    features: [
      'Unlimited Doctor Profile Viewing',
      '60 Contact Requests',
      'Verified Doctor Profiles',
      'Advanced Search',
      'Unlimited Shortlisting',
      'Priority Matching',
      'Direct Platform Messaging',
      'Profile Privacy Controls',
      'Priority Support',
    ],
    ctaText: 'Choose Premium Match',
    ctaAction: 'order',
  },
  {
    planId: 'priority-matchmaking',
    slug: 'priority-matchmaking',
    key: 'PRIORITY_MATCHMAKING',
    name: 'Priority Matchmaking',
    badge: '👑 Priority Assisted Matchmaking',
    badgeType: 'vip',
    isVip: true,
    price: '₹24,999',
    rawPrice: 24999,
    duration: '6 Months',
    durationMonths: 6,
    profileViewing: 'Unlimited',
    contactViews: '120 Contacts',
    contactRequestLimit: 120,
    description: 'Personalized assisted matchmaking with dedicated relationship manager and curated introductions.',
    features: [
      'Unlimited Doctor Profile Viewing',
      '120 Contact Requests',
      'Dedicated Matchmaking Manager',
      'Personal Preference Consultation',
      'Curated Match Recommendations',
      'AI + Human Compatibility Matching',
      'Assisted Introductions',
      'Family Introduction Assistance',
      'Priority Access',
      'Confidential Matchmaking Support',
    ],
    ctaText: 'Choose Priority Matchmaking',
    ctaAction: 'order',
  },
  {
    planId: 'exclusive-concierge',
    slug: 'exclusive-concierge',
    key: 'EXCLUSIVE_CONCIERGE',
    name: 'Exclusive Concierge',
    badge: '💎 Premium Concierge Service',
    badgeType: 'vvip',
    isVvip: true,
    price: '₹49,999',
    rawPrice: 49999,
    duration: '6 Months',
    durationMonths: 6,
    profileViewing: 'Unlimited',
    contactViews: 'Unlimited / Fair Use',
    contactRequestLimit: -1,
    isUnlimitedContact: true,
    fairUsageEnabled: true,
    description: 'Elite concierge service with senior matchmaking consultant, family coordination, and meeting setup.',
    features: [
      'Unlimited Doctor Profile Viewing',
      'Unlimited Contact Access*',
      'Senior Matchmaking Consultant',
      'Personally Curated Matches',
      'AI + Human Compatibility Assessment',
      'Family Preference Consultation',
      'Introduction Coordination',
      'Video / Face-to-Face Coordination',
      'Family-to-Family Assistance',
      'Confidentiality & Privacy Management',
      'Continuous Match Refinement',
    ],
    ctaText: 'Talk to Our Matchmaking Team',
    ctaAction: 'contact',
    disclaimer: '*Unlimited Contact Access is subject to Fair Usage Policy and member consent.',
  },
];

export interface ComparisonRow {
  packageName: string;
  price: string;
  duration: string;
  profileViewing: string;
  contactViews: string;
  isPopular?: boolean;
  badge?: string;
}

export const COMPARISON_TABLE_DATA: ComparisonRow[] = [
  {
    packageName: 'Free',
    price: '₹0',
    duration: 'Forever Free',
    profileViewing: 'Limited',
    contactViews: '0 Contacts',
  },
  {
    packageName: 'Doctor Connect',
    price: '₹5,999',
    duration: '3 Months',
    profileViewing: 'Unlimited',
    contactViews: '25 Contacts',
  },
  {
    packageName: 'Premium Match',
    price: '₹11,999',
    duration: '6 Months',
    profileViewing: 'Unlimited',
    contactViews: '60 Contacts',
    isPopular: true,
    badge: '⭐ MOST POPULAR',
  },
  {
    packageName: 'Priority Matchmaking',
    price: '₹24,999',
    duration: '6 Months',
    profileViewing: 'Unlimited',
    contactViews: '120 Contacts',
    badge: '👑 Priority Assisted',
  },
  {
    packageName: 'Exclusive Concierge',
    price: '₹49,999',
    duration: '6 Months',
    profileViewing: 'Unlimited',
    contactViews: 'Unlimited / Fair Use',
    badge: '💎 Concierge',
  },
];

export const PRIVACY_POINTS = [
  'Phone numbers are never publicly displayed',
  'Contact details require member consent',
  'WhatsApp sharing is optional',
  'Email sharing is optional',
  'Exact home address remains private',
  'Exact workplace address remains private',
  'Sensitive personal information is protected',
  'Contact access is securely logged',
];

export const PRIVACY_HIGHLIGHT =
  'Contact details are shared only after mutual interest and acceptance.';
