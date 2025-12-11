import React, { useState, useMemo } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { GlobalConfig, GradeEnum } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, CopyPlus, Calculator, AlertCircle, Copy, Check, Edit3, UploadCloud, CheckCircle2, Send, Rocket, Globe } from 'lucide-react';

interface CourseCreatorProps {
  config: GlobalConfig;
}

const GradeMap: Record<string, string> = {
  ONE: '一年级',
  TWO: '二年级',
  THREE: '三年级',
  FOUR: '四年级',
  FIVE: '五年级',
  SIX: '六年级'
};

export const CourseCreator: React.FC<CourseCreatorProps> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showCorsHint, setShowCorsHint] = useState(false);
  
  // Step 1 State
  const [newUnitIds, setNewUnitIds] = useState<number[]>([]);
  const [copyingText, setCopyingText] = useState(false);
  const [formData, setFormData] = useState({
    templateId: '139945',
    grade: GradeEnum.ONE,
    unitCount: 20,
    lessonCount: 3
  });

  // Step 2 State (Edit)
  const [editUnitIds, setEditUnitIds] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [nameSuffix, setNameSuffix] = useState(''); // New state for suffix

  // Step 3 State (Audit)
  const [auditUnitIds, setAuditUnitIds] = useState('');
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditDesc, setAuditDesc] = useState('1');

  // Step 4 State (Publish)
  const [publishUnitIds, setPublishUnitIds] = useState('');
  const [publishProgress, setPublishProgress] = useState(0);

  // Calculate total copies needed
  const totalCopies = useMemo(() => {
    return (formData.unitCount || 0) * (formData.lessonCount || 0);
  }, [formData.unitCount, formData.lessonCount]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleError = (step: string, index: number, total: number, err: any) => {
    const errorPrefix = `❌ [${step}] (${index + 1}/${total})`;
    if (err.message === 'Failed to fetch') {
        setShowCorsHint(true);
        addLog(`${errorPrefix} 请求失败: 被浏览器拦截 (Failed to fetch)`);
        addLog(`🔴 请检查是否安装了 "Allow CORS" 插件并已开启！`);
    } else {
        addLog(`${errorPrefix} 异常: ${err.message}`);
    }
  };

  // --- Step 1: Batch Copy ---
  const handleBatchCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.authToken) return alert("请先配置全局 Token");
    
    // Parse Templates
    const templateIds = formData.templateId.split(/[,，\s]+/).filter(id => id.trim());
    
    if (templateIds.length === 0) {
        return alert("请输入至少一个模板 Unit ID");
    }

    // Validation: If multiple templates, count must match lesson count
    if (templateIds.length > 1 && templateIds.length !== formData.lessonCount) {
        alert(`参数不匹配！\n\n检测到 ${templateIds.length} 个模板 ID，但每单元讲数为 ${formData.lessonCount}。\n\n在多模板模式下，模板数量必须严格等于每单元讲数，以便按顺序生成 D1, D2, D3...`);
        return;
    }

    setLoading(true);
    setLogs([]);
    setNewUnitIds([]);
    setShowCorsHint(false);
    const createdIds: number[] = [];

    const modeText = templateIds.length > 1 ? `多模板轮询 (${templateIds.length}个)` : `单模板复制 (${templateIds[0]})`;
    addLog(`[模板复制] 开始: ${modeText}, 目标年级 ${formData.grade}, 总计 ${totalCopies} 次`);
    
    try {
        for (let i = 0; i < totalCopies; i++) {
            // Logic: Determine which template to use for this iteration
            // If single template, always index 0.
            // If multiple, iterate through them based on lesson position (i % lessonCount)
            // Example: lessonCount=3. i=0->T1, i=1->T2, i=2->T3, i=3->T1...
            const templateIndex = i % formData.lessonCount;
            const targetTemplateId = templateIds.length > 1 ? templateIds[templateIndex] : templateIds[0];

            try {
                const res = await CrmService.copyUnit(targetTemplateId, config);
                if (res.code === 200 && res.data) {
                    createdIds.push(res.data.newUnitId);
                    setNewUnitIds([...createdIds]);
                    addLog(`✅ [模板复制] (${i + 1}/${totalCopies}) 源[${targetTemplateId}] -> 新[${res.data.newUnitId}]`);
                } else {
                    addLog(`❌ [模板复制] (${i + 1}/${totalCopies}) 源[${targetTemplateId}] 失败: ${res.message}`);
                }
            } catch (err: any) {
                handleError('模板复制', i, totalCopies, err);
            }
            if (i < totalCopies - 1) await new Promise(r => setTimeout(r, 200));
        }
        
        // Auto-fill next steps
        if (createdIds.length > 0) {
            const idString = createdIds.join('\n');
            setEditUnitIds(idString);
            setAuditUnitIds(idString);
            setPublishUnitIds(idString);
            addLog(`🎉 [模板复制] 结束。成功创建 ${createdIds.length} 个副本。`);
        } else {
            addLog(`⚠️ [模板复制] 结束。未成功创建任何副本。`);
        }
    } catch (err: any) {
        addLog(`❌ 严重错误: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // --- Step 2: Batch Edit & Rename ---
  const handleBatchEdit = async () => {
    if (!config.authToken) return alert("请先配置全局 Token");
    
    const ids = editUnitIds.split(/[\n,，\s]+/).filter(id => id.trim());
    if (ids.length === 0) return alert("请输入 Unit ID");

    setLoading(true);
    setEditProgress(0);
    setShowCorsHint(false);
    addLog(`[新课编辑] 开始: 批量重命名与配置 (${ids.length} 个单元)`);

    let successCount = 0;

    for (let i = 0; i < ids.length; i++) {
        const unitIdStr = ids[i];
        
        try {
            // 1. Search to get Internal ID
            const pageRes = await CrmService.getUnitPage(unitIdStr, config);
            if (pageRes.code !== 200 || !pageRes.data?.records?.[0]?.id) {
                addLog(`⚠️ [新课编辑] [${unitIdStr}] 未找到单元记录，跳过`);
                continue;
            }
            const internalId = pageRes.data.records[0].id;

            // 2. Start Edit
            const startRes = await CrmService.startEdit(internalId, config);
             if (startRes.code !== 200) {
                // If it fails (e.g. already in edit mode), log warning but proceed to try update
                addLog(`🔸 [新课编辑] [${unitIdStr}] 开启编辑状态返回: ${startRes.message}`);
            }

            // 3. Get Detail (to get full payload structure)
            const detailRes = await CrmService.getUnitDetail(internalId, config);
            if (detailRes.code !== 200 || !detailRes.data) {
                addLog(`⚠️ [新课编辑] [${unitIdStr}] 获取详情失败，跳过`);
                continue;
            }

            // 4. Calculate New Name with Suffix
            const unitIndex = Math.floor(i / formData.lessonCount) + 1;
            const lessonIndex = (i % formData.lessonCount) + 1;
            const gradeText = GradeMap[formData.grade] || '未知年级';
            const suffix = nameSuffix.trim();
            const newName = `${gradeText}W${unitIndex}D${lessonIndex}${suffix}`;

            // 5. Update (Rename)
            const detail = detailRes.data;
            const payload = {
                id: internalId,
                normalDetailInfo: {
                    ...detail.normalDetailInfo,
                    name: newName,
                }
            };

            const updateRes = await CrmService.updateUnit(payload, config);
            
            if (updateRes.code === 200) {
                successCount++;
                addLog(`✅ [新课编辑] [${unitIdStr}] 重命名为 "${newName}" 成功`);
            } else {
                addLog(`❌ [新课编辑] [${unitIdStr}] 更新失败: ${updateRes.message}`);
            }

        } catch (err: any) {
            handleError('新课编辑', i, ids.length, err);
        }

        setEditProgress(Math.round(((i + 1) / ids.length) * 100));
        if (i < ids.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    setLoading(false);
    addLog(`🎉 [新课编辑] 结束。成功处理 ${successCount}/${ids.length} 个单元。`);
  };

  // --- Step 3: Batch Submit Audit ---
  const handleBatchAudit = async () => {
    if (!config.authToken) return alert("请先配置全局 Token");
    
    const ids = auditUnitIds.split(/[\n,，\s]+/).filter(id => id.trim());
    if (ids.length === 0) return alert("请输入 Unit ID");

    setLoading(true);
    setAuditProgress(0);
    setShowCorsHint(false);
    addLog(`[新课提审] 开始: 批量提交审核 (${ids.length} 个单元)`);

    let successCount = 0;

    for (let i = 0; i < ids.length; i++) {
        const unitIdStr = ids[i];
        
        try {
            // 1. Search to get Internal ID
            const pageRes = await CrmService.getUnitPage(unitIdStr, config);
            if (pageRes.code !== 200 || !pageRes.data?.records?.[0]?.id) {
                addLog(`⚠️ [新课提审] [${unitIdStr}] 未找到单元记录，跳过`);
                continue;
            }
            const internalId = pageRes.data.records[0].id;

            // 2. Submit Audit
            const res = await CrmService.submitAudit(internalId, auditDesc, config);
            
            if (res.code === 200) {
                successCount++;
                addLog(`✅ [新课提审] [${unitIdStr}] 提交审核成功`);
            } else {
                addLog(`❌ [新课提审] [${unitIdStr}] 提交失败: ${res.message}`);
            }
        } catch (err: any) {
             handleError('新课提审', i, ids.length, err);
        }

        setAuditProgress(Math.round(((i + 1) / ids.length) * 100));
        if (i < ids.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    setLoading(false);
    addLog(`🎉 [新课提审] 结束。成功提交 ${successCount}/${ids.length} 个单元。`);
  };

  // --- Step 4: Batch Publish ---
  const handleBatchPublish = async () => {
    if (!config.authToken) return alert("请先配置全局 Token");
    
    const ids = publishUnitIds.split(/[\n,，\s]+/).filter(id => id.trim());
    if (ids.length === 0) return alert("请输入 Unit ID");

    setLoading(true);
    setPublishProgress(0);
    setShowCorsHint(false);
    addLog(`[新课发布] 开始: 批量发布上线 (${ids.length} 个单元)`);

    let successCount = 0;

    for (let i = 0; i < ids.length; i++) {
        const unitIdStr = ids[i];
        
        try {
            // 1. Search to get Internal ID
            const pageRes = await CrmService.getUnitPage(unitIdStr, config);
            if (pageRes.code !== 200 || !pageRes.data?.records?.[0]?.id) {
                addLog(`⚠️ [新课发布] [${unitIdStr}] 未找到单元记录，跳过`);
                continue;
            }
            const internalId = pageRes.data.records[0].id;

            // 2. Audit Pass
            const auditRes = await CrmService.auditUnitPass(internalId, config);
            if (auditRes.code !== 200) {
                if (auditRes.code === 403 || auditRes.message?.includes('权限')) {
                    throw new Error("无审核权限(403)。请检查账号角色，或更换账号审核。");
                }
                throw new Error(`审核通过失败: ${auditRes.message}`);
            }
            addLog(`🔹 [新课发布] [${unitIdStr}] 审核通过 OK`);

            // 3. Pre Online
            const preRes = await CrmService.preOnline(internalId, config);
            if (preRes.code !== 200) throw new Error(`预发布失败: ${preRes.message}`);
            addLog(`🔹 [新课发布] [${unitIdStr}] 预发布 OK`);

            // 4. Publish Online
            const pubRes = await CrmService.publicationOnline(internalId, config);
            if (pubRes.code !== 200) throw new Error(`正式发布失败: ${pubRes.message}`);
            
            successCount++;
            addLog(`✅ [新课发布] [${unitIdStr}] 正式上线成功`);

        } catch (err: any) {
             handleError('新课发布', i, ids.length, err);
        }

        setPublishProgress(Math.round(((i + 1) / ids.length) * 100));
        if (i < ids.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    setLoading(false);
    addLog(`🎉 [新课发布] 结束。成功上线 ${successCount}/${ids.length} 个单元。`);
  };

  const handleCopyIds = () => {
      if (newUnitIds.length === 0) return;
      const text = newUnitIds.join('\n');
      navigator.clipboard.writeText(text).then(() => {
          setCopyingText(true);
          setTimeout(() => setCopyingText(false), 2000);
      });
  };

  const handleTestConnection = async () => {
    addLog(`[测试连接] 尝试连接 TMS 服务...`);
    try {
        await CrmService.copyUnit(139945, config);
        addLog(`✅ [测试连接] 连接成功！CORS 设置看似正常。`);
        alert("连接成功！");
    } catch (err: any) {
        if (err.message === 'Failed to fetch') {
            setShowCorsHint(true);
            addLog(`❌ [测试连接] 失败: 被浏览器拦截 (Failed to fetch)`);
        } else {
             addLog(`❌ [测试连接] 异常: ${err.message}`);
        }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">课程快速创建</h2>
          <p className="text-slate-500 mt-1 text-sm">全流程自动化：复制 {'->'} 编辑 {'->'} 审核 {'->'} 发布。</p>
        </div>
        {!config.authToken && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100">
            <AlertCircle size={14} />
            <span>未配置 Token</span>
          </div>
        )}
      </div>

       <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-2 rounded-lg text-xs flex items-center justify-between gap-2 mb-4">
         <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>注意：本工具访问受限 API，<b>必须</b>在浏览器中安装 "Allow CORS" 插件并开启，否则会报错 "Failed to fetch"。</span>
         </div>
         <button onClick={handleTestConnection} className="text-amber-700 underline hover:text-amber-900">测试连接</button>
       </div>

       {showCorsHint && (
           <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3 animate-pulse">
               <Globe className="text-red-600 mt-1" size={20} />
               <div>
                   <h4 className="font-bold text-red-800 text-sm">连接失败：需要 CORS 权限</h4>
                   <p className="text-xs text-red-700 mt-1">
                       浏览器阻止了对 TMS 服务的访问。这是一个安全特性，但对于此类内部工具，您需要绕过它。<br/>
                       请在 Chrome 商店搜索并安装 <b>"Allow CORS: Access-Control-Allow-Origin"</b> 插件，启用后重试。
                   </p>
               </div>
           </div>
       )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Steps Area */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Step 1: Copy */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="bg-sky-100 text-sky-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                        批量复制
                    </h3>
                    <Calculator size={16} className="text-slate-400" />
                </div>
                <form onSubmit={handleBatchCopy} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                             <label className="text-sm font-medium text-slate-700">模板 Unit ID (支持多个)</label>
                             <input 
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                placeholder="例如: 139945, 139946" 
                                value={formData.templateId} 
                                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })} 
                                required 
                             />
                             <p className="text-[10px] text-slate-500">多模板模式下，模板数量需等于每单元讲数。</p>
                         </div>
                         <Select label="目标年级" options={[{ label: '一年级', value: GradeEnum.ONE }, { label: '二年级', value: GradeEnum.TWO }, { label: '三年级', value: GradeEnum.THREE }, { label: '四年级', value: GradeEnum.FOUR }, { label: '五年级', value: GradeEnum.FIVE }, { label: '六年级', value: GradeEnum.SIX }]} value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value as GradeEnum })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="单元数" type="number" min="1" value={formData.unitCount} onChange={(e) => setFormData({ ...formData, unitCount: parseInt(e.target.value) || 0 })} required />
                        <Input label="每单元讲数" type="number" min="1" value={formData.lessonCount} onChange={(e) => setFormData({ ...formData, lessonCount: parseInt(e.target.value) || 0 })} required />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500">预计生成: <b>{totalCopies}</b> 个副本</span>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                            {loading && newUnitIds.length < totalCopies ? <Loader2 className="animate-spin" size={14} /> : <CopyPlus size={14} />}
                            执行复制
                        </button>
                    </div>
                </form>
            </div>

            {/* Step 2: Edit */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                        批量编辑 & 重命名
                    </h3>
                    <Edit3 size={16} className="text-slate-400" />
                </div>
                <div className="p-6 space-y-4">
                     <div className="relative">
                        <textarea
                            className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-200 outline-none resize-none"
                            placeholder="Unit ID 列表 (自动填充，也可手动粘贴)"
                            value={editUnitIds}
                            onChange={e => setEditUnitIds(e.target.value)}
                        />
                     </div>
                     
                     <div className="flex items-center gap-3">
                         <div className="flex-1">
                             <Input 
                                label="命名后缀 (可选)" 
                                placeholder="例如: -A" 
                                value={nameSuffix} 
                                onChange={e => setNameSuffix(e.target.value)}
                                className="text-xs h-8 py-1"
                             />
                         </div>
                     </div>

                     <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500">
                            规则: {GradeMap[formData.grade]}W[单元]D[讲]{nameSuffix}
                        </div>
                        <button onClick={handleBatchEdit} disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                             {loading && editProgress > 0 ? <Loader2 className="animate-spin" size={14} /> : <Edit3 size={14} />}
                             开始编辑
                        </button>
                     </div>
                     {editProgress > 0 && editProgress < 100 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-orange-500 h-full transition-all" style={{width: `${editProgress}%`}}></div>
                        </div>
                     )}
                </div>
            </div>

            {/* Step 3: Audit */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                        批量提交审核
                    </h3>
                    <Send size={16} className="text-slate-400" />
                </div>
                <div className="p-6 space-y-4">
                     <textarea
                        className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                        value={auditUnitIds}
                        onChange={e => setAuditUnitIds(e.target.value)}
                     />
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">审核描述:</span>
                            <input type="text" value={auditDesc} onChange={e => setAuditDesc(e.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs w-20" />
                        </div>
                        <button onClick={handleBatchAudit} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                             {loading && auditProgress > 0 ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                             提交审核
                        </button>
                     </div>
                     {auditProgress > 0 && auditProgress < 100 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{width: `${auditProgress}%`}}></div>
                        </div>
                     )}
                </div>
            </div>

            {/* Step 4: Publish */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 ring-1 ring-green-100">
                <div className="p-4 border-b border-green-50 bg-green-50/30 flex justify-between items-center">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                        <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                        批量发布上线
                    </h3>
                    <Rocket size={16} className="text-green-600" />
                </div>
                <div className="p-6 space-y-4">
                     <div className="text-xs text-green-700 bg-green-50 p-3 rounded border border-green-100 mb-2">
                        此步骤将依次执行：<b>审核通过 (Pass)</b> ➔ <b>预发布 (Pre-Online)</b> ➔ <b>正式发布 (Publish)</b>
                        <br/>
                        <span className="opacity-75">注意：如果遇到“权限不足”错误，请确保当前账号具有审核权限，或更换其他账号审核。</span>
                     </div>
                     <textarea
                        className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-green-200 outline-none resize-none"
                        value={publishUnitIds}
                        onChange={e => setPublishUnitIds(e.target.value)}
                     />
                     <div className="flex justify-end items-center">
                        <button onClick={handleBatchPublish} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
                             {loading && publishProgress > 0 ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
                             开始发布
                        </button>
                     </div>
                     {publishProgress > 0 && publishProgress < 100 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full transition-all" style={{width: `${publishProgress}%`}}></div>
                        </div>
                     )}
                </div>
            </div>

        </div>

        {/* Right: Logs & Quick Actions */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col sticky top-6 max-h-[calc(100vh-3rem)]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm rounded-t-xl">
                    <h3 className="font-semibold text-slate-800">执行日志</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs font-mono min-h-[300px]">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <CopyPlus size={24} className="opacity-20" />
                            <p>等待任务开始...</p>
                        </div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={`p-2 rounded border break-all ${
                            log.includes('❌') ? 'bg-red-50 border-red-100 text-red-700' : 
                            log.includes('✅') ? 'bg-green-50 border-green-100 text-green-700' : 
                            log.includes('⚠️') ? 'bg-amber-50 border-amber-100 text-amber-700' :
                            log.includes('步骤') ? 'bg-blue-50 border-blue-100 text-blue-700 font-bold' :
                            'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                            {log}
                        </div>
                    ))}
                </div>

                {newUnitIds.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            type="button"
                            onClick={handleCopyIds}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            {copyingText ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            {copyingText ? <span className="text-green-600">已复制 ID</span> : '复制生成的 Unit ID'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};