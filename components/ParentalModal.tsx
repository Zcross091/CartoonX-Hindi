'use client';

import React, { useState } from 'react';
import { Lock, Unlock, X, ShieldAlert, Check } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';

interface ParentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'set' | 'verify';
  onSuccess?: () => void;
}

export const ParentalModal: React.FC<ParentalModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSuccess
}) => {
  const { parentalPin, setParentalPin, unlockParental } = useSettingsStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: number) => {
    if (mode === 'verify') {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        setError('');
        if (next.length === 4) {
          const ok = unlockParental(next);
          if (ok) {
            if (onSuccess) onSuccess();
            onClose();
          } else {
            setError('Incorrect PIN. Please try again.');
            setPin('');
          }
        }
      }
    } else {
      // Set Mode
      if (step === 'enter') {
        if (pin.length < 4) {
          const next = pin + num;
          setPin(next);
          if (next.length === 4) {
            setStep('confirm');
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const next = confirmPin + num;
          setConfirmPin(next);
          if (next.length === 4) {
            if (next === pin) {
              setParentalPin(next);
              if (onSuccess) onSuccess();
              onClose();
            } else {
              setError('PINs do not match. Start over.');
              setPin('');
              setConfirmPin('');
              setStep('enter');
            }
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
    setError('');
  };

  const currentDisplayPin = step === 'enter' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-500 p-0.5 shadow-lg shadow-pink-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            {mode === 'verify' ? (
              <Lock className="w-8 h-8 text-amber-400" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-pink-400" />
            )}
          </div>
        </div>

        <h3 className="text-xl font-black text-white mb-1">
          {mode === 'verify'
            ? 'Parental Control Unlock'
            : step === 'enter'
            ? 'Set a 4-Digit Parent PIN'
            : 'Confirm Your 4-Digit PIN'}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          {mode === 'verify'
            ? 'Enter your PIN to manage downloads and system settings'
            : 'Protect settings and limits from curious young kids'}
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                currentDisplayPin.length > idx
                  ? 'bg-amber-400 border-amber-400 scale-125 shadow-sm shadow-amber-400'
                  : 'border-slate-600 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-400 mb-4 animate-shake">
            {error}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl transition-all shadow-md flex items-center justify-center border border-slate-700/50"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress(0)}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl transition-all shadow-md flex items-center justify-center border border-slate-700/50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm transition-all flex items-center justify-center border border-slate-700/50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

