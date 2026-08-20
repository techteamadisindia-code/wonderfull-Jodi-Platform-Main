import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Profile } from '../models/Profile';

export async function seedInitialData() {
  try {
    const userCount = await User.countDocuments();
    let usersList: any[] = [];
    let createdUsers: any[] = [];

    if (userCount === 0) {
      console.log('Seeding initial demo matrimonial users and profiles...');
      const defaultPassword = await bcrypt.hash('Password123!', 12);

      const demoUsers = [
      {
        fullName: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        mobile: '+919876543210',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Priya Sharma',
          gender: 'Female' as const,
          dob: new Date('1998-05-14'),
          height: `5' 6"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Brahmin',
          education: 'Master of Technology',
          degree: 'M.Tech Computer Science (IIT Bombay)',
          profession: 'Senior Software Engineer',
          company: 'Google India',
          workLocation: 'Bengaluru',
          annualIncome: '₹ 35 - 50 Lakhs',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Passionate tech enthusiast, loves classical music, traveling and exploring new cultures. Looking for an understanding partner who values family and ambition.',
          photos: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Rohan Mehta',
        email: 'rohan.mehta@example.com',
        mobile: '+919876543211',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Rohan Mehta',
          gender: 'Male' as const,
          dob: new Date('1994-11-20'),
          height: `5' 11"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Gujarati',
          religion: 'Hindu',
          caste: 'Vaishnav',
          education: 'Master of Business Administration',
          degree: 'MBA (IIM Ahmedabad)',
          profession: 'Product Director',
          company: 'Fintech Unicorn',
          workLocation: 'Mumbai',
          annualIncome: '₹ 45 - 60 Lakhs',
          country: 'India',
          state: 'Maharashtra',
          city: 'Mumbai',
          familyType: 'Joint',
          foodPreference: 'Vegetarian',
          about: 'Entrepreneurial mindset, fitness enthusiast, marathon runner. Seeking a life partner with shared values, kindness, and positivity.',
          photos: [
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Ananya Verma',
        email: 'ananya.verma@example.com',
        mobile: '+919876543212',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Ananya Verma',
          gender: 'Female' as const,
          dob: new Date('1996-08-03'),
          height: `5' 5"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Kayastha',
          education: 'Doctorate / Medical',
          degree: 'MBBS, MD Cardiology (AIIMS)',
          profession: 'Consultant Cardiologist',
          company: 'Apollo Hospitals',
          workLocation: 'Delhi NCR',
          annualIncome: '₹ 40 - 55 Lakhs',
          country: 'India',
          state: 'Delhi',
          city: 'New Delhi',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Dedicated medical doctor, reader, nature lover. Looking for an educated, respectful, and family-oriented companion.',
          photos: [
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Vikramaditya Singh',
        email: 'vikram.singh@example.com',
        mobile: '+919876543213',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Vikramaditya Singh',
          gender: 'Male' as const,
          dob: new Date('1992-03-17'),
          height: `6' 0"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Rajput',
          education: 'Bachelor of Architecture',
          degree: 'B.Arch (SPA Delhi)',
          profession: 'Principal Architect & Founder',
          company: 'Design Atelier',
          workLocation: 'Jaipur',
          annualIncome: '₹ 50 - 75 Lakhs',
          country: 'India',
          state: 'Rajasthan',
          city: 'Jaipur',
          familyType: 'Joint',
          foodPreference: 'Non-Vegetarian',
          about: 'Passionate about sustainable architecture, heritage preservation and road trips. Seeking a creative, joyful partner to build a beautiful life with.',
          photos: [
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Siddharth Nair',
        email: 'siddharth.nair@example.com',
        mobile: '+919876543214',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Siddharth Nair',
          gender: 'Male' as const,
          dob: new Date('1995-07-22'),
          height: `5' 10"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Malayalam',
          religion: 'Hindu',
          caste: 'Nair',
          education: 'Master of Science',
          degree: 'MS Data Science (Columbia University)',
          profession: 'AI Research Lead',
          company: 'Tech Corp',
          workLocation: 'Hyderabad',
          annualIncome: '₹ 45 - 65 Lakhs',
          country: 'India',
          state: 'Telangana',
          city: 'Hyderabad',
          familyType: 'Nuclear',
          foodPreference: 'Non-Vegetarian',
          about: 'AI researcher, avid badminton player and culinary enthusiast. Seeking an ambitious and warm-hearted life partner.',
          photos: [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Rajesh Kulkarni',
        email: 'rajesh.kulkarni@example.com',
        mobile: '+919876543216',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Rajesh Kulkarni',
          gender: 'Male' as const,
          dob: new Date('1993-04-18'),
          height: `5' 11"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          education: 'Doctorate / Medical',
          degree: 'MBBS, MD Internal Medicine (KEM Mumbai)',
          profession: 'Consultant Physician & Intensivist',
          company: 'Lilavati Hospital',
          workLocation: 'Mumbai',
          annualIncome: '₹ 45 - 60 Lakhs',
          country: 'India',
          state: 'Maharashtra',
          city: 'Mumbai',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Dedicated physician, fond of classical literature and weekend hiking. Seeking an understanding partner with strong moral and family values.',
          photos: [
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Sneha Patil',
        email: 'sneha.patil@example.com',
        mobile: '+919876543217',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Sneha Patil',
          gender: 'Female' as const,
          dob: new Date('1995-09-12'),
          height: `5' 5"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          education: 'Doctorate / Medical',
          degree: 'MBBS, MS General Surgery (BJ Medical Pune)',
          profession: 'General & Laparoscopic Surgeon',
          company: 'Ruby Hall Clinic',
          workLocation: 'Pune',
          annualIncome: '₹ 38 - 50 Lakhs',
          country: 'India',
          state: 'Maharashtra',
          city: 'Pune',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Surgeon with a passion for patient care, classical music, and traveling. Looking for an educated, modern yet family-oriented doctor/professional partner.',
          photos: [
            'https://images.unsplash.com/photo-1594824813599-78cc738a9e01?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1594824813599-78cc738a9e01?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Arjun Nambiar',
        email: 'arjun.nambiar@example.com',
        mobile: '+919876543218',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Arjun Nambiar',
          gender: 'Male' as const,
          dob: new Date('1994-06-25'),
          height: `6' 0"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Malayalam',
          religion: 'Hindu',
          caste: 'Nair',
          education: 'Doctorate / Medical',
          degree: 'MBBS, DNB Pediatrics (Manipal Hospital)',
          profession: 'Consultant Pediatrician',
          company: 'Aster CMI Hospital',
          workLocation: 'Bengaluru',
          annualIncome: '₹ 42 - 58 Lakhs',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          familyType: 'Nuclear',
          foodPreference: 'Non-Vegetarian',
          about: 'Child specialist, avid photographer, and badminton player. Looking for a compassionate partner with a positive outlook towards life.',
          photos: [
            'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Meera Deshmukh',
        email: 'meera.deshmukh@example.com',
        mobile: '+919876543219',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Meera Deshmukh',
          gender: 'Female' as const,
          dob: new Date('1997-03-08'),
          height: `5' 6"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Deshastha Brahmin',
          education: 'Master of Dental Surgery',
          degree: 'BDS, MDS Orthodontics (Govt Dental College)',
          profession: 'Orthodontist & Clinic Director',
          company: 'Deshmukh Dental Specialists',
          workLocation: 'Mumbai',
          annualIncome: '₹ 35 - 48 Lakhs',
          country: 'India',
          state: 'Maharashtra',
          city: 'Mumbai',
          familyType: 'Joint',
          foodPreference: 'Vegetarian',
          about: 'Orthodontist who loves painting and yoga. Seeking a kind, ambitious, and caring life companion.',
          photos: [
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Alok Mathur',
        email: 'alok.mathur@example.com',
        mobile: '+919876543220',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Alok Mathur',
          gender: 'Male' as const,
          dob: new Date('1991-12-05'),
          height: `5' 10"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Kayastha',
          education: 'Super Speciality / DM',
          degree: 'MBBS, MD, DM Neurology (NIMHANS)',
          profession: 'Senior Neurologist',
          company: 'Max Super Speciality Hospital',
          workLocation: 'New Delhi',
          annualIncome: '₹ 55 - 75 Lakhs',
          country: 'India',
          state: 'Delhi',
          city: 'New Delhi',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Neurologist passionate about neuroscience, classical sitar, and chess. Looking for a doctor or professional partner to share life joys with.',
          photos: [
            'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Pooja Hegde',
        email: 'pooja.hegde@example.com',
        mobile: '+919876543221',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Pooja Hegde',
          gender: 'Female' as const,
          dob: new Date('1996-01-20'),
          height: `5' 4"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Kannada',
          religion: 'Hindu',
          caste: 'Bunt',
          education: 'Doctorate / Medical',
          degree: 'MBBS, MS Ophthalmology (Sankara Nethralaya)',
          profession: 'Eye Surgeon / Cataract Specialist',
          company: 'Narayana Nethralaya',
          workLocation: 'Bengaluru',
          annualIncome: '₹ 40 - 52 Lakhs',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Ophthalmologist dedicated to restoring sight. Loves Carnatic singing and outdoor travel. Seeking a respectful and intellectually compatible life partner.',
          photos: [
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Admin User',
        email: 'admin@wonderfuljodi.com',
        mobile: '+919999999999',
        password: defaultPassword,
        role: 'admin' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
      }
    ];

    const createdUsers: any[] = [];
    for (const item of demoUsers) {
      const user = await User.create({
        fullName: item.fullName,
        email: item.email,
        mobile: item.mobile,
        password: item.password,
        role: item.role,
        verified: item.verified,
        verificationStatus: item.verificationStatus,
      });

      if ('profile' in item && item.profile) {
        await Profile.create({
          ...item.profile,
          user: user._id,
        });
      }
      createdUsers.push(user);
    }
  } else {
    usersList = await User.find();
  }

  const allUsers: any[] = usersList.length > 0 ? usersList : createdUsers;
  const adminUser = allUsers.find((u: any) => u.role === 'admin');
  const normalUsers = allUsers.filter((u: any) => u.role === 'user');

    // 1. Seed Admin Document
    const { Admin } = await import('../models/Admin');
    if (adminUser) {
      await Admin.findOneAndUpdate(
        { user: adminUser._id },
        { permissions: ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports', 'settings', 'admins'] },
        { upsert: true, new: true }
      );
    }

    // 2. Seed Default Settings
    const { Setting } = await import('../models/Setting');
    await Setting.findOneAndUpdate(
      {},
      {
        siteName: 'Wonderful Jodi',
        supportEmail: 'support@wonderfuljodi.com',
        supportPhone: '+91 98765 43210',
        tollFreeNumber: '+91 1800 200 9090',
        officeAddress: 'Cyber City, Phase II, Gurugram, Haryana - 122002',
        maintenanceMode: false,
        allowNewRegistrations: true,
        requireEmailVerification: false,
        requireManualProfileApproval: true,
        currency: 'INR',
        razorpayLiveMode: false,
        minAgeMale: 21,
        minAgeFemale: 18,
        maxPhotoUploadLimit: 6,
      },
      { upsert: true, new: true }
    );

    // 3. Seed Verifications
    const { Verification } = await import('../models/Verification');
    if (normalUsers.length >= 4 && (await Verification.countDocuments()) === 0) {
      await Verification.create([
        {
          user: normalUsers[0]._id,
          documentType: 'Aadhaar / National ID Card',
          documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
          status: 'APPROVED',
          notes: 'Identity confirmed via Government ID card database.',
        },
        {
          user: normalUsers[1]._id,
          documentType: 'Passport & Work ID',
          documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
          status: 'APPROVED',
          notes: 'Director position and corporate email verified.',
        },
        {
          user: normalUsers[2]._id,
          documentType: 'Medical Council Registration & MD Degree',
          documentUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
          status: 'PENDING',
          notes: 'National Medical Commission registry verification under review.',
        },
        {
          user: normalUsers[3]._id,
          documentType: 'Council of Architecture License',
          documentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800',
          status: 'PENDING',
          notes: 'Submitted for expedited verification.',
        },
      ]);
    }

    // 4. Seed Subscriptions and Payments
    const { Subscription } = await import('../models/Subscription');
    const { Payment } = await import('../models/Payment');
    if (normalUsers.length >= 5 && (await Subscription.countDocuments()) === 0) {
      const sub1 = await Subscription.create({
        user: normalUsers[0]._id,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      });

      await Payment.create({
        user: normalUsers[0]._id,
        subscription: sub1._id,
        provider: 'razorpay',
        providerPaymentId: 'pay_Nj8s9A2KdX91b',
        amount: 4999,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: { orderId: 'order_N8917234', paymentMethod: 'UPI' },
      });

      const sub2 = await Subscription.create({
        user: normalUsers[1]._id,
        plan: 'PREMIUM_VIP',
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 175 * 24 * 60 * 60 * 1000),
      });

      await Payment.create({
        user: normalUsers[1]._id,
        subscription: sub2._id,
        provider: 'razorpay',
        providerPaymentId: 'pay_Kq92Lz8P1mNbv',
        amount: 9999,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: { orderId: 'order_K9182371', paymentMethod: 'NetBanking' },
      });

      const sub3 = await Subscription.create({
        user: normalUsers[4]._id,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 88 * 24 * 60 * 60 * 1000),
      });

      await Payment.create({
        user: normalUsers[4]._id,
        subscription: sub3._id,
        provider: 'razorpay',
        providerPaymentId: 'pay_Px731KlmQa09z',
        amount: 4999,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: { orderId: 'order_P0192847', paymentMethod: 'CreditCard' },
      });
    }

    // 5. Seed Reports
    const { Report } = await import('../models/Report');
    if (normalUsers.length >= 4 && (await Report.countDocuments()) === 0) {
      await Report.create([
        {
          reporter: normalUsers[0]._id,
          reportedUser: normalUsers[3]._id,
          reason: 'Inappropriate message received',
          details: 'User sent unsolicited commercial contact message.',
          status: 'PENDING',
        },
        {
          reporter: normalUsers[2]._id,
          reportedUser: normalUsers[1]._id,
          reason: 'Photo verification inquiry',
          details: 'Clarification requested regarding picture quality.',
          status: 'RESOLVED',
        },
      ]);
    }

    // 6. Seed Interests & Shortlists
    const { Interest } = await import('../models/Interest');
    const { Shortlist } = await import('../models/Shortlist');
    if (normalUsers.length >= 3 && (await Interest.countDocuments()) === 0) {
      await Interest.create([
        {
          sender: normalUsers[0]._id,
          receiver: normalUsers[1]._id,
          status: 'ACCEPTED',
        },
        {
          sender: normalUsers[1]._id,
          receiver: normalUsers[2]._id,
          status: 'PENDING',
        },
        {
          sender: normalUsers[3]._id,
          receiver: normalUsers[0]._id,
          status: 'PENDING',
        },
      ]);

      const profile1 = await Profile.findOne({ user: normalUsers[1]._id });
      const profile2 = await Profile.findOne({ user: normalUsers[2]._id });
      if (profile1) {
        await Shortlist.create({ user: normalUsers[0]._id, shortlistedProfile: profile1._id });
      }
      if (profile2) {
        await Shortlist.create({ user: normalUsers[0]._id, shortlistedProfile: profile2._id });
      }
    }

    // 7. Seed Contact Inquiries
    const { ContactInquiry } = await import('../models/ContactInquiry');
    if ((await ContactInquiry.countDocuments()) <= 1) {
      await ContactInquiry.create([
        {
          name: 'Dr. Suresh Sharma',
          mobile: '+919820011223',
          email: 'dr.suresh@example.com',
          message: 'Interested in the VVIP Concierge service for my daughter Dr. Priya.',
          status: 'NEW',
        },
        {
          name: 'Mrs. Rekha Singhania',
          mobile: '+919811122334',
          email: 'rekha.s@example.com',
          message: 'Need assistance with corporate profile verification and ID upload.',
          status: 'IN_PROGRESS',
        },
        {
          name: 'Adv. Sameer Deshpande',
          mobile: '+919833344556',
          email: 'sameer.d@example.com',
          message: 'Inquiring about family introduction packages.',
          status: 'RESOLVED',
        },
      ]);
    }

    // 8. Seed Audit Logs
    const { AuditLog } = await import('../models/AuditLog');
    if ((await AuditLog.countDocuments()) === 0) {
      await AuditLog.create([
        {
          adminEmail: 'admin@wonderfuljodi.com',
          action: 'SYSTEM_INITIALIZED',
          details: 'Initial system configuration and matrimonial demo data established.',
          status: 'SUCCESS',
        },
        {
          adminEmail: 'admin@wonderfuljodi.com',
          action: 'VERIFICATION_APPROVED',
          targetModel: 'Verification',
          details: 'Approved KYC documents for Dr. Ananya Verma.',
          status: 'SUCCESS',
        },
        {
          adminEmail: 'admin@wonderfuljodi.com',
          action: 'SETTINGS_CONFIGURED',
          targetModel: 'Setting',
          details: 'Configured platform currency INR and verification thresholds.',
          status: 'SUCCESS',
        },
      ]);
    }

    console.log(`Successfully verified and seeded ${allUsers.length} users, profiles, subscriptions, verifications, and platform settings!`);
    console.log('Demo Login Credentials:');
    console.log('  User:  priya.sharma@example.com / Password123!');
    console.log('  User:  rohan.mehta@example.com  / Password123!');
    console.log('  Admin: admin@wonderfuljodi.com  / Password123!');
  } catch (error) {
    console.error('Error during database seed:', error);
  }
}
