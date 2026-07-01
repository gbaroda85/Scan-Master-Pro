import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PinModalProps {
  open: boolean;
  mode: 'set' | 'verify' | 'remove';
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

const TITLES = {
  set: 'Set Document PIN',
  verify: 'Enter PIN to Open',
  remove: 'Enter PIN to Remove Lock',
};

export function PinModal({ open, mode, onSuccess, onCancel }: PinModalProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [confirmDigits, setConfirmDigits] = useState(['', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setConfirmDigits(['', '', '', '']);
      setStep('enter');
      setError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleDigit = (
    idx: number,
    val: string,
    arr: string[],
    setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...arr];
    next[idx] = v;
    setArr(next);
    setError('');
    if (v && idx < 3) {
      refs.current[idx + 1]?.focus();
    }
    // Auto-submit when all 4 filled
    if (v && idx === 3) {
      const pin = [...next].join('');
      if (pin.length === 4) {
        setTimeout(() => handleNext([...next].join(''), arr === confirmDigits), 60);
      }
    }
  };

  const handleKey = (
    e: React.KeyboardEvent,
    idx: number,
    arr: string[],
    setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === 'Backspace') {
      if (!arr[idx] && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else {
        const next = [...arr];
        next[idx] = '';
        setArr(next);
      }
    }
  };

  const handleNext = (pin: string, isConfirm: boolean) => {
    if (mode === 'set' && !isConfirm && step === 'enter') {
      setStep('confirm');
      setTimeout(() => confirmRefs.current[0]?.focus(), 80);
      return;
    }
    if (mode === 'set' && step === 'confirm') {
      const entered = digits.join('');
      if (pin !== entered) {
        setError('PINs do not match. Try again.');
        setConfirmDigits(['', '', '', '']);
        setTimeout(() => confirmRefs.current[0]?.focus(), 60);
        return;
      }
    }
    onSuccess(pin);
  };

  const handleSubmit = () => {
    if (step === 'enter') {
      const pin = digits.join('');
      if (pin.length < 4) { setError('Enter all 4 digits.'); return; }
      handleNext(pin, false);
    } else {
      const pin = confirmDigits.join('');
      if (pin.length < 4) { setError('Enter all 4 digits.'); return; }
      handleNext(pin, true);
    }
  };

  const activeArr = step === 'confirm' ? confirmDigits : digits;
  const setActiveArr = step === 'confirm'
    ? (a: string[]) => setConfirmDigits(a)
    : (a: string[]) => setDigits(a);
  const activeRefs = step === 'confirm' ? confirmRefs : inputRefs;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-xs text-center">
        <DialogHeader>
          <div className="flex items-center justify-center mb-1">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">{TITLES[mode]}</DialogTitle>
          {mode === 'set' && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              {step === 'enter' ? 'Choose a 4-digit PIN' : 'Re-enter PIN to confirm'}
            </p>
          )}
        </DialogHeader>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 my-4">
          {activeArr.map((d, i) => (
            <div key={i} className="relative">
              <input
                ref={(el) => { activeRefs.current[i] = el; }}
                type={showPin ? 'tel' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value, activeArr, setActiveArr, activeRefs)}
                onKeyDown={(e) => handleKey(e, i, activeArr, setActiveArr, activeRefs)}
                className={cn(
                  'w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-muted outline-none transition-colors',
                  d ? 'border-primary text-primary' : 'border-border text-foreground',
                  'focus:border-primary focus:bg-primary/5'
                )}
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm -mt-2 mb-2">{error}</p>
        )}

        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setShowPin(!showPin)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPin ? 'Hide' : 'Show'} PIN
          </button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            {mode === 'set' && step === 'enter' ? 'Next' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
