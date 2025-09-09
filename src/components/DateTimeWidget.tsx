'use client';

import { useState, useEffect } from 'react';

interface DateTimeWidgetProps {
  className?: string;
}

export default function DateTimeWidget({ className = '' }: DateTimeWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`bg-blue-900 text-white p-4 rounded-lg ${className}`}>
      <div className="text-center">
        <div className="text-lg font-semibold mb-2 text-blue-100">
          {formatDate(currentTime)}
        </div>
        <div className="text-3xl font-bold text-white">
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}