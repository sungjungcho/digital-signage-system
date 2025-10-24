'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // 이미 로그인된 경우 관리자 페이지로 리다이렉트
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          router.push('/admin');
          return;
        }
      } catch (err) {
        // 인증되지 않은 경우 로그인 페이지 표시
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (username: string, password: string) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // 로그인 성공 시 관리자 페이지로 이동
        router.push('/admin');
        router.refresh(); // 페이지 새로고침하여 인증 상태 업데이트
      } else {
        const data = await response.json();
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 인증 확인 중일 때 로딩 표시
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoginForm onLogin={handleLogin} />
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-md z-50">
          <div className="flex items-center justify-between">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
