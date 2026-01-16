import React, { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { GlobalConfig } from '../types';
import { Save } from 'lucide-react';

interface SettingsPanelProps {
  config: GlobalConfig;
  setConfig: (config: GlobalConfig) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig }) => {
  const [formData, setFormData] = useState<GlobalConfig>(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">全局配置</h2>
          <p className="text-sm text-slate-500 mt-1">
            配置您的 API 凭证。这些信息将保存在本地浏览器中，不会上传到服务器。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              鉴权令牌 (Authorization Token)
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-xs"
              rows={4}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">请粘贴浏览器 Network 面板中 Request Headers 下的完整 Authorization 字段值。</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              学科 (Subject)
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: parseInt(e.target.value) })}
              required
            >
              <option value={14}>数学 (Math)</option>
              <option value={13}>英语 (English)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">选择的学科将应用于所有功能页面</p>
          </div>

          <Input
            label="操作人 ID / 班主任 ID (Counselor ID)"
            type="number"
            value={formData.operatorId}
            onChange={(e) => setFormData({ ...formData, operatorId: parseInt(e.target.value) || 0 })}
            placeholder="例如: 30008819"
            required
            helperText="此 ID 将同时用作 operatorId 和 counselorId"
          />

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            {saved && (
              <span className="text-green-600 text-sm font-medium mr-4 animate-fade-in">
                配置保存成功！
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={18} />
              保存配置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};