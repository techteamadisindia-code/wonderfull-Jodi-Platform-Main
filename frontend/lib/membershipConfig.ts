export interface FeatureSection {
  title: string;
  features: string[];
}

export interface PlanConfig {
  planId: string;
  key: string;
  name: string;
  badge: string;
  badgeSubtitle?: string;
  badgeType: 'free' | 'popular' | 'vip' | 'vvip';
  title: string;
  subtitle?: string;
  bestFor: string;
  price: string;
  duration: string;
  description: string;
  isPopular?: boolean;
  isVip?: boolean;
  isVvip?: boolean;
  sections: FeatureSection[];
  highlightFeatures: string[];
  ctaText: string;
  ctaAction: 'register' | 'order' | 'contact';
}

export const MEMBERSHIP_PLANS: PlanConfig[] = [
  {
    planId: 'free',
    key: 'FREE',
    name: 'Free Plan',
    badge: 'FREE PLAN',
    badgeType: 'free',
    title: 'Explore & Build Your Profile',
    bestFor: 'Doctors who are just starting their search',
    price: '₹0',
    duration: 'Forever Free',
    description: 'Create your professional doctor matrimonial profile and start discovering compatible matches.',
    highlightFeatures: [
      'Create detailed doctor matrimonial profile',
      'Doctor & profession information',
      'Upload up to 3 photos',
      'Basic profile search & recommendations',
      'Receive interest requests',
    ],
    sections: [
      {
        title: 'Essential',
        features: [
          'Create detailed doctor matrimonial profile',
          'Doctor/profession information',
          'Upload up to 3 photos',
          'Basic profile search',
          'Basic match recommendations',
          'Receive interest requests',
          'Send limited interest requests',
          'Profile privacy controls',
          'Basic profile verification',
        ],
      },
      {
        title: 'Helpful',
        features: [
          'Save favourite profiles',
          'Shortlist profiles',
          'Profile completion guidance',
          'Match notifications',
          'Basic customer support',
        ],
      },
      {
        title: 'Introduction',
        features: [
          'Limited contact access',
          'Limited messaging/communication',
        ],
      },
    ],
    ctaText: 'Create Your Free Profile',
    ctaAction: 'register',
  },
  {
    planId: 'premium',
    key: 'PREMIUM',
    name: 'Premium',
    badge: '⭐ MOST POPULAR',
    badgeType: 'popular',
    title: 'Connect With Compatible Doctors',
    bestFor: 'Doctors who are seriously looking for a life partner',
    price: '₹4,999',
    duration: '3 Months',
    description: 'Everything you need to connect directly with compatible verified doctors and accelerate your search.',
    isPopular: true,
    highlightFeatures: [
      'View contact details of selected verified profiles',
      'Unlimited interest requests & Direct messaging',
      'Search by Specialization & City/Location',
      'Verified doctor profiles & Highlighted badge',
      'Priority customer support',
    ],
    sections: [
      {
        title: '🔥 Connection',
        features: [
          'View contact details of selected verified profiles',
          'Unlimited interest requests',
          'Direct messaging',
          'Easy chat access',
          'Respond directly to interested profiles',
          'Advanced match recommendations',
          'Advanced search filters',
        ],
      },
      {
        title: '💎 Better Matching',
        features: [
          'Search by Specialization',
          'Search by City/Location',
          'Education & qualification filters',
          'Age & lifestyle preferences',
          'Profession & career preferences',
          'Recently active profiles',
          'New match alerts',
          'View who shortlisted/liked your profile',
        ],
      },
      {
        title: '🛡️ Trust & Privacy',
        features: [
          'Verified doctor profiles',
          'Enhanced profile visibility',
          'Privacy controls',
          'Priority customer support',
        ],
      },
      {
        title: '🚀 Visibility',
        features: [
          'Premium profile badge',
          'Higher placement in relevant search results',
          'Profile highlighting',
        ],
      },
    ],
    ctaText: 'Start Connecting',
    ctaAction: 'order',
  },
  {
    planId: 'premium_vip',
    key: 'PREMIUM_VIP',
    name: 'Premium VIP',
    badge: '👑 PREMIUM VIP',
    badgeSubtitle: 'FOR DOCTORS WHO VALUE TIME & PRIVACY',
    badgeType: 'vip',
    title: 'Personalised Matchmaking',
    bestFor: 'Doctors who value time & privacy',
    price: '₹9,999',
    duration: '6 Months',
    description: 'Everything in Premium, plus personalised assistance and priority matchmaking support.',
    isVip: true,
    highlightFeatures: [
      'Personal Relationship Manager (1-on-1 assistance)',
      'Unlimited contact access to eligible profiles',
      'Assisted communication & family introduction guidance',
      'Private profile sharing & advanced privacy settings',
      'Priority WhatsApp/phone support',
    ],
    sections: [
      {
        title: '🥇 Personal Assistance',
        features: [
          'Personal Relationship Manager',
          'One-to-one matchmaking assistance',
          'Personalised profile consultation',
          'Match recommendations based on preferences',
          'Assistance with initiating introductions',
        ],
      },
      {
        title: '💖 Premium Connections',
        features: [
          'Unlimited contact access to eligible profiles',
          'Priority access to newly added relevant profiles',
          'Priority introduction requests',
          'Assisted communication with shortlisted matches',
          'Family introduction assistance, where requested',
        ],
      },
      {
        title: '🔐 Privacy',
        features: [
          'Enhanced privacy settings',
          'Hide profile from general search',
          'Control who can view contact information',
          'Private profile sharing through the relationship manager',
        ],
      },
      {
        title: '🌟 Visibility',
        features: [
          'VIP profile badge',
          'Top profile placement',
          'Featured profile opportunities',
          'Priority profile review',
        ],
      },
      {
        title: '📞 Support',
        features: [
          'Priority WhatsApp/phone support',
          'Personal assistance throughout the matchmaking journey',
        ],
      },
    ],
    ctaText: 'Get Personalised Matchmaking',
    ctaAction: 'order',
  },
  {
    planId: 'vvip',
    key: 'VVIP',
    name: 'VVIP Concierge',
    badge: '💎 VVIP',
    badgeSubtitle: 'Discreet, bespoke matchmaking for doctors & families',
    badgeType: 'vvip',
    title: 'Exclusive Concierge Matchmaking',
    subtitle: 'For doctors and families seeking a fully personalised matchmaking experience',
    bestFor: 'Doctors and families seeking a fully personalised matchmaking experience',
    price: 'Custom',
    duration: 'Tailored Concierge',
    description: 'A discreet, high-touch matchmaking service combining dedicated human assistance, compatibility analysis and coordinated introductions.',
    isVvip: true,
    highlightFeatures: [
      'Dedicated Senior Matchmaking Consultant',
      'Personally curated match shortlist & AI+Human analysis',
      'Face-to-Face / Video introduction coordination',
      'Intercity match & family-to-family coordination',
      'Confidentiality agreement & discreet handling',
    ],
    sections: [
      {
        title: '👑 Dedicated Concierge',
        features: [
          'Dedicated Senior Matchmaking Consultant',
          'Personally Curated Match Shortlist',
          'AI + Human Compatibility Assessment',
          'Detailed Compatibility Consultation',
          'Family Preference Consultation',
          'Personalised Matchmaking Strategy',
        ],
      },
      {
        title: '📅 Introduction Management',
        features: [
          'Priority Scheduling of Introductions',
          'Face-to-Face / Video Introduction Coordination',
          'Conversation & First-Meeting Guidance',
          'Post-Meeting Feedback & Compatibility Review',
          'Continuous Match Refinement based on feedback from previous introductions',
        ],
      },
      {
        title: '🛡️ Verification & Trust',
        features: [
          'Enhanced Background Verification Coordination for shortlisted matches',
          'Professional & Social Profile Verification Assistance',
          'Confidentiality Agreement / Discreet Matchmaking Handling',
        ],
      },
      {
        title: '👨‍👩‍👧 Family & Location Assistance',
        features: [
          'Family-to-Family Meeting Coordination',
          'Intercity Match Coordination for doctors/families in different cities',
        ],
      },
      {
        title: '🌟 Exclusive Benefits',
        features: [
          'Exclusive VVIP Matchmaking Reports',
          'Personalised Anniversary/Birthday Reminder Service for Successful Matches',
          'After-Match Support until both families reach a mutually comfortable stage',
        ],
      },
    ],
    ctaText: 'Request VVIP Matchmaking',
    ctaAction: 'contact',
  },
];

