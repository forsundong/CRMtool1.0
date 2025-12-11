import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { GlobalConfig, TemplateRecord, FlattenedUnitItem } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, Search, FileSearch, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface TemplateValidatorProps {
  config: GlobalConfig;
}

export const TemplateValidator: React.FC<TemplateValidatorProps> = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [templateInfo, setTemplateInfo] = useState<TemplateRecord | null>(null);
  const [unitList, setUnitList] = useState<FlattenedUnitItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.authToken) {
      alert("请先配置全局 Token");
      return;
    }
    if (!templateId) return;

    setLoading(true);
    setErrorMsg('');
    setTemplateInfo(null);
    setUnitList([]);
    setHasSearched(true);

    try {
      // Input sanitization
      const cleanId = templateId.trim();

      // Step 1: Get Basic Info
      const pageRes = await CrmService.getTemplatePage(cleanId, config);
      
      if (pageRes.success && pageRes.data.records.length > 0) {
        // Find exact match if multiple returned (though ID search should be unique)
        const record = pageRes.data.records.find(r => r.templateId.toString() === cleanId || r.id.toString() === cleanId);
        
        if (record) {
            setTemplateInfo(record);
            
            // Step 2: Get Tree Data using the internal record ID to be safe
            // However, the API usually expects the ID found in step 1 record.id
            const treeRes = await CrmService.getTemplateTree(record.id.toString(), config);
            
            if (treeRes.success && treeRes.data) {
                // Step 3: Process and Sort Data
                const flatList: FlattenedUnitItem[] = [];

                treeRes.data.forEach(unitContainer => {
                    if (unitContainer.saleUnitDTOList && unitContainer.saleUnitDTOList.length > 0) {
                        unitContainer.saleUnitDTOList.forEach(lesson => {
                            flatList.push({
                                level: unitContainer.level,
                                unitSequence: unitContainer.sequence,
                                unitName: unitContainer.name,
                                lessonName: lesson.name,
                                unitId: lesson.unitId,
                                lessonId: lesson.id
                            });
                        });
                    }
                });

                // Sort: 1. By Level (Asc), 2. By Unit Sequence (Asc), 3. By SaleUnit List Order (Implicit in loop)
                // The loop order preserves the list order, so mainly sort by level/sequence of container
                flatList.sort((a, b) => {
                    if (a.level !== b.level) return a.level - b.level;
                    return a.unitSequence - b.unitSequence;
                });

                setUnitList(flatList);
            } else {
                setErrorMsg(treeRes.message || "无法获取模板树结构数据");
            }

        } else {
            setErrorMsg("未找到匹配的模板ID");
        }
      } else {
        setErrorMsg("未找到该模板ID信息");
      }

    } catch (err: any) {
      setErrorMsg(err.message || "查询失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUnitIds = () => {
    if (unitList.length === 0) return;
    
    // Join with newline character
    const text = unitList.map(u => u.unitId).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
    }).catch(err => {
        console.error('Copy failed', err);
        alert('复制失败，请手动复制');
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">课程模板校验</h2>
          <p className="text-slate-500 mt-1 text-sm">输入模板ID，查询模板信息并预览包含的所有 UnitID。</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="flex items-end gap-4 max-w-xl">
            <div className="flex-1">
                <Input
                    label="课程模板 ID"
                    placeholder="例如: 9798"
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                    required
                />
            </div>
            <button
                type="submit"
                disabled={loading || !config.authToken}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all mb-[1px]
                  ${loading || !config.authToken
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-900/10'}`}
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                查找
            </button>
        </form>
         {!config.authToken && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 mt-3 max-w-xl">
            <AlertCircle size={14} />
            <span>请先在全局配置中设置 Token</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Step 2: Info Card */}
      {templateInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <h3 className="font-semibold text-slate-800">模板信息概览</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div>
                    <span className="block text-slate-500 mb-1 text-xs">模板名称</span>
                    <span className="font-medium text-slate-900">{templateInfo.name}</span>
                </div>
                <div>
                    <span className="block text-slate-500 mb-1 text-xs">Template ID</span>
                    <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{templateInfo.id}</span>
                </div>
                <div>
                    <span className="block text-slate-500 mb-1 text-xs">Unit Combination ID</span>
                    <span className="font-mono text-slate-900">{templateInfo.unitCombinationId}</span>
                </div>
            </div>
        </div>
      )}

      {/* Step 3: Data Table */}
      {unitList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 delay-75">
             <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FileSearch size={18} className="text-sky-600" />
                    Unit ID 列表 (按 Level 排序)
                </h3>
                
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-medium">
                        共 {unitList.length} 条记录
                    </span>
                    <button
                        onClick={handleCopyUnitIds}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
                        title="复制所有 Unit ID (换行分隔)"
                    >
                        {copying ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copying ? <span className="text-green-600">已复制</span> : '复制 Unit ID'}
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 w-20">Level</th>
                            <th className="px-6 py-3">单元名称 (Unit Name)</th>
                            <th className="px-6 py-3">课程名称 (Lesson Name)</th>
                            <th className="px-6 py-3">Unit ID</th>
                            <th className="px-6 py-3 w-24">Order</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {unitList.map((item, index) => (
                            <tr key={`${item.unitId}-${index}`} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-semibold text-slate-700">{item.level}</td>
                                <td className="px-6 py-3 text-slate-600">{item.unitName}</td>
                                <td className="px-6 py-3 text-slate-800">{item.lessonName}</td>
                                <td className="px-6 py-3">
                                    <span className="font-mono bg-sky-50 text-sky-700 px-2 py-1 rounded border border-sky-100 select-all">
                                        {item.unitId}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-400 text-xs font-mono">{index + 1}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}
      
      {hasSearched && !loading && !errorMsg && unitList.length === 0 && templateInfo && (
          <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
             <p>该模板下没有找到关联的 SaleUnit 数据</p>
          </div>
      )}
    </div>
  );
};