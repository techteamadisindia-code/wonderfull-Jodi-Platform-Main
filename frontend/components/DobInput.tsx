'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateDateOfBirth } from '../lib/doctorConstants';

interface DobInputProps {
  value?: string; // Expects YYYY-MM-DD or empty
  onChange: (isoDate: string, isValid: boolean) => void;
  required?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
  error?: string | null;
  disabled?: boolean;
}

export function DobInput({
  value = '',
  onChange,
  required = true,
  label = 'Date of Birth',
  helperText = 'Enter your date of birth (DD / MM / YYYY)',
  className = '',
  error: externalError,
  disabled = false,
}: DobInputProps) {
  // Split internal state into Day, Month, Year
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Sync from incoming ISO string `YYYY-MM-DD`
  useEffect(() => {
    if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
      setLocalError(null);
    } else if (!value) {
      setDay('');
      setMonth('');
      setYear('');
      setLocalError(null);
    }
  }, [value]);

  // Validate whenever day, month, or year changes
  const handlePartChange = (newDay: string, newMonth: string, newYear: string, triggerTouch = true) => {
    if (triggerTouch) setTouched(true);

    const cleanDay = newDay.replace(/\D/g, '').slice(0, 2);
    const cleanMonth = newMonth.replace(/\D/g, '').slice(0, 2);
    const cleanYear = newYear.replace(/\D/g, '').slice(0, 4);

    setDay(cleanDay);
    setMonth(cleanMonth);
    setYear(cleanYear);

    // If empty and not required
    if (!cleanDay && !cleanMonth && !cleanYear) {
      setLocalError(null);
      onChange('', !required);
      return;
    }

    // Check if partial
    if (cleanYear.length > 0 && cleanYear.length < 4 && (cleanDay.length === 2 && cleanMonth.length === 2)) {
      setLocalError('Year must contain exactly 4 digits.');
      onChange('', false);
      return;
    }

    if (cleanDay.length === 2 && cleanMonth.length === 2 && cleanYear.length === 4) {
      const dNum = parseInt(cleanDay, 10);
      const mNum = parseInt(cleanMonth, 10);
      const yNum = parseInt(cleanYear, 10);

      if (dNum < 1 || dNum > 31 || mNum < 1 || mNum > 12) {
        setLocalError('Please enter a valid date of birth.');
        onChange('', false);
        return;
      }

      const isoStr = `${cleanYear}-${cleanMonth.padStart(2, '0')}-${cleanDay.padStart(2, '0')}`;
      const parsedDate = new Date(isoStr);
      if (isNaN(parsedDate.getTime())) {
        setLocalError('Please enter a valid date of birth.');
        onChange('', false);
        return;
      }

      if (parsedDate > new Date()) {
        setLocalError('Date of birth cannot be in the future.');
        onChange('', false);
        return;
      }

      const validation = validateDateOfBirth(isoStr);
      if (!validation.isValid) {
        setLocalError(validation.error || 'Please enter a valid date of birth.');
        onChange('', false);
      } else {
        setLocalError(null);
        onChange(validation.formattedDate || isoStr, true);
      }
    } else {
      if (cleanDay || cleanMonth || cleanYear) {
        if (cleanYear.length === 4) {
          setLocalError('Please complete Day (DD) and Month (MM).');
        } else {
          setLocalError(null);
        }
      }
      onChange('', false);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    handlePartChange(val, month, year);
    if (val.length === 2 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    handlePartChange(day, val, year);
    if (val.length === 2 && yearRef.current) {
      yearRef.current.focus();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    handlePartChange(day, month, val);
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickerVal = e.target.value; // YYYY-MM-DD
    if (pickerVal && /^\d{4}-\d{2}-\d{2}$/.test(pickerVal)) {
      const [y, m, d] = pickerVal.split('-');
      handlePartChange(d, m, y, true);
    }
  };

  const isCompleteAndValid = day.length === 2 && month.length === 2 && year.length === 4 && !localError;
  const displayError = externalError || (touched ? localError : null);

  // Dynamic max date calculation (no future dates)
  const maxYear = new Date().getFullYear();
  const maxIsoDate = new Date().toISOString().split('T')[0];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 block">
            {label} {required && <span className="text-[#E51F3E]">*</span>}
          </label>
          <span className="text-[11px] text-slate-400 font-medium">DD / MM / YYYY</span>
        </div>
      )}

      {/* 3-Part Manual Numeric Inputs with Calendar Picker Icon */}
      <div
        className={`flex items-center gap-1.5 p-1 rounded-2xl bg-white border transition shadow-2xs ${
          displayError
            ? 'border-rose-300 ring-2 ring-rose-100'
            : isCompleteAndValid
            ? 'border-emerald-300 ring-2 ring-emerald-50'
            : 'border-slate-200 focus-within:border-[#E51F3E] focus-within:ring-2 focus-within:ring-[#E51F3E]/10'
        } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
      >
        {/* Day Input */}
        <div className="flex-1 min-w-[50px]">
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="DD"
            value={day}
            disabled={disabled}
            onChange={handleDayChange}
            onBlur={() => setTouched(true)}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
          />
        </div>

        <span className="text-slate-300 font-bold select-none">/</span>

        {/* Month Input */}
        <div className="flex-1 min-w-[50px]">
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="MM"
            value={month}
            disabled={disabled}
            onChange={handleMonthChange}
            onBlur={() => setTouched(true)}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
          />
        </div>

        <span className="text-slate-300 font-bold select-none">/</span>

        {/* Year Input (Strictly Max 4 Digits) */}
        <div className="flex-[1.4] min-w-[70px]">
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="YYYY"
            value={year}
            disabled={disabled}
            onChange={handleYearChange}
            onBlur={() => setTouched(true)}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
          />
        </div>

        {/* Calendar Picker Trigger */}
        <div className="relative shrink-0 pr-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => hiddenDateInputRef.current?.showPicker?.() || hiddenDateInputRef.current?.click()}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-[#E51F3E] flex items-center justify-center transition cursor-pointer"
            title="Choose from calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <input
            ref={hiddenDateInputRef}
            type="date"
            max={maxIsoDate}
            min="1940-01-01"
            value={isCompleteAndValid ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : ''}
            onChange={handleDatePickerChange}
            className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Validation / Helper Feedback */}
      {displayError ? (
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>✕ {displayError}</span>
        </p>
      ) : isCompleteAndValid ? (
        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            ✓ Valid Date of Birth ({(() => {
              const d = parseInt(day, 10);
              const m = parseInt(month, 10);
              const y = parseInt(year, 10);
              const today = new Date();
              let age = today.getFullYear() - y;
              const monthDiff = (today.getMonth() + 1) - m;
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
                age--;
              }
              return age;
            })()} years old)
          </span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
}
