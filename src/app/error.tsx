'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
        <p className="text-gray-600 mb-6">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
