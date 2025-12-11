import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { GlobalConfig, CreateLevelPayload } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, PlusCircle, AlertCircle, CheckCircle, HelpCircle, Layers } from 'lucide-react';

interface LevelCreatorProps {
  config: GlobalConfig;
}

export const LevelCreator: React.FC<LevelCreatorProps> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Default values based on Payload screenshot
  const [formData, setFormData] = useState({
    name: '',
    writeCheckpointType: 'NORMAL',
    passType: 'NO_RULE',
    passMaxNum: 3,
    noPassType: 'NO_RULE',
    difficulty: 1,
    questionIds: '', // string input for multiple IDs
    description: '',
  });

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.authToken) {
      alert("请先配置全局 Token");
      return;
    }

    if (!formData.questionIds.trim()) {
      alert("请输入至少一个题目ID");
      return;
    }

    setLoading(true);
    setLogs([]);

    try {
      // Parse Question IDs (split by comma, space, newline)
      const qIds = formData.questionIds
        .split(/[\s,，\n]+/)
        .filter(id => id.trim() !== '');

      if (qIds.length === 0) {
        throw new Error("无效的题目ID");
      }

      addLog(`开始任务: 为 ${qIds.length} 个试题ID分别创建关卡`);

      // Construct Base Payload (without questionIdList)
      const basePayload: Omit<CreateLevelPayload, 'questionIdList'> = {
        subjectId: 14,
        writeCheckpointType: formData.writeCheckpointType,
        name: formData.name,
        grade: 1,
        stage: 1,
        week: 1,
        day: 1,
        limitTime: 30,
        difficulty: formData.difficulty,
        errorCount: 3,
        noPassType: formData.noPassType,
        number: 1,
        passMaxNum: formData.passMaxNum,
        passType: formData.passType,
        reachRightNum: 2,
        targetRightNum: 6,
        upGradeStarBaseNum: 1,
        upGradeStarWrongNum: 1,
        description: formData.description
      };

      let successCount = 0;

      // 为每个试题ID创建单独的关卡
      for (let i = 0; i < qIds.length; i++) {
        // 关卡名称：如果有多个ID，添加序号后缀
        const currentName = qIds.length > 1
          ? `${formData.name}_${i + 1}`
          : formData.name;

        // 为每个关卡创建一个包含单个试题ID的 payload
        const payload: CreateLevelPayload = {
          ...basePayload,
          name: currentName,
          questionIdList: [qIds[i]] // 每个关卡只绑定一个试题ID
        };

        try {
          const res = await CrmService.createLevel(payload, config);
          // API returns boolean true on success in data field
          if (res.code === 200 && res.data === true) {
            successCount++;
            addLog(`✅ (${i+1}/${qIds.length}) 关卡 "${currentName}" 创建成功 (绑定试题ID: ${qIds[i]})`);
          } else {
            addLog(`❌ (${i+1}/${qIds.length}) 关卡 "${currentName}" 失败: ${res.message}`);
          }
        } catch (err: any) {
           addLog(`❌ (${i+1}/${qIds.length}) 请求异常: ${err.message}`);
        }

        // Small delay to be safe
        if (i < qIds.length - 1) await new Promise(r => setTimeout(r, 200));
      }

      if (successCount === qIds.length) {
        addLog(`🎉 全部完成！成功创建 ${successCount} 个关卡。`);
      } else {
        addLog(`⚠️ 完成，但有部分失败。成功: ${successCount}, 失败: ${qIds.length - successCount}`);
      }
      
    } catch (err: any) {
      addLog(`❌ 严重错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">快速创建关卡</h2>
          <p className="text-slate-500 mt-1 text-sm">输入关卡基本信息及试题ID，将为每个试题ID创建单独的关卡。</p>
        </div>
        {!config.authToken && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100">
            <AlertCircle size={14} />
            <span>未配置 Token</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Layers size={18} className="text-sky-600" />
                        关卡参数配置
                    </h3>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="关卡名称"
                            placeholder="请输入关卡名称"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Select
                            label="关卡类型"
                            options={[
                                { label: '普通关卡 (NORMAL)', value: 'NORMAL' },
                                { label: '测试关卡 (TEST)', value: 'TEST' },
                            ]}
                            value={formData.writeCheckpointType}
                            onChange={(e) => setFormData({ ...formData, writeCheckpointType: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <Select
                            label="过关规则"
                            options={[
                                { label: '无规则 (NO_RULE)', value: 'NO_RULE' },
                            ]}
                            value={formData.passType}
                            onChange={(e) => setFormData({ ...formData, passType: e.target.value })}
                            required
                        />
                         <Input
                            label="跳题次数"
                            type="number"
                            value={formData.passMaxNum}
                            onChange={(e) => setFormData({ ...formData, passMaxNum: parseInt(e.target.value) || 0 })}
                            required
                            placeholder="试题答错多少次跳下一题"
                        />
                         <Select
                            label="过关失败条件"
                            options={[
                                { label: '无规则 (NO_RULE)', value: 'NO_RULE' },
                            ]}
                            value={formData.noPassType}
                            onChange={(e) => setFormData({ ...formData, noPassType: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="难度"
                            options={[
                                { label: '难度 1', value: 1 },
                                { label: '难度 2', value: 2 },
                                { label: '难度 3', value: 3 },
                                { label: '难度 4', value: 4 },
                                { label: '难度 5', value: 5 },
                            ]}
                            value={formData.difficulty}
                            onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            绑定题目 ID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <textarea
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono h-24"
                                placeholder="输入试题ID，多个ID可用逗号、空格或换行分隔。例如: 23216 23217"
                                value={formData.questionIds}
                                onChange={(e) => setFormData({ ...formData, questionIds: e.target.value })}
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <HelpCircle size={12} />
                                输入多个试题ID，每个ID将创建一个独立的关卡
                            </p>
                        </div>
                    </div>

                    <div>
                         <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            描述 (可选)
                        </label>
                        <textarea
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 h-20"
                            placeholder="关卡描述..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({
                                    ...formData,
                                    name: '',
                                    questionIds: '',
                                    description: '',
                                });
                                setLogs([]);
                            }}
                            className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                        >
                            重置表单
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !config.authToken}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all shadow-md
                                ${loading || !config.authToken
                                ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-sky-600 hover:bg-sky-700 shadow-sky-900/20 active:scale-[0.98]'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                            确定创建
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* Right: Logs */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col sticky top-6 max-h-[calc(100vh-3rem)]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm rounded-t-xl">
                    <h3 className="font-semibold text-slate-800">操作日志</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs font-mono min-h-[300px]">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Layers size={24} className="opacity-20" />
                            <p>暂无操作记录</p>
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={`p-2 rounded border break-all ${log.includes('❌') ? 'bg-red-50 border-red-100 text-red-700' : log.includes('✅') ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};