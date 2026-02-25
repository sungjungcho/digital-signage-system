'use client';

import { LayoutTemplateId, LayoutTemplate, LAYOUT_TEMPLATE_LIST } from '@/types/layout';

interface TemplateSelectorProps {
  selected: LayoutTemplateId;
  onChange: (templateId: LayoutTemplateId) => void;
}

// 템플릿별 미리보기 SVG 아이콘
function TemplatePreviewIcon({ template }: { template: LayoutTemplate }) {
  const { id } = template;
  const baseClass = "w-full h-full";

  switch (id) {
    case 'fullscreen':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="76" height="56" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <text x="40" y="35" textAnchor="middle" fill="white" fontSize="10">1</text>
        </svg>
      );
    case 'split_h_1_1':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="36" height="56" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="42" y="2" width="36" height="56" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <text x="20" y="35" textAnchor="middle" fill="white" fontSize="10">1</text>
          <text x="60" y="35" textAnchor="middle" fill="white" fontSize="10">2</text>
        </svg>
      );
    case 'split_v_1_1':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="76" height="26" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="2" y="32" width="76" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <text x="40" y="18" textAnchor="middle" fill="white" fontSize="10">1</text>
          <text x="40" y="48" textAnchor="middle" fill="white" fontSize="10">2</text>
        </svg>
      );
    case 'grid_2x2':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="36" height="26" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="42" y="2" width="36" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <rect x="2" y="32" width="36" height="26" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="2" />
          <rect x="42" y="32" width="36" height="26" fill="#EF4444" stroke="#DC2626" strokeWidth="2" rx="2" />
          <text x="20" y="18" textAnchor="middle" fill="white" fontSize="8">1</text>
          <text x="60" y="18" textAnchor="middle" fill="white" fontSize="8">2</text>
          <text x="20" y="48" textAnchor="middle" fill="white" fontSize="8">3</text>
          <text x="60" y="48" textAnchor="middle" fill="white" fontSize="8">4</text>
        </svg>
      );
    case 'left_2_right_1':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="36" height="26" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="2" y="32" width="36" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <rect x="42" y="2" width="36" height="56" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="2" />
          <text x="20" y="18" textAnchor="middle" fill="white" fontSize="8">1</text>
          <text x="20" y="48" textAnchor="middle" fill="white" fontSize="8">2</text>
          <text x="60" y="35" textAnchor="middle" fill="white" fontSize="8">3</text>
        </svg>
      );
    case 'left_1_right_2':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="36" height="56" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="42" y="2" width="36" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <rect x="42" y="32" width="36" height="26" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="2" />
          <text x="20" y="35" textAnchor="middle" fill="white" fontSize="8">1</text>
          <text x="60" y="18" textAnchor="middle" fill="white" fontSize="8">2</text>
          <text x="60" y="48" textAnchor="middle" fill="white" fontSize="8">3</text>
        </svg>
      );
    case 'top_1_bottom_2':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="76" height="26" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="2" y="32" width="36" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <rect x="42" y="32" width="36" height="26" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="2" />
          <text x="40" y="18" textAnchor="middle" fill="white" fontSize="8">1</text>
          <text x="20" y="48" textAnchor="middle" fill="white" fontSize="8">2</text>
          <text x="60" y="48" textAnchor="middle" fill="white" fontSize="8">3</text>
        </svg>
      );
    case 'top_2_bottom_1':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="36" height="26" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="42" y="2" width="36" height="26" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <rect x="2" y="32" width="76" height="26" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="2" />
          <text x="20" y="18" textAnchor="middle" fill="white" fontSize="8">1</text>
          <text x="60" y="18" textAnchor="middle" fill="white" fontSize="8">2</text>
          <text x="40" y="48" textAnchor="middle" fill="white" fontSize="8">3</text>
        </svg>
      );
    case 'split_h_2_1':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="50" height="56" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="56" y="2" width="22" height="56" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <text x="27" y="35" textAnchor="middle" fill="white" fontSize="10">1</text>
          <text x="67" y="35" textAnchor="middle" fill="white" fontSize="10">2</text>
        </svg>
      );
    case 'split_h_1_2':
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="22" height="56" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="2" />
          <rect x="28" y="2" width="50" height="56" fill="#10B981" stroke="#047857" strokeWidth="2" rx="2" />
          <text x="13" y="35" textAnchor="middle" fill="white" fontSize="10">1</text>
          <text x="53" y="35" textAnchor="middle" fill="white" fontSize="10">2</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 80 60" className={baseClass}>
          <rect x="2" y="2" width="76" height="56" fill="#6B7280" stroke="#4B5563" strokeWidth="2" rx="2" />
          <text x="40" y="35" textAnchor="middle" fill="white" fontSize="10">?</text>
        </svg>
      );
  }
}

export default function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">레이아웃 템플릿 선택</h3>
      <div className="grid grid-cols-5 gap-3">
        {LAYOUT_TEMPLATE_LIST.map((template) => (
          <button
            key={template.id}
            onClick={() => onChange(template.id)}
            className={`
              p-2 rounded-lg border-2 transition-all
              ${selected === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
            title={template.description}
          >
            <div className="w-full aspect-[4/3] mb-1">
              <TemplatePreviewIcon template={template} />
            </div>
            <p className="text-xs text-center text-gray-600 truncate">{template.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
