import React from 'react';
import Link from 'next/link';
import { Heart, ArrowLeft, Star, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Success Stories - Wonderful Jodi',
  description: 'Read real wedding and happy matrimonial stories from couples who found love on Wonderful Jodi.',
};

export default function SuccessStoriesPage() {
  const stories = [
    {
      names: 'Dr. Rohan & Dr. Ananya',
      location: 'Pune & Mumbai',
      role: 'Cardiologist & General Surgeon',
      story:
        'We both had demanding hospital residency schedules and found it difficult to attend traditional matchmaking events. Wonderful Jodi’s verified medical background and flexible communication helped us connect effortlessly. We celebrated our wedding in December!',
      image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
    },
    {
      names: 'Siddharth & Priya',
      location: 'Bengaluru',
      role: 'Fintech Founder & Senior Software Engineer',
      story:
        'Finding someone who shared our core family values while embracing ambitious career goals was our primary priority. Wonderful Jodi’s verified profiles gave our parents absolute peace of mind.',
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    },
  ];

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#E51F3E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-extrabold text-[#E51F3E] bg-[#FCECEE] px-3.5 py-1 rounded-full">
            <Heart className="w-3 h-3 fill-[#E51F3E]" />
            Real Weddings
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
            Happy Matrimonial <span className="text-[#E51F3E]">Success Stories</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Celebrating over 50,000+ educated professionals and families who found their lifelong partner on Wonderful Jodi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stories.map((s, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden border border-rose-100 shadow-sm flex flex-col">
              <div className="h-60 w-full overflow-hidden bg-slate-100 relative">
                <img src={s.image} alt={s.names} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>Married</span>
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-slate-900">{s.names}</h3>
                  <p className="text-xs font-semibold text-[#E51F3E]">{s.role} • {s.location}</p>
                  <p className="text-xs text-slate-600 leading-relaxed pt-2">"{s.story}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
