'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  gender?: string;
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
  gender,
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

  // Track the last value emitted to parent to prevent re-render loop/wiping
  const lastEmittedValueRef = useRef<string>('');
  const isTypingRef = useRef<boolean>(false);

  // Sync from incoming ISO string `YYYY-MM-DD` or reset when externally cleared
  useEffect(() => {
    // If the change came from our own onChange emission, skip overwriting local state
    if (value === lastEmittedValueRef.current && isTypingRef.current) {
      return;
    }

    if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
      setLocalError(null);
      lastEmittedValueRef.current = value;
    } else if (!value) {
      // If external value is completely empty and user is not currently typing in a field
      if (!isTypingRef.current) {
        setDay('');
        setMonth('');
        setYear('');
        setLocalError(null);
        lastEmittedValueRef.current = '';
      }
    }
  }, [value]);

  // Core validation & emission logic
  const handlePartChange = useCallback(
    (newDay: string, newMonth: string, newYear: string, triggerTouch = true) => {
      if (triggerTouch) setTouched(true);
      isTypingRef.current = true;

      const cleanDay = newDay.replace(/\D/g, '').slice(0, 2);
      const cleanMonth = newMonth.replace(/\D/g, '').slice(0, 2);
      const cleanYear = newYear.replace(/\D/g, '').slice(0, 4);

      setDay(cleanDay);
      setMonth(cleanMonth);
      setYear(cleanYear);

      // If all fields are cleared
      if (!cleanDay && !cleanMonth && !cleanYear) {
        setLocalError(null);
        lastEmittedValueRef.current = '';
        onChange('', !required);
        setTimeout(() => {
          isTypingRef.current = false;
        }, 100);
        return;
      }

      // Check for partial year
      if (cleanYear.length > 0 && cleanYear.length < 4 && cleanDay.length === 2 && cleanMonth.length === 2) {
        setLocalError('Date of birth year must be exactly 4 digits.');
        lastEmittedValueRef.current = '';
        onChange('', false);
        return;
      }

      // Complete date entered: validate full calendar date
      if (cleanDay.length === 2 && cleanMonth.length === 2 && cleanYear.length === 4) {
        const dNum = parseInt(cleanDay, 10);
        const mNum = parseInt(cleanMonth, 10);

        if (dNum < 1 || dNum > 31) {
          setLocalError('Please enter a valid day between 01 and 31.');
          lastEmittedValueRef.current = '';
          onChange('', false);
          return;
        }

        if (mNum < 1 || mNum > 12) {
          setLocalError('Please enter a valid month between 01 and 12.');
          lastEmittedValueRef.current = '';
          onChange('', false);
          return;
        }

        const isoStr = `${cleanYear}-${cleanMonth.padStart(2, '0')}-${cleanDay.padStart(2, '0')}`;
        const validation = validateDateOfBirth(isoStr, gender);

        if (!validation.isValid) {
          setLocalError(validation.error || 'Please enter a valid date of birth.');
          lastEmittedValueRef.current = '';
          onChange('', false);
        } else {
          setLocalError(null);
          const normalized = validation.formattedDate || isoStr;
          lastEmittedValueRef.current = normalized;
          onChange(normalized, true);
        }
      } else {
        // Intermediate typing state
        if (cleanDay || cleanMonth || cleanYear) {
          if (cleanYear.length === 4 && (cleanDay.length < 2 || cleanMonth.length < 2)) {
            setLocalError('Please enter both Day (DD) and Month (MM).');
          } else {
            setLocalError(null);
          }
        }
        lastEmittedValueRef.current = '';
        onChange('', false);
      }
    },
    [required, gender, onChange]
  );

  // Day Input Handler
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    handlePartChange(val, month, year);
    if (val.length === 2 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  // Month Input Handler
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    handlePartChange(day, val, year);
    if (val.length === 2 && yearRef.current) {
      yearRef.current.focus();
    }
  };

  // Year Input Handler
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    handlePartChange(day, month, val);
  };

  // Backspace and Arrow Key Navigation
  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === day.length && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !month && dayRef.current) {
      e.preventDefault();
      dayRef.current.focus();
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && dayRef.current) {
      dayRef.current.focus();
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === month.length && yearRef.current) {
      yearRef.current.focus();
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !year && monthRef.current) {
      e.preventDefault();
      monthRef.current.focus();
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  // Paste Event Handler (supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or DDMMYYYY)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    if (!text) return;

    let pDay = '';
    let pMonth = '';
    let pYear = '';

    // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      pDay = dmyMatch[1].padStart(2, '0');
      pMonth = dmyMatch[2].padStart(2, '0');
      pYear = dmyMatch[3];
    } else {
      // Match YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = text.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (ymdMatch) {
        pYear = ymdMatch[1];
        pMonth = ymdMatch[2].padStart(2, '0');
        pDay = ymdMatch[3].padStart(2, '0');
      } else {
        // Match 8 contiguous digits: DDMMYYYY
        const rawMatch = text.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (rawMatch) {
          pDay = rawMatch[1];
          pMonth = rawMatch[2];
          pYear = rawMatch[3];
        }
      }
    }

    if (pDay && pMonth && pYear) {
      e.preventDefault();
      handlePartChange(pDay, pMonth, pYear, true);
      yearRef.current?.focus();
    }
  };

  // Optional Calendar Picker Handler
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
  const maxIsoDate = new Date().toISOString().split('T')[0];

  // Age calculation for UI feedback
  const calculatedAge = (() => {
    if (!isCompleteAndValid) return null;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const today = new Date();
    let calculated = today.getFullYear() - y;
    const monthDiff = today.getMonth() + 1 - m;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
      calculated--;
    }
    return calculated;
  })();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 block">
            {label} {required && <span className="text-[#E51F3E]">*</span>}
          </label>
          <span className="text-[11px] text-slate-400 font-semibold tracking-wider">DD / MM / YYYY</span>
        </div>
      )}

      {/* 3-Part Manual Numeric Inputs with Optional Calendar Picker Icon */}
      <div
        className={`flex items-center gap-1.5 p-1 rounded-2xl bg-white border transition shadow-2xs ${
          displayError
            ? 'border-rose-300 ring-2 ring-rose-100'
            : isCompleteAndValid
            ? 'border-emerald-300 ring-2 ring-emerald-50'
            : 'border-slate-200 focus-within:border-[#E51F3E] focus-within:ring-2 focus-within:ring-[#E51F3E]/10'
        } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
      >
        {/* Day Input [ DD ] */}
        <div className="flex-1 min-w-[52px]">
          <input
            ref={dayRef}
            id="dob_day"
            name="dob_day"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="DD"
            value={day}
            disabled={disabled}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            onChange={handleDayChange}
            onKeyDown={handleDayKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              setTouched(true);
              isTypingRef.current = false;
            }}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
            aria-label="Day of birth"
          />
        </div>

        <span className="text-slate-300 font-bold select-none text-base">/</span>

        {/* Month Input [ MM ] */}
        <div className="flex-1 min-w-[52px]">
          <input
            ref={monthRef}
            id="dob_month"
            name="dob_month"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="MM"
            value={month}
            disabled={disabled}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            onChange={handleMonthChange}
            onKeyDown={handleMonthKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              setTouched(true);
              isTypingRef.current = false;
            }}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
            aria-label="Month of birth"
          />
        </div>

        <span className="text-slate-300 font-bold select-none text-base">/</span>

        {/* Year Input [ YYYY ] */}
        <div className="flex-[1.4] min-w-[72px]">
          <input
            ref={yearRef}
            id="dob_year"
            name="dob_year"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="YYYY"
            value={year}
            disabled={disabled}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            onChange={handleYearChange}
            onKeyDown={handleYearKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              setTouched(true);
              isTypingRef.current = false;
            }}
            className="w-full text-center py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 bg-transparent focus:outline-none"
            aria-label="Year of birth"
          />
        </div>

        {/* Optional Calendar Picker Trigger */}
        <div className="relative shrink-0 pr-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => hiddenDateInputRef.current?.showPicker?.() || hiddenDateInputRef.current?.click()}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-[#E51F3E] flex items-center justify-center transition cursor-pointer"
            title="Choose from calendar (optional)"
            aria-label="Choose date from calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <input
            ref={hiddenDateInputRef}
            type="date"
            max={maxIsoDate}
            min="1920-01-01"
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
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>✕ {displayError}</span>
        </p>
      ) : isCompleteAndValid ? (
        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>✓ Valid Date of Birth ({calculatedAge} years old)</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
}
