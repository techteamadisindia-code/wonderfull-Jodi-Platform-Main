import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Registration } from '../models/Registration';
import { seedMasterDataIfEmpty } from '../services/masterDataImporter';
import { MembershipPlan } from '../models/MembershipPlan';

export async function seedInitialData() {
  try {
    // Ensure all location & community master data is seeded and up to date
    await seedMasterDataIfEmpty();

    // Ensure all dynamic membership plans are seeded
    await seedMembershipPlansIfEmpty();

    const userCount = await User.countDocuments();
    let usersList: any[] = [];
    let createdUsers: any[] = [];

    if (userCount === 0) {
      console.log('Seeding initial demo matrimonial users and profiles...');
      const defaultPassword = await bcrypt.hash('Password123!', 12);

      const demoUsers = [
      {
        fullName: 'Dr. Priya Sharma',
        email: 'priya.sharma@example.com',
        mobile: '+919876543210',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Priya Sharma',
          gender: 'Female' as const,
          dob: new Date('1998-05-14'),
          height: `5' 6"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Brahmin',
          education: 'MD / MS (Medical)',
          degree: 'MBBS, MD Dermatology (AIIMS New Delhi)',
          profession: 'Consultant Dermatologist',
          company: 'Apollo Hospitals',
          workLocation: 'Bengaluru',
          annualIncome: '₹ 35 - 50 Lakhs',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Passionate dermatologist, loves classical music, traveling and exploring new cultures. Looking for an understanding doctor/professional partner who values family and ambition.',
          photos: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Rohan Mehta',
        email: 'rohan.mehta@example.com',
        mobile: '+919876543211',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Rohan Mehta',
          gender: 'Male' as const,
          dob: new Date('1994-11-20'),
          height: `5' 11"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Gujarati',
          religion: 'Hindu',
          caste: 'Vaishnav',
          education: 'MBBS, MD / MS (Medical)',
          degree: 'MBBS, MS General Surgery (KEM Hospital Mumbai)',
          profession: 'General Surgeon',
          company: 'Lilavati Hospital',
          workLocation: 'Mumbai',
          annualIncome: '₹ 45 - 60 Lakhs',
          country: 'India',
          state: 'Maharashtra',
          city: 'Mumbai',
          familyType: 'Joint',
          foodPreference: 'Vegetarian',
          about: 'General surgeon, fitness enthusiast, marathon runner. Seeking a doctor life partner with shared values, kindness, and positivity.',
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
          education: 'MD / MS (Medical)',
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
        fullName: 'Dr. Vikramaditya Singh',
        email: 'vikram.singh@example.com',
        mobile: '+919876543213',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Vikramaditya Singh',
          gender: 'Male' as const,
          dob: new Date('1992-03-17'),
          height: `6' 0"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Hindi',
          religion: 'Hindu',
          caste: 'Rajput',
          education: 'MBBS + MS',
          degree: 'MBBS, MS Orthopedics (SMS Medical College)',
          profession: 'Orthopedic Surgeon',
          company: 'Fortis Hospital',
          workLocation: 'Jaipur',
          annualIncome: '₹ 50 - 75 Lakhs',
          country: 'India',
          state: 'Rajasthan',
          city: 'Jaipur',
          familyType: 'Joint',
          foodPreference: 'Non-Vegetarian',
          about: 'Orthopedic surgeon passionate about sports medicine, heritage preservation and road trips. Seeking a doctor/professional partner to build a beautiful life with.',
          photos: [
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Kavya Iyer',
        email: 'kavya.iyer@example.com',
        mobile: '+919876543215',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Kavya Iyer',
          gender: 'Female' as const,
          dob: new Date('1997-04-12'),
          height: `5' 6"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Tamil',
          religion: 'Hindu',
          caste: 'Iyer',
          education: 'MD / MS (Medical)',
          degree: 'MBBS, MD Radiodiagnosis (Madras Medical College)',
          profession: 'Consultant Radiologist',
          company: 'Apollo Speciality Hospitals',
          workLocation: 'Chennai',
          annualIncome: '₹ 45 - 60 Lakhs',
          country: 'India',
          state: 'Tamil Nadu',
          city: 'Chennai',
          familyType: 'Nuclear',
          foodPreference: 'Vegetarian',
          about: 'Radiologist, classical Carnatic vocalist and yoga practitioner. Looking for an educated, ambitious, and respectful life partner.',
          photos: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
          ],
          primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
          verificationStatus: 'VERIFIED' as const,
        },
      },
      {
        fullName: 'Dr. Siddharth Nair',
        email: 'siddharth.nair@example.com',
        mobile: '+919876543214',
        password: defaultPassword,
        role: 'user' as const,
        verified: true,
        verificationStatus: 'VERIFIED' as const,
        profile: {
          displayName: 'Dr. Siddharth Nair',
          gender: 'Male' as const,
          dob: new Date('1995-07-22'),
          height: `5' 10"`,
          maritalStatus: 'Never Married',
          motherTongue: 'Malayalam',
          religion: 'Hindu',
          caste: 'Nair',
          education: 'MD / MS (Medical)',
          degree: 'MBBS, MD Anesthesiology (Govt Medical College Trivandrum)',
          profession: 'Consultant Anesthesiologist',
          company: 'Yashoda Hospitals',
          workLocation: 'Hyderabad',
          annualIncome: '₹ 45 - 65 Lakhs',
          country: 'India',
          state: 'Telangana',
          city: 'Hyderabad',
          familyType: 'Nuclear',
          foodPreference: 'Non-Vegetarian',
          about: 'Anesthesiologist, avid badminton player and culinary enthusiast. Seeking an ambitious and warm-hearted life partner.',
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

    createdUsers = [];
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

  // Enrich demo Priya Sharma profile with doctor, horoscope, and lifestyle data
  const priyaUser = allUsers.find((u: any) => u.email === 'priya.sharma@example.com');
  if (priyaUser) {
    await Profile.findOneAndUpdate(
      { user: priyaUser._id },
      {
        $set: {
          medicalCollege: 'AIIMS New Delhi',
          medicalUniversity: 'All India Institute of Medical Sciences',
          graduationYear: '2019',
          additionalQualification: 'Fellowship in Dermatosurgery, 2021',
          medicalCouncil: 'Karnataka Medical Council / MCI',
          registrationState: 'Karnataka',
          registrationYear: '2019',
          medicalRegistrationNumber: 'KMC-2019-74892',
          medicalExperience: '6+ Years Experience',
          currentHospital: 'Apollo Hospitals, Bengaluru',
          currentRole: 'Senior Consultant Dermatologist',
          workType: 'Full-Time Consultant',
          currentlyPracticing: true,
          nativePlace: 'Jaipur, Rajasthan',
          familyStatus: 'Upper Middle Class',
          familyValues: 'Moderate',
          familyLocation: 'Bengaluru / Jaipur',
          fatherOccupation: 'Senior Administrative Officer (Retd.)',
          motherOccupation: 'College Professor',
          siblings: '1 Younger Brother (Radiologist)',
          profileManagedBy: 'Self',
          horoscope: {
            timeOfBirth: '07:45 AM',
            placeOfBirth: 'Jaipur, Rajasthan',
            rashi: 'Tula (Libra)',
            nakshatra: 'Chitra',
            lagna: 'Vrishabha (Taurus)',
            manglik: 'Non-Manglik',
            gotra: 'Kashyap',
            horoscopeDocument: '',
          },
          lifestyleInterests: {
            diet: 'Vegetarian',
            smoking: 'Non-Smoker',
            alcohol: 'Non-Drinker',
            exercise: 'Yoga & Morning Walks',
            hobbies: ['Classical Music', 'Traveling', 'Photography', 'Reading'],
            travel: ['Hill Stations', 'Historic Temples'],
            music: ['Indian Classical', 'Sufi', 'Acoustic'],
            reading: ['Medical Literature', 'Philosophy'],
            sports: ['Badminton', 'Swimming'],
            languages: ['English', 'Hindi', 'Marathi'],
            pets: 'Cat Lover',
            otherInterests: 'Art & Cultural Festivals',
          },
        },
      }
    );
  }

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
        supportPhone: '+91 096075 59547',
        tollFreeNumber: '+91 096075 59547',
        officeAddress: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
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
          documentType: 'GOVERNMENT_ID',
          documentName: 'Government Aadhaar Card (Masked)',
          documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
          fileType: 'image/jpeg',
          fileSize: 1024 * 450,
          status: 'APPROVED',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          reviewedByEmail: 'admin@wonderfuljodi.com',
          adminNotes: 'Government ID card verified against official registrar.',
          attemptNumber: 1,
        },
        {
          user: normalUsers[1]._id,
          documentType: 'DEGREE',
          documentName: 'MBA Post-Graduate Degree Certificate',
          documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
          fileType: 'image/jpeg',
          fileSize: 1024 * 820,
          status: 'APPROVED',
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          reviewedByEmail: 'admin@wonderfuljodi.com',
          adminNotes: 'University credentials and convocation degree verified.',
          attemptNumber: 1,
        },
        {
          user: normalUsers[2]._id,
          documentType: 'PROFESSIONAL',
          documentName: 'State Medical Council Registration Certificate',
          documentUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
          fileType: 'image/jpeg',
          fileSize: 1024 * 650,
          status: 'PENDING',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          adminNotes: 'Medical registration certificate pending administrator audit.',
          attemptNumber: 1,
        },
        {
          user: normalUsers[3]._id,
          documentType: 'GOVERNMENT_ID',
          documentName: 'Passport Copy (Pages 1 & 2)',
          documentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800',
          fileType: 'image/jpeg',
          fileSize: 1024 * 910,
          status: 'PENDING',
          submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          adminNotes: 'Submitted for expedited KYC verification.',
          attemptNumber: 1,
        },
        {
          user: normalUsers[4]._id,
          documentType: 'EMPLOYMENT',
          documentName: 'Corporate Work ID & Salary Slip',
          documentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
          fileType: 'image/jpeg',
          fileSize: 1024 * 512,
          status: 'REJECTED',
          submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reviewedByEmail: 'admin@wonderfuljodi.com',
          rejectionReason: 'Document copy unclear or blurry',
          adminNotes: 'Document scan is too blurry to read employee ID and company seal.',
          attemptNumber: 1,
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
        await Shortlist.create({ user: normalUsers[0]._id, profile: profile1._id });
      }
      if (profile2) {
        await Shortlist.create({ user: normalUsers[0]._id, profile: profile2._id });
      }
    }

    // 7. Seed Conversations & Messages
    const { Conversation } = await import('../models/Conversation');
    const { Message } = await import('../models/Message');
    if (normalUsers.length >= 2 && (await Conversation.countDocuments()) === 0) {
      const conv1 = await Conversation.create({
        participants: [normalUsers[0]._id, normalUsers[1]._id],
        lastMessage: 'Hello Priya! Glad to connect on Wonderful Jodi.',
        messageCount: 3,
        status: 'ACTIVE',
        complianceStatus: 'SAFE',
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 30),
      });

      await Message.create([
        {
          conversation: conv1._id,
          sender: normalUsers[1]._id,
          receiver: normalUsers[0]._id,
          content: 'Namaste Priya, saw your profile. Your achievements in tech are truly inspiring!',
          read: true,
          moderationStatus: 'SAFE',
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        },
        {
          conversation: conv1._id,
          sender: normalUsers[0]._id,
          receiver: normalUsers[1]._id,
          content: 'Hello Rohan! Thank you so much. Would love to know more about your work and hobbies.',
          read: true,
          moderationStatus: 'SAFE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
        },
        {
          conversation: conv1._id,
          sender: normalUsers[1]._id,
          receiver: normalUsers[0]._id,
          content: 'Hello Priya! Glad to connect on Wonderful Jodi.',
          read: false,
          moderationStatus: 'SAFE',
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
        },
      ]);

      if (normalUsers.length >= 4) {
        const conv2 = await Conversation.create({
          participants: [normalUsers[2]._id, normalUsers[3]._id],
          lastMessage: 'Sure, looking forward to discussing our family backgrounds.',
          messageCount: 2,
          status: 'ACTIVE',
          complianceStatus: 'SAFE',
          lastActivityAt: new Date(Date.now() - 1000 * 60 * 90),
        });

        await Message.create([
          {
            conversation: conv2._id,
            sender: normalUsers[2]._id,
            receiver: normalUsers[3]._id,
            content: 'Hi Dr. Ananya, your pediatric work in Mumbai is wonderful!',
            read: true,
            moderationStatus: 'SAFE',
            createdAt: new Date(Date.now() - 1000 * 60 * 180),
          },
          {
            conversation: conv2._id,
            sender: normalUsers[3]._id,
            receiver: normalUsers[2]._id,
            content: 'Sure, looking forward to discussing our family backgrounds.',
            read: true,
            moderationStatus: 'SAFE',
            moderationCategory: 'NONE',
            moderationConfidence: 'NONE',
            createdAt: new Date(Date.now() - 1000 * 60 * 90),
          },
        ]);

        const conv3 = await Conversation.create({
          participants: [normalUsers[0]._id, normalUsers[2]._id],
          lastMessage: 'You can call me at 98765 43210',
          messageCount: 3,
          status: 'ACTIVE',
          complianceStatus: 'FLAGGED',
          lastActivityAt: new Date(Date.now() - 1000 * 60 * 15),
        });

        await Message.create([
          {
            conversation: conv3._id,
            sender: normalUsers[0]._id,
            receiver: normalUsers[2]._id,
            content: 'Hello Vikram, nice to connect with you.',
            read: true,
            moderationStatus: 'SAFE',
            moderationCategory: 'NONE',
            moderationConfidence: 'NONE',
            createdAt: new Date(Date.now() - 1000 * 60 * 45),
          },
          {
            conversation: conv3._id,
            sender: normalUsers[2]._id,
            receiver: normalUsers[0]._id,
            content: 'Hello Priya, wonderful profile!',
            read: true,
            moderationStatus: 'SAFE',
            moderationCategory: 'NONE',
            moderationConfidence: 'NONE',
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            conversation: conv3._id,
            sender: normalUsers[2]._id,
            receiver: normalUsers[0]._id,
            content: 'You can call me at 98765 43210',
            read: false,
            moderationStatus: 'FLAGGED',
            moderationCategory: 'PHONE_NUMBER',
            moderationConfidence: 'HIGH',
            moderationScore: 0.99,
            flaggedReason: 'Phone number detected (Indian Mobile Format)',
            createdAt: new Date(Date.now() - 1000 * 60 * 15),
          },
        ]);
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

    // 9. Seed Daily User Visits (Historical Activity Analytics)
    const { DailyUserVisit } = await import('../models/DailyUserVisit');
    const { getFormattedVisitDate } = await import('../services/visitTrackingService');
    if (normalUsers.length >= 4 && (await DailyUserVisit.countDocuments()) === 0) {
      const now = new Date();
      const visitDocs = [];

      // Seed realistic visit distributions across the past 14 days
      for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
        const visitDateObj = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        const visitDateStr = getFormattedVisitDate(visitDateObj);

        // Select a realistic subset of users active on that day
        // For weekend / weekdays variation
        const dayOfWeek = visitDateObj.getDay();
        const activeUserIndices =
          dayOfWeek === 0 || dayOfWeek === 6
            ? [0, 1, 2, 3, 4] // Higher activity on weekends
            : dayOffset % 2 === 0
            ? [0, 1, 3]
            : [1, 2, 3, 4];

        for (const userIdx of activeUserIndices) {
          if (normalUsers[userIdx]) {
            const firstVisitedAt = new Date(visitDateObj.getTime() + (9 * 60 + userIdx * 35) * 60 * 1000);
            const lastVisitedAt = new Date(firstVisitedAt.getTime() + (userIdx * 45 + 30) * 60 * 1000);

            visitDocs.push({
              user: normalUsers[userIdx]._id,
              visitDate: visitDateStr,
              firstVisitedAt,
              lastVisitedAt,
              visitCount: 2 + (userIdx % 4),
              ipAddress: `192.168.1.${10 + userIdx}`,
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
            });
          }
        }
      }

      await DailyUserVisit.insertMany(visitDocs, { ordered: false });
    }

    // Seed realistic demo incomplete registration candidates if none exist
    const regCount = await Registration.countDocuments();
    if (regCount === 0) {
      console.log('Seeding initial demo incomplete registration candidates...');
      const now = new Date();
      const defaultPasswordHash = await bcrypt.hash('Password123!', 12);

      const demoRegistrations = [
        {
          registrationId: 'REG-20260901-A8F92K',
          status: 'IN_PROGRESS' as const,
          currentStep: 2,
          totalSteps: 4,
          completionPercentage: 45,
          candidateName: 'Rahul Sharma',
          email: 'rahul.sharma99@example.com',
          mobile: '9876543220',
          gender: 'Male',
          stepData: {
            basicInfo: {
              fullName: 'Rahul Sharma',
              email: 'rahul.sharma99@example.com',
              mobile: '9876543220',
              passwordHash: defaultPasswordHash,
              gender: 'Male',
              dob: '1995-08-20',
              lookingFor: 'Female',
              agreeTerms: true,
            },
            personalInfo: {
              maritalStatus: 'Never Married',
              motherTongue: 'Hindi',
              religion: 'Hindu',
              caste: 'Brahmin',
              height: `5' 11"`,
              city: 'Mumbai',
              state: 'Maharashtra',
              country: 'India',
            },
            educationProfession: {},
            familyDetails: {},
            preferences: {},
            photos: {},
            rawFormData: {
              fullName: 'Rahul Sharma',
              email: 'rahul.sharma99@example.com',
              mobile: '9876543220',
              city: 'Mumbai',
            },
          },
          startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          lastActiveAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
          ipAddress: '192.168.1.45',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0',
        },
        {
          registrationId: 'REG-20260901-B3X77M',
          status: 'IN_PROGRESS' as const,
          currentStep: 3,
          totalSteps: 4,
          completionPercentage: 70,
          candidateName: 'Neha Kulkarni',
          email: 'neha.kulkarni@example.com',
          mobile: '9822334455',
          gender: 'Female',
          stepData: {
            basicInfo: {
              fullName: 'Neha Kulkarni',
              email: 'neha.kulkarni@example.com',
              mobile: '9822334455',
              passwordHash: defaultPasswordHash,
              gender: 'Female',
              dob: '1997-03-12',
              lookingFor: 'Male',
              agreeTerms: true,
            },
            personalInfo: {
              maritalStatus: 'Never Married',
              motherTongue: 'Marathi',
              religion: 'Hindu',
              caste: 'Maratha',
              height: `5' 5"`,
              city: 'Pune',
              state: 'Maharashtra',
              country: 'India',
              foodPreference: 'Vegetarian',
            },
            educationProfession: {
              education: 'MBA / PGDM (IIM / Top B-School)',
              degree: 'MBA in Marketing',
              profession: 'Product Director / Manager',
              company: 'Fintech Solutions Ltd',
              workLocation: 'Pune',
              annualIncome: '₹ 20 - 30 Lakhs',
            },
            familyDetails: {},
            preferences: {},
            photos: {},
            rawFormData: {
              fullName: 'Neha Kulkarni',
              email: 'neha.kulkarni@example.com',
              mobile: '9822334455',
              city: 'Pune',
              profession: 'Product Director / Manager',
            },
          },
          startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
          lastActiveAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
          ipAddress: '192.168.1.88',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
        },
        {
          registrationId: 'REG-20260901-C9Q14P',
          status: 'STARTED' as const,
          currentStep: 1,
          totalSteps: 4,
          completionPercentage: 25,
          candidateName: 'Aditya Kapoor',
          email: 'aditya.kapoor@example.com',
          mobile: '9811223344',
          gender: 'Male',
          stepData: {
            basicInfo: {
              fullName: 'Aditya Kapoor',
              email: 'aditya.kapoor@example.com',
              mobile: '9811223344',
              passwordHash: defaultPasswordHash,
              gender: 'Male',
              dob: '1994-11-05',
              lookingFor: 'Female',
              agreeTerms: true,
            },
            personalInfo: {},
            educationProfession: {},
            familyDetails: {},
            preferences: {},
            photos: {},
            rawFormData: {
              fullName: 'Aditya Kapoor',
              email: 'aditya.kapoor@example.com',
              mobile: '9811223344',
            },
          },
          startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
          lastActiveAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      ];

      await Registration.insertMany(demoRegistrations, { ordered: false });
    }

    console.log(`Successfully verified and seeded ${allUsers.length} users, profiles, subscriptions, verifications, daily visits, and platform settings!`);
    console.log('Demo Login Credentials:');
    console.log('  User:  priya.sharma@example.com / Password123!');
    console.log('  User:  rohan.mehta@example.com  / Password123!');
    console.log('  Admin: admin@wonderfuljodi.com  / Password123!');
  } catch (error) {
    console.error('Error during database seed:', error);
  }
}

/**
 * Ensures all dynamic membership plans exist in MongoDB.
 * If empty, seeds the 5 standard matrimonial plans with complete pricing and promotional metadata.
 */
export async function seedMembershipPlansIfEmpty() {
  try {
    const existingCount = await MembershipPlan.countDocuments();
    if (existingCount > 0) {
      // Ensure any existing plan has originalPrice / discountedPrice properly populated
      const plans = await MembershipPlan.find();
      for (const p of plans) {
        let changed = false;
        if (p.originalPrice === undefined || p.originalPrice === null) {
          p.originalPrice = p.price || 0;
          changed = true;
        }
        if (p.discountedPrice === undefined || p.discountedPrice === null) {
          p.discountedPrice = p.price || 0;
          changed = true;
        }
        if (!p.billingPeriod) {
          p.billingPeriod = p.durationMonths ? `${p.durationMonths} Months` : 'Forever Free';
          changed = true;
        }
        if (!p.durationDays) {
          p.durationDays = p.durationMonths ? p.durationMonths * 30 : 3650;
          changed = true;
        }
        if (changed) {
          await p.save();
        }
      }
      return;
    }

    console.log('Seeding initial dynamic membership plans...');
    const defaultPlans = [
      {
        name: 'Free',
        slug: 'free',
        key: 'FREE',
        planId: 'plan_free',
        description: 'Explore basic doctor profiles and create your professional matrimonial profile for free.',
        originalPrice: 0,
        discountedPrice: 0,
        price: 0,
        currency: 'INR',
        billingPeriod: 'Forever Free',
        durationDays: 3650,
        durationMonths: null,
        profileViewLimit: 'limited',
        contactRequestLimit: 0,
        isUnlimitedContact: false,
        fairUsageEnabled: false,
        features: [
          'Limited profile browsing',
          'Create and manage profile',
          'Receive profile interest requests',
          'Basic search',
          'Shortlist profiles',
          'Platform messaging where allowed',
          'Contact details remain hidden',
        ],
        isActive: true,
        isPopular: false,
        displayOrder: 1,
        ctaText: 'Continue Free',
        ctaAction: 'register',
        isSeasonalOffer: false,
      },
      {
        name: 'Doctor Connect',
        slug: 'doctor-connect',
        key: 'DOCTOR_CONNECT',
        planId: 'plan_doctor_connect',
        description: 'Direct doctor connections with 25 verified contact requests and unlimited browsing.',
        originalPrice: 7999,
        discountedPrice: 5999,
        price: 5999,
        currency: 'INR',
        billingPeriod: '3 Months',
        durationDays: 90,
        durationMonths: 3,
        profileViewLimit: 'unlimited',
        contactRequestLimit: 25,
        isUnlimitedContact: false,
        fairUsageEnabled: false,
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
        isActive: true,
        isPopular: false,
        displayOrder: 2,
        ctaText: 'Choose Doctor Connect',
        ctaAction: 'order',
        isSeasonalOffer: false,
      },
      {
        name: 'Premium',
        slug: 'premium',
        key: 'PREMIUM',
        planId: 'plan_premium',
        description: 'Best plan for serious matrimonial matches with high response rate.',
        originalPrice: 4999,
        discountedPrice: 2999,
        price: 2999,
        currency: 'INR',
        billingPeriod: '3 Months',
        durationDays: 90,
        durationMonths: 3,
        profileViewLimit: 'unlimited',
        contactRequestLimit: 60,
        isUnlimitedContact: false,
        fairUsageEnabled: false,
        features: [
          'Unlimited Doctor Profile Views',
          'Send Unlimited Interests',
          'Priority Search Ranking',
          'Chat with Matches',
          'View Contact Details',
          '60 Contact Requests',
          'Verified Doctor Badge',
          'Priority Matching Support',
        ],
        isActive: true,
        isPopular: true,
        displayOrder: 3,
        seasonalLabel: 'Wedding Season Offer',
        seasonalDiscount: 40,
        isSeasonalOffer: true,
        badge: '⭐ MOST POPULAR',
        ctaText: 'Choose Premium',
        ctaAction: 'order',
      },
      {
        name: 'Priority Matchmaking',
        slug: 'priority-matchmaking',
        key: 'PRIORITY_MATCHMAKING',
        planId: 'plan_priority_matchmaking',
        description: 'Personalized assisted matchmaking with dedicated relationship manager and curated introductions.',
        originalPrice: 32999,
        discountedPrice: 24999,
        price: 24999,
        currency: 'INR',
        billingPeriod: '6 Months',
        durationDays: 180,
        durationMonths: 6,
        profileViewLimit: 'unlimited',
        contactRequestLimit: 120,
        isUnlimitedContact: false,
        fairUsageEnabled: false,
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
        isActive: true,
        isPopular: false,
        displayOrder: 4,
        badge: '👑 Priority Assisted',
        ctaText: 'Choose Priority Matchmaking',
        ctaAction: 'order',
        isSeasonalOffer: false,
      },
      {
        name: 'Exclusive Concierge',
        slug: 'exclusive-concierge',
        key: 'EXCLUSIVE_CONCIERGE',
        planId: 'plan_exclusive_concierge',
        description: 'Elite concierge service with senior matchmaking consultant, family coordination, and meeting setup.',
        originalPrice: 59999,
        discountedPrice: 49999,
        price: 49999,
        currency: 'INR',
        billingPeriod: '6 Months',
        durationDays: 180,
        durationMonths: 6,
        profileViewLimit: 'unlimited',
        contactRequestLimit: -1,
        isUnlimitedContact: true,
        fairUsageEnabled: true,
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
        isActive: true,
        isPopular: false,
        displayOrder: 5,
        badge: '💎 Premium Concierge',
        ctaText: 'Talk to Our Matchmaking Team',
        ctaAction: 'contact',
        disclaimer: '*Unlimited Contact Access is subject to Fair Usage Policy and member consent.',
        isSeasonalOffer: false,
      },
    ];

    await MembershipPlan.insertMany(defaultPlans);
    console.log('Successfully seeded 5 dynamic membership plans into database!');
  } catch (error) {
    console.error('Error seeding membership plans:', error);
  }
}

