import Link from 'next/link';
import { ShieldCheck, Heart, MessageSquare, MapPin, Briefcase, GraduationCap, ArrowLeft, CheckCircle2, User } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const mockProfilesMap: Record<string, any> = {
  p1: {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    state: 'Maharashtra',
    education: 'M.Tech in Computer Science (IIT Bombay)',
    profession: 'Senior Software Engineer at Global Tech',
    verificationStatus: 'VERIFIED',
    about: 'I am a passionate software professional with a blend of modern thinking and deep family values. I love traveling, exploring classical music, and spending quality weekend time with family.',
    primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Brahmin',
    height: "5' 5\"",
    diet: 'Vegetarian',
  },
  p2: {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    state: 'Karnataka',
    education: 'MBA (IIM Ahmedabad) & B.Tech',
    profession: 'Product Director',
    verificationStatus: 'VERIFIED',
    about: 'Ambitious product leader working with a top fintech startup in Bengaluru. Looking for an educated, understanding partner with whom I can share life goals and adventurous travels.',
    primaryPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Vaishya / Jain',
    height: "5' 11\"",
    diet: 'Eggetarian',
  },
  p3: {
    _id: 'p3',
    displayName: 'Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    state: 'Delhi',
    education: 'MBBS, MD Cardiology (AIIMS Delhi)',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Kayastha',
    height: "5' 6\"",
    diet: 'Non-Vegetarian',
  },
};

export default async function ProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  let profile = mockProfilesMap[id];

  if (!profile) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/profiles/${id}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        profile = json.data;
      }
    } catch (e) {
      // fallback
    }
  }

  if (!profile) {
    profile = mockProfilesMap['p1'];
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Back Link */}
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search Results
        </Link>

        {/* Top Header Card */}
        <section className="rounded-3xl bg-white p-8 border border-rose-100 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* Photo */}
            <div className="lg:w-1/3">
              <div className="relative h-80 rounded-3xl overflow-hidden bg-slate-100 shadow-md">
                <img
                  src={profile.primaryPhoto}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Member
                </span>
              </div>
            </div>

            {/* Profile Brief */}
            <div className="lg:w-2/3 space-y-4">
              <div>
                <span className="text-xs uppercase font-semibold text-red-600 tracking-wider">
                  Matrimonial Profile ID #{id.toUpperCase()}
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                  {profile.displayName}
                </h1>
                <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {profile.city}, {profile.state || 'India'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-slate-100 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Education</span>
                  <span className="font-semibold text-slate-800">{profile.education}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Profession</span>
                  <span className="font-semibold text-slate-800">{profile.profession}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Marital Status</span>
                  <span className="font-semibold text-slate-800">{profile.maritalStatus || 'Never Married'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Religion & Caste</span>
                  <span className="font-semibold text-slate-800">{profile.religion} ({profile.caste || 'Open'})</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-4">
                <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 transition">
                  <Heart className="w-4 h-4 fill-white" />
                  Send Express Interest
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/50 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-rose-100 transition">
                  <MessageSquare className="w-4 h-4" />
                  Easy Chat
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Info Grid */}
        <section className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-white p-8 border border-rose-100 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">About {profile.displayName}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {profile.about}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Personal & Lifestyle Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Height</span>
                  <span className="font-bold text-slate-800">{profile.height || "5' 6\""}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Diet</span>
                  <span className="font-bold text-slate-800">{profile.diet || 'Vegetarian'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Verification</span>
                  <span className="font-bold text-emerald-600">ID & Photo Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side Card */}
          <div className="rounded-3xl bg-gradient-to-b from-rose-50 to-white p-8 border border-rose-200/60 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Safety & Trust First</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Wonderful Jodi ensures that all communication and photo viewing is protected by your personal privacy settings.
            </p>
            <div className="space-y-2 pt-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protected Phone Number</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Family Credentials</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
