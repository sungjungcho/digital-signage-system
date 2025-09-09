'use client';

import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  name: string;
  number: number;
  department: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function PatientManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    department: '내과'
  });

  const departments = ['내과', '외과', '소아과', '안과', '이비인후과', '피부과', '정형외과', '산부인과', '신경과', '정신건강의학과'];

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      setPatients(data);
      
      // 새 환자 추가 시 다음 순번 자동 설정
      if (!editingPatient) {
        const nextNumber = data.length > 0 ? Math.max(...data.map((p: Patient) => p.number)) + 1 : 1;
        setFormData(prev => ({ ...prev, number: nextNumber.toString() }));
      }
    } catch (error) {
      console.error('환자 목록 가져오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.number) {
      alert('환자명과 번호는 필수 항목입니다.');
      return;
    }

    try {
      const url = editingPatient ? `/api/patients/${editingPatient.id}` : '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          number: parseInt(formData.number),
          department: formData.department,
        }),
      });

      if (response.ok) {
        setEditingPatient(null);
        await fetchPatients(); // fetchPatients가 다음 순번 자동 설정을 처리
        setFormData({ name: '', number: '', department: '내과' });
      } else {
        const error = await response.json();
        alert(error.error || '오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('환자 저장 오류:', error);
      alert('환자 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      number: patient.number.toString(),
      department: patient.department,
    });
  };

  const handleDelete = async (patient: Patient) => {
    if (!confirm(`'${patient.name}' 환자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPatients(); // 삭제 후 다음 순번 자동 설정
      } else {
        const error = await response.json();
        alert(error.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('환자 삭제 오류:', error);
      alert('환자 삭제 중 오류가 발생했습니다.');
    }
  };

  const cancelEdit = () => {
    setEditingPatient(null);
    // 취소 시 다음 순번 자동 설정
    const nextNumber = patients.length > 0 ? Math.max(...patients.map(p => p.number)) + 1 : 1;
    setFormData({ name: '', number: nextNumber.toString(), department: '내과' });
  };

  const handlePatientCall = async (patient: Patient) => {
    try {
      // 먼저 모든 디바이스 목록을 가져오기
      const devicesResponse = await fetch('/api/devices');
      if (!devicesResponse.ok) {
        throw new Error('디바이스 목록을 가져올 수 없습니다');
      }
      const devices = await devicesResponse.json();
      const deviceIds = devices.map((device: any) => device.id);

      if (deviceIds.length === 0) {
        alert('등록된 디바이스가 없습니다.');
        return;
      }

      // 모든 디바이스에 환자 호출 알림 전송
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${patient.name}님 ${patient.department}로 오세요.`,
          targetDeviceIds: deviceIds,
          duration: 30000, // 30초
        }),
      });

      if (!response.ok) {
        throw new Error('알림 전송 실패');
      }

      // 알림 전송 성공 후 환자 삭제
      const deleteResponse = await fetch(`/api/patients/${patient.id}`, {
        method: 'DELETE',
      });

      if (deleteResponse.ok) {
        // 환자 삭제 후 목록 새로고침 (순번 재정렬 포함)
        await fetchPatients();
      } else {
        console.error('환자 삭제 실패');
        alert('환자 호출은 전송되었지만 환자 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('환자 호출 오류:', error);
      alert('환자 호출 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">환자 목록을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">환자 명단 관리</h3>
        
        {/* 환자 추가/수정 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                환자명
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="환자명 입력"
                lang="ko"
                inputMode="text"
                autoComplete="off"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                순번
              </label>
              <input
                type="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="순번 입력"
                min="1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                진료과
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingPatient ? '수정' : '추가'}
            </button>
            {editingPatient && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 환자 목록 */}
      <div>
        <h4 className="text-md font-medium mb-3">현재 대기환자 ({patients.length}명)</h4>
        {patients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">등록된 환자가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {patients.map((patient) => (
              <div 
                key={patient.id} 
                className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                onDoubleClick={() => handlePatientCall(patient)}
                title="더블클릭하여 환자 호출"
              >
                <div className="flex items-center space-x-4">
                  <span className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-sm min-w-[40px] text-center">
                    {patient.number}
                  </span>
                  <div>
                    <span className="font-semibold">{patient.name}</span>
                    <span className="ml-2 text-sm text-green-600">({patient.department})</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(patient)}
                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(patient)}
                    className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}