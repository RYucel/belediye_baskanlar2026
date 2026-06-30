import React, { useState, useEffect } from 'react';
import { Mayor } from '../types';
import { X, Star } from 'lucide-react';
import { useDeviceId, generateFingerprint } from '../lib/useDeviceId';

interface VoteModalProps {
  mayor: Mayor;
  onClose: () => void;
  onSuccess: () => void;
}

const CRITERIA = [
  { id: 'infrastructure', label: 'Altyapı ve Temizlik' },
  { id: 'social', label: 'Sosyal Belediyecilik' },
  { id: 'traffic', label: 'Şehir Planlama ve Trafik' },
  { id: 'transparency', label: 'Şeffaflık ve İletişim' },
];

export function VoteModal({ mayor, onClose, onSuccess }: VoteModalProps) {
  const deviceId = useDeviceId();
  const [ratings, setRatings] = useState<Record<string, number>>({
    infrastructure: 0,
    social: 0,
    traffic: 0,
    transparency: 0,
  });
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Secure Verification States
  const [secureVotingEnabled, setSecureVotingEnabled] = useState(false);
  const [step, setStep] = useState<'rating' | 'otp_request' | 'otp_verify'>('rating');
  const [contact, setContact] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [credentialId, setCredentialId] = useState(() => localStorage.getItem('kktc_credentialId') || '');
  const [idempotencyKey] = useState(() => Math.random().toString(36).substring(2) + Date.now().toString(36));

  useEffect(() => {
    // Load config from server to check if secure voting feature is enabled
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.secureVotingEnabled) {
          setSecureVotingEnabled(true);
        }
      })
      .catch(err => console.error("Error loading config:", err));
  }, []);

  const handleStarClick = (criterion: string, value: number) => {
    setRatings((prev) => ({ ...prev, [criterion]: value }));
  };

  const submitVote = async (verifiedCredId: string) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          fingerprint: generateFingerprint(),
          credentialId: verifiedCredId || undefined,
          idempotencyKey,
          mayorId: mayor.id,
          rating: ratings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
      // Revert step back to rating so they can review or retry
      setStep('rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate ratings
    if (Object.values(ratings).some((val) => val === 0)) {
      setError('Tüm kriterler için puan veriniz.');
      return;
    }

    setError('');

    // If secure voting is enabled and the user is not yet verified, transition to OTP request
    if (secureVotingEnabled && !credentialId) {
      setStep('otp_request');
    } else {
      await submitVote(credentialId);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) {
      setError('Lütfen e-posta veya telefon numaranızı girin.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kod gönderilemedi.');
      }

      // Help local testing by displaying the OTP in console
      if (data.code) {
        console.log(`[DEV ONLY] OTP Code: ${data.code}`);
      }

      setStep('otp_verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kod doğrulanamadı.');
      }

      const verifiedId = data.credentialId;
      setCredentialId(verifiedId);
      localStorage.setItem('kktc_credentialId', verifiedId);

      // Automatically cast the vote after successful verification
      await submitVote(verifiedId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-[#FDFCFB] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b-4 border-[#1a1a1a] px-6 py-4 bg-orange-500">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic font-serif text-[#1a1a1a] leading-none">{mayor.name}</h2>
            <p className="text-xs md:text-sm font-bold tracking-widest uppercase mt-2 text-[#1a1a1a]">{mayor.city} BELEDİYESİ</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-transparent hover:border-[#1a1a1a] text-[#1a1a1a] transition-colors"
          >
            <X className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-6 flex-1 text-[#1a1a1a]">
          
          {step === 'rating' && (
            <>
              <p className="mb-8 font-serif italic text-base opacity-80 border-l-2 border-orange-500 pl-4">
                Adil bir değerlendirme için lütfen her bir kriteri dikkatlice puanlayın.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {CRITERIA.map((criterion) => (
                  <div key={criterion.id} className="space-y-1">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                      <label className="text-sm md:text-base font-bold uppercase tracking-wider">
                        {criterion.label}
                      </label>
                      <span className="text-xs font-mono font-bold">
                        {ratings[criterion.id] > 0 ? `${ratings[criterion.id]}/10` : 'BEKLİYOR'}
                      </span>
                    </div>
                    <div className="flex gap-0.5 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleStarClick(criterion.id, star)}
                          className="group p-1 focus:outline-none"
                        >
                          <Star
                            className={`h-5 w-5 md:h-6 md:w-6 transition-colors ${
                              star <= ratings[criterion.id]
                                ? 'fill-[#1a1a1a] text-[#1a1a1a]'
                                : 'fill-transparent text-gray-300 group-hover:text-gray-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {error && (
                  <div className="bg-[#1a1a1a] p-4 text-sm text-white font-mono uppercase">
                    HATA: {error}
                  </div>
                )}
                
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#1a1a1a] px-4 py-4 text-base font-bold tracking-widest uppercase text-white hover:bg-orange-500 hover:text-[#1a1a1a] disabled:opacity-50 transition-colors border-2 border-[#1a1a1a]"
                  >
                    {submitting ? 'İŞLENİYOR...' : 'OYU KAYDET →'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'otp_request' && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold uppercase tracking-wider block">
                  KİMLİK DOĞRULAMA (E-POSTA)
                </label>
                <p className="text-xs opacity-70 leading-relaxed">
                  Güvenli anket katılımı ve tek kişi tek oy ilkesini korumak amacıyla e-posta doğrulaması gerekmektedir. E-posta adresiniz şifrelenir (SHA-256) ve kesinlikle oylarınızla ilişkilendirilmez.
                </p>
                <input
                  type="email"
                  placeholder="örnek@eposta.com"
                  value={contact}
                  onChange={(e) => setContact(e.target.value.trim())}
                  className="w-full border-4 border-[#1a1a1a] p-3 text-base focus:outline-none focus:bg-orange-50/50 bg-white font-mono"
                  required
                />
              </div>

              {error && (
                <div className="bg-[#1a1a1a] p-4 text-sm text-white font-mono uppercase">
                  HATA: {error}
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('rating')}
                  className="w-1/3 bg-white px-4 py-4 text-base font-bold tracking-widest uppercase text-[#1a1a1a] hover:bg-gray-100 transition-colors border-2 border-[#1a1a1a]"
                >
                  ← GERİ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 bg-[#1a1a1a] px-4 py-4 text-base font-bold tracking-widest uppercase text-white hover:bg-orange-500 hover:text-[#1a1a1a] disabled:opacity-50 transition-colors border-2 border-[#1a1a1a]"
                >
                  {submitting ? 'KOD GÖNDERİLİYOR...' : 'KOD GÖNDER →'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm md:text-base font-bold uppercase tracking-wider block">
                  DOĞRULAMA KODUNU GİRİN
                </label>
                <p className="text-xs opacity-70 leading-relaxed">
                  Lütfen <strong>{contact}</strong> adresine gönderilen 6 haneli doğrulama kodunu girin.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full border-4 border-[#1a1a1a] p-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:bg-orange-50/50 bg-white"
                  required
                />
              </div>

              {error && (
                <div className="bg-[#1a1a1a] p-4 text-sm text-white font-mono uppercase">
                  HATA: {error}
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('otp_request')}
                  className="w-1/3 bg-white px-4 py-4 text-base font-bold tracking-widest uppercase text-[#1a1a1a] hover:bg-gray-100 transition-colors border-2 border-[#1a1a1a]"
                >
                  ← GERİ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 bg-[#1a1a1a] px-4 py-4 text-base font-bold tracking-widest uppercase text-white hover:bg-orange-500 hover:text-[#1a1a1a] disabled:opacity-50 transition-colors border-2 border-[#1a1a1a]"
                >
                  {submitting ? 'DOĞRULANIYOR...' : 'KODU DOĞRULA →'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
