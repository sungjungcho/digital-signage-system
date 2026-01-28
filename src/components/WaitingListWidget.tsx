'use client';

import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  name: string;
  number: number;
  department: string;
}

interface WaitingListWidgetProps {
  className?: string;
  deviceId: string;
}

export default function WaitingListWidget({ className = '', deviceId }: WaitingListWidgetProps) {
  const [patients, setPatients] = useState<Patient[]>([]);

  // 이름 마스킹 함수 (성과 마지막 글자만 표시, 중간은 '*')
  const maskName = (name: string) => {
    if (name.length <= 2) {
      // 2글자 이하면 마지막 글자만 '*'
      return name.charAt(0) + '*';
    } else {
      // 3글자 이상이면 첫글자 + '*' + 마지막글자
      return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('환자 목록 가져오기 오류:', error);
      // 오류 시 빈 배열로 설정
      setPatients([]);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [deviceId]);

  // 환자 목록 업데이트를 위한 커스텀 이벤트 리스너
  useEffect(() => {
    const handlePatientUpdate = () => {
      fetchPatients();
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('patientListUpdate', handlePatientUpdate);

    return () => {
      window.removeEventListener('patientListUpdate', handlePatientUpdate);
    };
  }, []);

  const displayedPatients = patients;

  return (
    <div className={`bg-white border-2 border-green-500 rounded-lg p-4 ${className}`}>
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-green-700 border-b-2 border-green-200 pb-2">
          대기환자 명단
        </h2>
      </div>
      
      <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
        {displayedPatients.length > 0 ? (
          displayedPatients.map((patient, index) => (
            <div
              key={patient.id}
              className={`flex justify-between items-center p-2 rounded-lg ${
                index % 2 === 0 ? 'bg-green-50' : 'bg-green-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="bg-green-600 text-white font-bold px-2 py-1 rounded-full text-sm min-w-[30px] text-center">
                  {patient.number}
                </span>
                <span className="font-semibold text-gray-800">
                  {maskName(patient.name)}
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                {patient.department}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            대기중인 환자가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}