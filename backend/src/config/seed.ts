import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Profile } from '../models/Profile';

export async function seedInitialData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has users. Skipping seed.');
      return;
    }

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
        fullName: 'Kavya Iyer',
        email: 'kavya.iyer@example.com',
        mobile: '+919876543215',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Kavya Iyer',
          gender: 'Female' as const,
          dob: new Date('1997-02-11'),
          height: `5' 4"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Tamil',
          religion: 'Hindu',
          caste: 'Brahmin',
          education: 'Chartered Accountant',
          degree: 'CA & CFA Level 3',
          profession: 'Investment Banker',
          company: 'Morgan Stanley',
          workLocation: 'Chennai',
          annualIncome: '₹ 38 - 50 Lakhs',
          country: 'India',
          state: 'Tamil Nadu',
          city: 'Chennai',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Finance professional, classical dancer (Bharatanatyam), and coffee lover. Seeking a supportive partner with cultural grounding.',
          photos: [
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
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
    }

    console.log(`Successfully seeded ${demoUsers.length} users and verified profiles!`);
    console.log('Demo Login Credentials:');
    console.log('  User:  priya.sharma@example.com / Password123!');
    console.log('  User:  rohan.mehta@example.com  / Password123!');
    console.log('  Admin: admin@wonderfuljodi.com  / Password123!');
  } catch (error) {
    console.error('Error during database seed:', error);
  }
}
