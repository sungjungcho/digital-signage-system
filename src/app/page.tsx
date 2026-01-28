'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: 'user' | 'superadmin';
  status: string;
  name: string | null;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch {
        // 에러 무시
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      // 에러 무시
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600">
      {/* 헤더 */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">디지털 사이니지 시스템</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-white/80 text-sm">
                {user.name || user.username}님
                {user.role === 'superadmin' && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-500/50 rounded text-xs">
                    슈퍼관리자
                  </span>
                )}
              </span>
            )}
            {user?.role === 'superadmin' && (
              <a
                href="/superadmin"
                className="px-4 py-2 bg-purple-500/50 hover:bg-purple-500/70 text-white rounded-lg transition backdrop-blur-sm"
              >
                슈퍼관리자
              </a>
            )}
            <a
              href="/admin"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm"
            >
              관리자
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/50 hover:bg-red-500/70 text-white rounded-lg transition backdrop-blur-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-6 py-16">
        {/* 히어로 섹션 */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <div className="inline-block p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl">
              <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-5xl font-bold text-white mb-6">
            병원을 위한 스마트 사이니지
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            실시간 콘텐츠 관리와 환자 호출 시스템을 통합한
            <br />
            차세대 디지털 디스플레이 솔루션
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="/initialize-device"
              className="px-8 py-4 bg-white text-teal-600 font-semibold rounded-lg hover:bg-white/90 transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              디바이스 연결하기
            </a>
            <a
              href="/admin"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/30 transition border border-white/30"
            >
              관리 시작하기
            </a>
          </div>
        </div>

        {/* 주요 기능 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {/* 기능 1: 실시간 콘텐츠 관리 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">콘텐츠 관리</h3>
            <p className="text-white/80">
              이미지, 동영상, 텍스트, 유튜브 영상을 실시간으로 관리하고 배포
            </p>
          </div>

          {/* 기능 2: 환자 호출 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">환자 호출</h3>
            <p className="text-white/80">
              대기환자 관리 및 실시간 호출 알림 시스템
            </p>
          </div>

          {/* 기능 3: 다중 디바이스 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">다중 디바이스</h3>
            <p className="text-white/80">
              여러 디스플레이를 중앙에서 통합 관리
            </p>
          </div>

          {/* 기능 4: 실시간 동기화 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">실시간 동기화</h3>
            <p className="text-white/80">
              WebSocket 기반의 즉각적인 콘텐츠 업데이트
            </p>
          </div>
        </div>

        {/* 시스템 특징 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 border border-white/20">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">
            시스템 특징
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">병원 환경 최적화</h4>
                <p className="text-white/80">의료기관에 적합한 UI/UX 디자인과 기능</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">직관적인 관리 인터페이스</h4>
                <p className="text-white/80">누구나 쉽게 사용할 수 있는 관리자 대시보드</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">안정적인 운영</h4>
                <p className="text-white/80">Next.js 기반의 견고한 시스템 아키텍처</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">확장 가능한 구조</h4>
                <p className="text-white/80">모듈화된 설계로 추가 기능 통합 용이</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white/10 backdrop-blur-sm border-t border-white/20 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-white/80">
            <p className="mb-2">© 2025 디지털 사이니지 시스템. All rights reserved.</p>
            <p className="text-sm">병원 환경을 위한 스마트 디스플레이 솔루션</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