export interface ComparisonRow {
  category?: string;
  feature: string;
  free: string | boolean;
  premium: string | boolean;
  vip: string | boolean;
  vvip: string | boolean;
  tooltip?: string;
}

export const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: 'Create profile',
    free: true,
    premium: true,
    vip: true,
    vvip: true,
  },
  {
    feature: 'Doctor verification',
    free: true,
    premium: true,
    vip: true,
    vvip: 'Enhanced',
  },
  {
    feature: 'Basic search',
    free: true,
    premium: true,
    vip: true,
    vvip: true,
  },
  {
    feature: 'Match recommendations',
    free: 'Basic',
    premium: 'Advanced',
    vip: 'Personalised',
    vvip: 'Curated',
  },
  {
    feature: 'Interest requests',
    free: 'Limited',
    premium: 'Unlimited',
    vip: 'Unlimited',
    vvip: 'Priority',
  },
  {
    feature: 'Messaging',
    free: 'Limited',
    premium: true,
    vip: true,
    vvip: 'Assisted',
  },
  {
    feature: 'Contact access',
    free: 'Limited',
    premium: 'Selected profiles',
    vip: 'Expanded / Unlimited*',
    vvip: 'Concierge-assisted',
  },
  {
    feature: 'Advanced filters',
    free: false,
    premium: true,
    vip: true,
    vvip: true,
  },
  {
    feature: 'Profile visibility',
    free: 'Standard',
    premium: 'Enhanced',
    vip: 'Priority',
    vvip: 'Exclusive/Priority',
  },
  {
    feature: 'Privacy controls',
    free: 'Basic',
    premium: 'Enhanced',
    vip: 'Advanced',
    vvip: 'Confidential',
  },
  {
    feature: 'Profile badge',
    free: false,
    premium: '⭐ Premium',
    vip: '👑 VIP',
    vvip: '💎 VVIP',
  },
  {
    feature: 'Personal Relationship Manager',
    free: false,
    premium: false,
    vip: true,
    vvip: 'Dedicated Senior Consultant',
  },
  {
    feature: 'Matchmaking assistance',
    free: false,
    premium: false,
    vip: true,
    vvip: 'Concierge',
  },
  {
    feature: 'Priority introductions',
    free: false,
    premium: false,
    vip: true,
    vvip: '⭐ Priority',
  },
  {
    feature: 'Priority support',
    free: false,
    premium: true,
    vip: '⭐ VIP',
    vvip: 'Dedicated',
  },
  {
    feature: 'Featured placement',
    free: false,
    premium: true,
    vip: '⭐ Priority',
    vvip: 'Exclusive',
  },
  {
    feature: 'Profile consultation',
    free: false,
    premium: false,
    vip: true,
    vvip: true,
  },
  {
    feature: 'Compatibility assessment',
    free: false,
    premium: false,
    vip: 'Basic/Personalised',
    vvip: 'AI + Human',
  },
  {
    feature: 'Family introduction assistance',
    free: false,
    premium: false,
    vip: 'Available on request',
    vvip: true,
  },
  {
    feature: 'Intercity match coordination',
    free: false,
    premium: false,
    vip: false,
    vvip: true,
  },
  {
    feature: 'Post-meeting support',
    free: false,
    premium: false,
    vip: 'Limited',
    vvip: true,
  },
];

export const JOURNEY_STEPS = [
  {
    tier: 'FREE',
    step: 'Discover',
    tagline: 'Start at your own pace and build your verified doctor profile.',
    icon: 'Sparkles',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    tier: 'PREMIUM',
    step: 'Connect',
    tagline: 'Connect directly with compatible doctors and take control of your search.',
    icon: 'Flame',
    badgeColor: 'bg-red-50 text-[#E51F3E] border-rose-200 font-bold',
  },
  {
    tier: 'PREMIUM VIP',
    step: 'Personalise',
    tagline: 'Save time with personalised assistance and priority matchmaking.',
    icon: 'Crown',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
  },
  {
    tier: 'VVIP',
    step: 'Concierge',
    tagline: 'Let our concierge team manage the matchmaking journey with discretion and personal attention.',
    icon: 'Diamond',
    badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold',
  },
];
