import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { GlobalConfig, CreateClassPayload, GradeEnum, PhaseEnum, CoursePlanItem } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, CheckCircle, AlertCircle, Play, ChevronDown, ChevronUp, Clock, ListChecks, Calendar, Users, User } from 'lucide-react';

interface ClassCreatorProps {
  config: GlobalConfig;
}

export const ClassCreator: React.FC<ClassCreatorProps> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [step, setStep] = useState<'idle' | 'creating' | 'fetching_plan' | 'unlocking_units' | 'complete' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [createdClassId, setCreatedClassId] = useState<number | null>(null);
  const [courseUnits, setCourseUnits] = useState<CoursePlanItem[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Form State
  const [formData, setFormData] = useState({
    termId: '13137', // Default to System Class
    phase: 3, // Default Phase 3
    grade: GradeEnum.ONE,
    coursePackageId: '2498', // Fixed value
    courseTreeTemplateId: '9505', 
    className: '', // Will auto-generate if empty
  });

  // Batch Input State
  const [batchInput, setBatchInput] = useState('');

  const addLog = (msg: string) => {
    setStatusLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const executeClassCreation = async (targetOperatorId: number, indexInfo?: string) => {
     // Auto-generate class name if not provided
      const prefix = indexInfo ? `(${indexInfo}) ` : '';
      const finalClassName = formData.className.trim() || `快速建班-${formData.grade}-${new Date().toLocaleTimeString('zh-CN', {hour12:false}).replace(/:/g,'')}`;
      
      // If batch mode, append Teacher ID to class name for clarity
      const actualClassName = mode === 'batch' ? `${finalClassName}-${targetOperatorId}` : finalClassName;

      // Step 1: Create Class
      addLog(`${prefix}步骤 1/3: 创建班级 (${actualClassName})，归属教师: ${targetOperatorId}...`);

      // Construct Payload
      const payload: CreateClassPayload = {
        className: actualClassName,
        classopenTime: new Date().toISOString(),
        counselorId: targetOperatorId, // Assign class to this teacher
        operatorId: targetOperatorId,  // Operation performed by this teacher
        courseGroup: 2,
        coursePackageId: formData.coursePackageId,
        courseTreeTemplateId: formData.courseTreeTemplateId,
        daytime: 4,
        grade: formData.grade,
        phase: Number(formData.phase),
        tags: [9],
        termId: Number(formData.termId),
        test: 0,
        weekday: 1,
      };

      const res = await CrmService.createClass(payload, config);

      if (res.success && res.data?.classId) {
        const classId = res.data.classId;
        if (mode === 'single') setCreatedClassId(classId);
        addLog(`${prefix}✅ 班级创建成功! Class ID: ${classId}`);
        
        // Step 2: Get Course Plan
        if (mode === 'single') setStep('fetching_plan');
        
        // Wait a short moment to ensure backend consistency
        await new Promise(r => setTimeout(r, 800));
        
        const planRes = await CrmService.getCoursePlan(classId, config);
        
        if (planRes.errcode === 0 && planRes.data && planRes.data.CoursePlan) {
            const units = planRes.data.CoursePlan;
            if (mode === 'single') setCourseUnits(units);
            addLog(`${prefix}✅ 找到 ${units.length} 个课程单元。`);
            
            // Step 3: Unlock All Units
            if (units.length > 0) {
                if (mode === 'single') setStep('unlocking_units');
                addLog(`${prefix}步骤 3/3: 批量解锁课程单元...`);
                
                // Calculate "Today 17:00" timestamp
                const now = new Date();
                const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
                const runTime = targetTime.getTime(); // Milliseconds timestamp
                
                let successUnlock = 0;
                
                // Iterate and unlock
                for (let i = 0; i < units.length; i++) {
                    const unit = units[i];
                    const seq = unit.courseSequence || unit.sequence || (i + 1);
                    try {
                        await CrmService.unlockUnit({
                            classId: classId,
                            courseSequence: seq, 
                            runTime: runTime,
                            periodDay: 0,
                            isLevel: true
                        }, config);
                        
                        successUnlock++;
                        if (mode === 'single') setUnlockedCount(successUnlock);
                    } catch (uErr) {
                         // Silent fail for individual unit
                    }
                }
                
                addLog(`${prefix}✅ 解锁完毕: ${successUnlock}/${units.length}。`);
            } else {
                addLog(`${prefix}⚠️ 课程表为空，无需解锁。`);
            }

            return { success: true, classId };
        } else {
            throw new Error("获取课表失败或课表为空");
        }
      } else {
        throw new Error(res.errMsg || "创建过程中发生未知错误");
      }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.authToken) {
      alert("请先在“全局配置”页面设置 Authorization Token。");
      return;
    }

    setLoading(true);
    setStep('creating');
    setErrorMsg('');
    setStatusLog([]);
    setCourseUnits([]);
    setUnlockedCount(0);
    setCreatedClassId(null);

    try {
        if (mode === 'single') {
             // Single Mode Execution
             await executeClassCreation(config.operatorId);
             setStep('complete');
        } else {
            // Batch Mode Execution
            const lines = batchInput.trim().split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) {
                throw new Error("请输入至少一行教师ID数据");
            }

            setBatchProgress({ current: 0, total: lines.length });
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Just get the Teacher ID, ignore everything else
                const parts = line.split(/[,，\s]+/);
                const teacherId = parseInt(parts[0]);

                if (isNaN(teacherId)) {
                    addLog(`❌ [${i+1}/${lines.length}] 无效的教师 ID: ${line}`);
                    continue;
                }

                try {
                    await executeClassCreation(teacherId, `${i+1}/${lines.length}`);
                } catch (err: any) {
                    addLog(`❌ [${i+1}/${lines.length}] 创建失败 (教师: ${teacherId}): ${err.message}`);
                }

                setBatchProgress(prev => ({ ...prev, current: i + 1 }));
                // Small delay between classes
                await new Promise(r => setTimeout(r, 500));
            }
            setStep('complete');
            addLog(`🎉 批量任务全部执行完毕。`);
        }

    } catch (err: any) {
      if (mode === 'single') setStep('error');
      setErrorMsg(err.message || "操作失败");
      addLog(`❌ 错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('idle');
    setCreatedClassId(null);
    setCourseUnits([]);
    setStatusLog([]);
    setUnlockedCount(0);
    setBatchProgress({ current: 0, total: 0 });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">快速建班工具</h2>
          <p className="text-slate-500 mt-1 text-sm">只需输入核心参数，即可一键创建班级并自动解锁全套课程。</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
           <User size={12} />
           Global Operator: {config.operatorId || '未配置'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200">
               <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                    ${mode === 'single' ? 'text-sky-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}
                  `}
               >
                  <User size={16} />
                  单个创建
                  {mode === 'single' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>}
               </button>
               <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative
                    ${mode === 'batch' ? 'text-sky-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}
                  `}
               >
                  <Users size={16} />
                  批量创建
                  {mode === 'batch' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600"></div>}
               </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-8">
              
               {/* Batch Input Area */}
               {mode === 'batch' && (
                   <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                             <Users size={16} className="text-sky-600"/>
                             批量教师ID列表
                             <span className="text-red-500">*</span>
                          </label>
                          <span className="text-xs text-slate-500">格式: 每行一个教师ID</span>
                      </div>
                      <textarea
                         className="w-full h-32 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono shadow-sm placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                         placeholder={`30008819\n30008820\n...`}
                         value={batchInput}
                         onChange={(e) => setBatchInput(e.target.value)}
                         required
                      />
                      <p className="text-xs text-slate-500">
                          每一行代表一个班级。系统将使用该行的 <b>教师ID</b> 作为班主任创建班级。
                      </p>
                   </div>
               )}

              {/* Common Configuration */}
              <div className="relative">
                 {mode === 'batch' && <div className="absolute -top-3 left-2 bg-white px-2 text-xs font-medium text-slate-400">所有班级通用配置</div>}
                 <div className={`space-y-8 ${mode === 'batch' ? 'border border-dashed border-slate-200 p-4 rounded-lg mt-2' : ''}`}>
                    {/* Row 1: Term ID & Package ID */}
                    <div className="grid grid-cols-2 gap-6">
                        <Select
                        label="学期 (Term ID)"
                        options={[
                            { label: '系统课 (ID: 13137)', value: '13137' },
                            { label: '系统课 (ID: 13941)', value: '13941' },
                            { label: '体验课 (ID: 7373)', value: '7373' },
                        ]}
                        value={formData.termId}
                        onChange={e => setFormData({...formData, termId: e.target.value})}
                        required
                        />
                        <Input
                        label="课程版本 ID (Package ID)"
                        value={formData.coursePackageId}
                        readOnly
                        disabled
                        className="bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                        />
                    </div>

                    {/* Row 2: Course Tree Template ID */}
                    <div>
                        <Input
                        label="课程树模板 ID (Course Tree Template ID)"
                        placeholder="例如: 9505"
                        value={formData.courseTreeTemplateId}
                        onChange={e => setFormData({...formData, courseTreeTemplateId: e.target.value})}
                        required
                        className="font-mono"
                        />
                    </div>

                    {/* Phase Selection */}
                    <div>
                        <Select
                        label="阶段 (Phase)"
                        options={[
                            { label: '第一阶段 (Phase 1)', value: PhaseEnum.PHASE_1 },
                            { label: '第二阶段 (Phase 2)', value: PhaseEnum.PHASE_2 },
                            { label: '第三阶段 (Phase 3)', value: PhaseEnum.PHASE_3 },
                            { label: '第四阶段 (Phase 4)', value: PhaseEnum.PHASE_4 },
                            { label: '第五阶段 (Phase 5)', value: PhaseEnum.PHASE_5 },
                            { label: '第六阶段 (Phase 6)', value: PhaseEnum.PHASE_6 },
                        ]}
                        value={formData.phase}
                        onChange={e => setFormData({...formData, phase: parseInt(e.target.value)})}
                        required
                        />
                    </div>

                    {/* Grade Selection (Radio Style) */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        班级年级 (Grade) <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                            { label: '1年级', value: GradeEnum.ONE },
                            { label: '2年级', value: GradeEnum.TWO },
                            { label: '3年级', value: GradeEnum.THREE },
                            { label: '4年级', value: GradeEnum.FOUR },
                            { label: '5年级', value: GradeEnum.FIVE },
                            { label: '6年级', value: GradeEnum.SIX },
                        ].map((gradeOpt) => (
                            <label 
                            key={gradeOpt.value}
                            className={`
                                cursor-pointer flex items-center justify-center px-2 py-2.5 rounded-lg border text-sm font-medium transition-all
                                ${formData.grade === gradeOpt.value 
                                ? 'bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                            `}
                            >
                            <input
                                type="radio"
                                name="grade"
                                value={gradeOpt.value}
                                checked={formData.grade === gradeOpt.value}
                                onChange={() => setFormData({...formData, grade: gradeOpt.value})}
                                className="sr-only"
                            />
                            {gradeOpt.label}
                            </label>
                        ))}
                        </div>
                    </div>

                    {/* Advanced Options Toggle (Only for Class Name now) - Hide in Batch Mode */}
                    {mode === 'single' && (
                        <div className="pt-2">
                            <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                            >
                            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showAdvanced ? '收起高级选项' : '展开高级选项 (自定义班级名称)'}
                            </button>
                            
                            {showAdvanced && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <Input
                                label="班级名称 (选填)"
                                placeholder="留空则自动生成"
                                value={formData.className}
                                onChange={e => setFormData({...formData, className: e.target.value})}
                                className="bg-white"
                                />
                            </div>
                            )}
                        </div>
                    )}
                 </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading || !config.authToken}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg
                  ${loading 
                    ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                    : !config.authToken 
                      ? 'bg-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-blue-900/20 hover:shadow-blue-900/30 active:scale-[0.99]'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {mode === 'batch' ? `批量执行中 (${batchProgress.current}/${batchProgress.total})...` : '执行中...'}
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    {mode === 'batch' ? '开始批量建班' : '开始一键建班'}
                  </>
                )}
              </button>
              
              {!config.authToken && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100">
                  <AlertCircle size={14} />
                  <span>请先前往左侧“全局配置”菜单填写 Authorization Token 方可使用。</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Status Log */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col sticky top-6 max-h-[calc(100vh-3rem)]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm rounded-t-xl">
              <h3 className="font-semibold text-slate-800">执行日志</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 text-sm font-mono">
                {statusLog.length === 0 && step === 'idle' && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                        等待开始任务...
                    </div>
                )}
                
                <div className="divide-y divide-slate-50">
                    {statusLog.map((log, idx) => (
                        <div key={idx} className="px-4 py-2 hover:bg-slate-50 text-xs text-slate-600 break-all leading-relaxed">
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {/* Progress Indicators (Only for Single Mode) */}
            {mode === 'single' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl space-y-3">
                    {/* Step 1: Create */}
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${step !== 'idle' && step !== 'error' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-400'}`}>
                            <Calendar size={12} />
                        </div>
                        <span className={`text-xs ${step === 'creating' ? 'font-bold text-sky-600' : 'text-slate-600'}`}>
                            1. 创建班级信息
                        </span>
                        {createdClassId && <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">ID: {createdClassId}</span>}
                    </div>

                    {/* Step 2: Get Plan */}
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${['fetching_plan', 'unlocking_units', 'complete'].includes(step) ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-400'}`}>
                            <ListChecks size={12} />
                        </div>
                        <span className={`text-xs ${step === 'fetching_plan' ? 'font-bold text-sky-600' : 'text-slate-600'}`}>
                            2. 获取当前班级课表
                        </span>
                        {courseUnits.length > 0 && <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{courseUnits.length} 个单元</span>}
                    </div>

                    {/* Step 3: Unlock */}
                    <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${['unlocking_units', 'complete'].includes(step) ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-slate-300 text-slate-400'}`}>
                            <Clock size={12} />
                        </div>
                        <span className={`text-xs ${step === 'unlocking_units' ? 'font-bold text-sky-600' : 'text-slate-600'}`}>
                            3. 设置当天17:00解锁
                        </span>
                        {step === 'unlocking_units' && courseUnits.length > 0 && (
                            <span className="ml-auto text-[10px] text-slate-500">{Math.round((unlockedCount / courseUnits.length) * 100)}%</span>
                        )}
                    </div>
                    {/* Progress Bar for Unlock */}
                    {step === 'unlocking_units' && courseUnits.length > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-0 mb-1 ml-9">
                            <div 
                                className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${(unlockedCount / courseUnits.length) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

             {/* Batch Progress */}
             {mode === 'batch' && batchProgress.total > 0 && (
                 <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                        <span>批量任务进度</span>
                        <span>{batchProgress.current} / {batchProgress.total}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                            className="bg-sky-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        ></div>
                    </div>
                 </div>
             )}

            {/* Result Area */}
            {step === 'complete' && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 rounded-xl animate-in fade-in z-10 border border-green-100">
                <div className="bg-green-100 p-3 rounded-full text-green-600 mb-3 shadow-sm ring-4 ring-green-50">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <p className="font-bold text-slate-800 text-lg">全部流程执行完毕</p>
                {mode === 'single' && (
                    <div className="text-xs text-slate-500 mt-2 mb-6 text-center space-y-1">
                        <p>班级 ID: {createdClassId}</p>
                        <p>已解锁 {unlockedCount} 个课程单元</p>
                    </div>
                )}
                {mode === 'batch' && (
                    <div className="text-xs text-slate-500 mt-2 mb-6 text-center space-y-1">
                        <p>已处理 {batchProgress.current} 个班级</p>
                        <p>详细结果请查看日志</p>
                    </div>
                )}
                <button 
                  onClick={resetForm} 
                  className="px-6 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 flex items-center gap-2"
                >
                  <Play size={14} fill="currentColor" />
                  {mode === 'batch' ? '返回' : '继续创建下一个'}
                </button>
              </div>
            )}
            
            {step === 'error' && (
              <div className="p-4 bg-red-50 border-t border-red-100">
                  <div className="flex items-start gap-2 text-red-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p className="text-xs font-medium">执行失败</p>
                  </div>
                  <p className="text-xs text-red-600 mt-1 pl-6">{errorMsg}</p>
                  <button onClick={() => setStep('idle')} className="mt-3 text-xs bg-white border border-red-200 text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors">重置</button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};