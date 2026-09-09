'use client';

import React from 'react';
import { Sparkles, Stethoscope, Crown, Layers, Check } from 'lucide-react';

export type BiodataTemplateId = 'traditional' | 'modern' | 'elegant' | 'doctor_professional';

interface TemplateOption {
  id: BiodataTemplateId;
  name: string;
  subtitle: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgPreview: string;
  borderPreview: string;
  description: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'doctor_professional',
    name: 'Doctor Professional',
    subtitle: 'Signature Medical Matrimony',
    tag: 'RECOMMENDED FOR DOCTORS',
    icon: Stethoscope,
    accentColor: '#991B1B',
    bgPreview: 'from-rose-50 to-red-100/60',
    borderPreview: 'border-rose-300',
    description: 'Highlights MBBS/MD degrees, medical council registration, hospital affiliations & clinical practice.',
  },
  {
    id: 'traditional',
    name: 'Traditional Indian',
    subtitle: 'Auspicious Heritage Style',
    tag: 'CLASSIC & ORNATE',
    icon: Sparkles,
    accentColor: '#7B1113',
    bgPreview: 'from-amber-50 to-orange-100/60',
    borderPreview: 'border-amber-300',
    description: 'Deep maroon and saffron accents with auspicious invocation, floral framing & cultural elegance.',
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    subtitle: 'Clean & Contemporary',
    tag: 'CLEAN & COMPACT',
    icon: Layers,
    accentColor: '#0F766E',
    bgPreview: 'from-teal-50 to-emerald-100/60',
    borderPreview: 'border-teal-300',
    description: 'Sophisticated teal palette with streamlined cards, modern typography & clean dividers.',
  },
  {
    id: 'elegant',
    name: 'Royal Navy & Gold',
    subtitle: 'Executive Luxury Profile',
    tag: 'PREMIUM LUXURY',
    icon: Crown,
    accentColor: '#0A192F',
    bgPreview: 'from-slate-100 to-amber-100/40',
    borderPreview: 'border-slate-400',
    description: 'Midnight blue with antique gold flourishes, classic serif headings & distinguished layout.',
  },
];

interface TemplateSelectorProps {
  selectedTemplateId: BiodataTemplateId;
  onSelectTemplate: (templateId: BiodataTemplateId) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelectTemplate }: TemplateSelectorProps) {
  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Choose Biodata Template</h3>
          <p className="text-xs text-slate-500">Select an aesthetic suited to your family and professional preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TEMPLATES.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          const Icon = tpl.icon;

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl.id)}
              className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                isSelected
                  ? 'border-[#E51F3E] bg-white ring-2 ring-[#E51F3E]/20 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Selected indicator pill */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#E51F3E] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3" />
                </div>
              )}

              <div className="space-y-2">
                {/* Visual miniature thumbnail */}
                <div
                  className={`h-20 rounded-xl bg-gradient-to-br ${tpl.bgPreview} border ${tpl.borderPreview} p-2 flex flex-col justify-between relative overflow-hidden`}
                >
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/80 text-slate-800 self-start shadow-2xs">
                    {tpl.tag}
                  </span>
                  <div className="flex items-center gap-1.5 self-end">
                    <Icon className="w-5 h-5 text-slate-700/80" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#E51F3E] transition">
                    {tpl.name}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500">{tpl.subtitle}</p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                  {tpl.description}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span
                  className={`font-semibold ${
                    isSelected ? 'text-[#E51F3E]' : 'text-slate-500'
                  }`}
                >
                  {isSelected ? 'Applied ✓' : 'Select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
