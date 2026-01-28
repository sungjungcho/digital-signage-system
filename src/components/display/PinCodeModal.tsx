'use client';

import { useState, useRef, useEffect } from 'react';

interface PinCodeModalProps {
  deviceId: string;
  onSuccess: (deviceName: string) => void;
  onError?: (error: string) => void;
}

export default function PinCodeModal({ deviceId, onSuccess, onError }: PinCodeModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // 첫 번째 입력 필드에 포커스
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // 숫자만 허용
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // 다음 입력 필드로 이동
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // 모든 자리 입력 완료 시 자동 제출
    if (value && index === 3) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace로 이전 필드로 이동
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d{1,4}$/.test(pastedData)) {
      const newPin = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
      setPin(newPin);
      if (pastedData.length === 4) {
        verifyPin(pastedData);
      } else {
        inputRefs[pastedData.length].current?.focus();
      }
    }
  };

  const verifyPin = async (pinCode: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/devices/${deviceId}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'PIN 코드가 올바르지 않습니다.');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
        onError?.(data.error);
        return;
      }

      // 성공 시 세션 스토리지에 저장
      sessionStorage.setItem(`device_pin_verified_${deviceId}`, 'true');
      onSuccess(data.deviceName);
    } catch (err) {
      setError('인증 중 오류가 발생했습니다.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">디스플레이 접근</h2>
          <p className="text-gray-600">4자리 PIN 코드를 입력하세요</p>
        </div>

        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-gray-100 transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="text-center text-red-500 mb-4 animate-shake">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-500">
            <svg className="animate-spin h-6 w-6 mx-auto text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2">확인 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}
