import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { GlobalConfig } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, UserPlus, AlertCircle, CheckCircle, Users, User } from 'lucide-react';

interface FastJoinProps {
  config: GlobalConfig;
}

export const FastJoin: React.FC<FastJoinProps> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Single Mode State
  const [formData, setFormData] = useState({
    classId: '',
    userId: '',
  });

  // Batch Mode State
  const [batchFormData, setBatchFormData] = useState({
    classId: '',
    userIds: '',
  });

  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.authToken) {
      alert("请先配置全局 Token");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (mode === 'single') {
          const classId = parseInt(formData.classId);
          const userId = parseInt(formData.userId);

          if (isNaN(classId) || isNaN(userId)) {
            throw new Error("Class ID 和 User ID 必须为数字");
          }

          // Use the new API that accepts array
          await CrmService.addStudents(classId, [userId], config);
          
          setResult({
            success: true,
            message: `学员 (ID: ${userId}) 已成功加入班级 (ID: ${classId})`
          });
      } else {
          // Batch Mode
          const classId = parseInt(batchFormData.classId);
          if (isNaN(classId)) throw new Error("Class ID 必须为数字");

          const idList = batchFormData.userIds
              .split(/[\n,，\s]+/)
              .filter(id => id.trim() !== '')
              .map(id => parseInt(id));

          const invalidIds = idList.filter(id => isNaN(id));
          if (invalidIds.length > 0) throw new Error("包含无效的学员 ID，请检查");
          if (idList.length === 0) throw new Error("请输入至少一个学员 ID");

          await CrmService.addStudents(classId, idList, config);

          setResult({
              success: true,
              message: `已成功将 ${idList.length} 名学员加入班级 (ID: ${classId})`
          });
      }
      
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "进班失败"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">快速进班</h2>
          <p className="text-slate-500 mt-1 text-sm">手动将学员加入到指定班级中，支持单个或批量操作。</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Mode Switcher */}
        <div className="flex border-b border-slate-200">
               <button
                  type="button"
                  onClick={() => { setMode('single'); setResult(null); }}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                    ${mode === 'single' ? 'text-sky-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}
                  `}
               >
                  <User size={16} />
                  单个进班
                  {mode === 'single' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>}
               </button>
               <button
                  type="button"
                  onClick={() => { setMode('batch'); setResult(null); }}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                    ${mode === 'batch' ? 'text-sky-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}
                  `}
               >
                  <Users size={16} />
                  批量进班
                  {mode === 'batch' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>}
               </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {mode === 'single' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="班级 ID (Class ID)"
                  type="number"
                  placeholder="例如: 196317"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                />
                <Input
                  label="学员 ID (User ID)"
                  type="number"
                  placeholder="例如: 21334618"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                />
              </div>
          ) : (
              <div className="space-y-6">
                 <div className="max-w-xs">
                    <Input
                        label="班级 ID (Class ID)"
                        type="number"
                        placeholder="例如: 196317"
                        value={batchFormData.classId}
                        onChange={(e) => setBatchFormData({ ...batchFormData, classId: e.target.value })}
                        required
                    />
                 </div>
                 <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        学员 ID 列表 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        className="w-full h-32 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                        placeholder={`21334618\n21334619\n21334620`}
                        value={batchFormData.userIds}
                        onChange={(e) => setBatchFormData({ ...batchFormData, userIds: e.target.value })}
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">请输入学员ID，请以回车（换行）分隔。</p>
                 </div>
              </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !config.authToken}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all
                ${loading || !config.authToken
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-900/10 active:scale-[0.98]'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              {mode === 'single' ? '确认进班' : '批量进班'}
            </button>
          </div>
        </form>

        {/* Result Feedback */}
        {result && (
          <div className={`px-6 py-4 border-t ${result.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="text-green-600 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
              )}
              <div>
                <h4 className={`text-sm font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? '操作成功' : '操作失败'}
                </h4>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
       {!config.authToken && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100">
            <AlertCircle size={14} />
            <span>请先前往“全局配置”设置 Token。</span>
          </div>
        )}
    </div>
  );
};