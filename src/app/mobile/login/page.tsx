'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          router.push('/mobile');
          return;
        }
      } catch {
        // 인증되지 않은 경우 로그인 페이지 표시
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        router.push('/mobile');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-800 to-slate-900">
      {/* 로고/아이콘 */}
      <div className="mb-10 text-center">
        <div className="w-24 h-24 bg-red-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white">사이니지 메신저</h1>
        <p className="text-gray-400 mt-2 text-lg font-medium">긴급 알림 전송</p>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-bold text-gray-800 mb-2">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg text-gray-900 placeholder-gray-400"
              placeholder="아이디 입력"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-gray-800 mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg text-gray-900 placeholder-gray-400"
              placeholder="비밀번호 입력"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500 rounded-xl">
              <p className="text-base text-white text-center font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-black text-xl shadow-lg hover:from-red-600 hover:to-red-700 transition disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>

      {/* 하단 안내 */}
      <p className="mt-8 text-gray-500 text-base text-center font-medium">
        홈 화면에 추가하여 앱처럼 사용하세요
      </p>
    </div>
  );
}
