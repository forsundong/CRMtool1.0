
import React, { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { GlobalConfig, GradeEnum, CreateTemplatePayload, TemplateTreeItemDTO, CreateSaleUnitPayload } from '../types';
import { CrmService } from '../services/crmService';
import { Loader2, FilePlus, AlertCircle, CheckCircle, FileText, Send, Play, Layers, Hash, ListOrdered, Wrench, RefreshCw, Plus, Save } from 'lucide-react';

interface TemplateCreatorProps {
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

const numberToChinese = (num: number): string => {
  const chnNumChar = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const chnUnitSection = ["", "万", "亿", "万亿", "亿亿"];
  const chnUnitChar = ["", "十", "百", "千"];

  const sectionToChinese = (section: number) => {
    let str = '';
    let unitPos = 0;
    let zero = true;
    while (section > 0) {
      let v = section % 10;
      if (v === 0) {
        if (!zero) {
          zero = true;
          str = chnNumChar[v] + str;
        }
      } else {
        zero = false;
        str = chnNumChar[v] + chnUnitChar[unitPos] + str;
      }
      unitPos++;
      section = Math.floor(section / 10);
    }
    return str;
  }

  let unitPos = 0;
  let str = '';
  let needZero = false;

  if (num === 0) return chnNumChar[0];
  
  if (num >= 10 && num < 20) {
      return "十" + (num % 10 === 0 ? "" : chnNumChar[num % 10]);
  }

  while (num > 0) {
    let section = num % 10000;
    if (needZero) {
      str = chnNumChar[0] + str;
    }
    let strIns = sectionToChinese(section);
    str = (section !== 0) ? (strIns + chnUnitSection[unitPos] + str) : (chnUnitSection[unitPos] + str);
    needZero = (section < 1000 && section > 0);
    num = Math.floor(num / 10000);
    unitPos++;
  }
  return str;
};

export const TemplateCreator: React.FC<TemplateCreatorProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'debug'>('wizard');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // --- Wizard State ---
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    unitCombinationName: '',
    grade: GradeEnum.ONE,
    courseGroup: 2, 
    phase: 1,
    businessLabel: 'Normal',
    description: '',
  });

  const [structureInfo, setStructureInfo] = useState({
      totalUnitCount: 20,
      lessonsPerUnit: 3,
      deductSequence: '4, 4, 4',
      unitIds: ''
  });

  // --- Debug Mode State ---
  const [debugTemplateId, setDebugTemplateId] = useState('');
  const [debugUnitCombId, setDebugUnitCombId] = useState<number | null>(null);
  const [debugTree, setDebugTree] = useState<TemplateTreeItemDTO[]>([]);
  
  // Debug Step 1: Create Container
  const [debugContainerName, setDebugContainerName] = useState('第一单元');
  
  // Debug Step 2: Add Lesson
  const [selectedContainerIdx, setSelectedContainerIdx] = useState(0);
  const [debugLessonUnitId, setDebugLessonUnitId] = useState('');
  const [debugLessonName, setDebugLessonName] = useState('二年级W1D1');
  const [debugDeduct, setDebugDeduct] = useState(4);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleCombinationNameChange = (val: string) => {
    setBasicInfo(prev => ({
        ...prev,
        unitCombinationName: val,
        name: (!prev.name || prev.name === prev.unitCombinationName) ? val : prev.name
    }));
  };

  // --- Debug Mode Functions ---

  const loadTemplateForDebug = async () => {
      if (!config.authToken) return alert("请先配置 Token");
      if (!debugTemplateId) return alert("请输入 Template ID");
      
      setLoading(true);
      setLogs([]);
      addLog(`🔍 查询模板 ID: ${debugTemplateId}...`);
      
      try {
          // Use getTemplateById for robust fetching even if draft
          const infoRes = await CrmService.getTemplateById(debugTemplateId, config);
          if (infoRes.success && infoRes.data) {
              const record = infoRes.data;
              setDebugUnitCombId(record.unitCombinationId);
              addLog(`✅ 找到模板: ${record.name}`);
              addLog(`🔑 UnitCombinationID: ${record.unitCombinationId}`);
              
              // Get Tree
              const treeRes = await CrmService.getTemplateTree(record.id.toString(), config);
              if (treeRes.success) {
                  // Normalize tree data
                  const mappedTree: TemplateTreeItemDTO[] = (treeRes.data || []).map(item => ({
                      ...item,
                      type: 1, 
                      subjectId: 14,
                      customId: item.customId || "",
                      saleUnitIdList: item.saleUnitDTOList?.map(s => s.id) || [],
                      saleUnitDTOList: item.saleUnitDTOList || []
                  }));
                  
                  setDebugTree(mappedTree);
                  addLog(`✅ 加载树结构成功: 当前包含 ${mappedTree.length} 个单元`);
              } else {
                  addLog(`❌ 加载树结构失败: ${treeRes.message}`);
              }
          } else {
              addLog(`❌ 查询模板失败: ${infoRes.message}`);
          }
      } catch (err: any) {
          addLog(`❌ 异常: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

  const debugCreateContainer = async () => {
      if (!debugUnitCombId) return alert("请先加载模板 (获取 UnitCombinationID)");
      setLoading(true);
      
      try {
          // 1. Refresh tree first to ensure sequence is correct
          const treeRes = await CrmService.getTemplateTree(debugTemplateId, config);
          const currentTree = (treeRes.success ? treeRes.data : debugTree) || [];
          
          const newSequence = currentTree.length + 1;
          const newContainer: TemplateTreeItemDTO = {
              name: debugContainerName,
              type: 1,
              level: 1,
              sequence: newSequence,
              unitCombinationId: debugUnitCombId,
              saleUnitIdList: [],
              saleUnitDTOList: [],
              description: "",
              avatar: "",
              customId: "",
              subjectId: 14 // Required
          };
          
          // Append to fresh tree and clean up DTOs
          const treeToSave = currentTree.map(item => ({
              ...item,
              type: 1,
              subjectId: 14,
              customId: item.customId || "",
              saleUnitIdList: item.saleUnitDTOList?.map(s => s.id) || [],
              saleUnitDTOList: item.saleUnitDTOList?.map(s => ({
                  ...s,
                  type: 1,
                  unitCombinationId: debugUnitCombId,
                  teachType: "",
                  duration: 0,
                  delFlag: 0
              })) || []
          }));

          const newTree = [...treeToSave, newContainer];
          
          addLog(`💾 [Step 1] 尝试写入新单元 "${debugContainerName}"...`);
          
          const res = await CrmService.updateTemplateTree({
              id: parseInt(debugTemplateId),
              unitCombinationDataSavedDTOList: newTree
          }, config);
          
          if (res.code === 200) {
              addLog(`✅ 保存成功!`);
              await loadTemplateForDebug();
          } else {
              addLog(`❌ 保存失败: ${res.message}`);
          }
      } catch (err: any) {
          addLog(`❌ 异常: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

  const debugAddLesson = async () => {
      if (!debugUnitCombId) return alert("请先加载模板");
      if (debugTree.length === 0) return alert("树结构为空，请先创建单元");
      if (!debugLessonUnitId) return alert("请输入 Content Unit ID");

      setLoading(true);
      try {
          // 0. Refresh Tree State explicitly to handle cumulative updates
          addLog(`🔄 刷新当前树结构...`);
          const treeRes = await CrmService.getTemplateTree(debugTemplateId, config);
          
          if (!treeRes.success) throw new Error("无法获取最新树结构");
          
          // Map response to DTOs and find Max Sequence
          let globalMaxSeq = 0;
          const freshTree: TemplateTreeItemDTO[] = (treeRes.data || []).map(item => {
              if (item.saleUnitDTOList) {
                  item.saleUnitDTOList.forEach(s => {
                      if (s.sequence > globalMaxSeq) globalMaxSeq = s.sequence;
                  });
              }
              return {
                  ...item,
                  type: 1,
                  subjectId: 14,
                  customId: item.customId || "",
                  saleUnitIdList: item.saleUnitDTOList?.map(s => s.id) || [],
                  saleUnitDTOList: item.saleUnitDTOList?.map(s => ({
                      ...s,
                      type: 1,
                      unitCombinationId: debugUnitCombId,
                      teachType: "",
                      duration: 0,
                      delFlag: 0
                  })) || []
              };
          });

          // 1. Search Unit (Validation)
          addLog(`🔍 验证 Unit ID: ${debugLessonUnitId}...`);
          const searchRes = await CrmService.searchTemplateUnit(debugLessonUnitId, config);
          if (!searchRes || searchRes.length === 0) {
             addLog(`⚠️ Unit ID 搜索无结果，可能无效，但仍尝试创建...`);
          } else {
             addLog(`✅ Unit ID 验证通过`);
          }

          // 2. Create Sale Unit with Global Sequence
          const nextSeq = globalMaxSeq + 1;
          addLog(`1️⃣ 创建课时 "${debugLessonName}" (全局序号: ${nextSeq})...`);
          
          const targetContainerIndex = selectedContainerIdx; 
          const targetContainer = freshTree[targetContainerIndex]; 
          
          if (!targetContainer) throw new Error("目标单元不存在");

          const salePayload: CreateSaleUnitPayload = {
              name: debugLessonName,
              unitName: debugLessonName,
              unitType: "常规",
              deductClass: debugDeduct,
              description: "",
              lastUnit: 0,
              sequence: nextSeq, 
              subjectId: 14,
              unitId: parseInt(debugLessonUnitId)
          };
          
          const saleRes = await CrmService.createSaleUnit(salePayload, config);
          if (saleRes.code !== 200 || !saleRes.data) {
              throw new Error(`创建课时失败: ${saleRes.message}`);
          }
          const saleUnitId = saleRes.data;
          addLog(`✅ 课时创建成功 ID: ${saleUnitId}`);

          // 3. Update Tree locally
          targetContainer.saleUnitIdList.push(saleUnitId);
          targetContainer.saleUnitDTOList?.push({
              id: saleUnitId,
              name: debugLessonName,
              unitName: debugLessonName,
              unitType: "常规",
              deductClass: debugDeduct,
              lastUnit: 0,
              sequence: nextSeq,
              subjectId: 14,
              unitId: parseInt(debugLessonUnitId),
              version: 1,
              type: 1, 
              unitCombinationId: debugUnitCombId, 
              teachType: "",
              duration: 0,
              delFlag: 0
          });
          
          freshTree[targetContainerIndex] = targetContainer;

          // 4. Save Tree
          addLog(`💾 更新树结构 (添加课时到 ${targetContainer.name})...`);
          const updateRes = await CrmService.updateTemplateTree({
              id: parseInt(debugTemplateId),
              unitCombinationDataSavedDTOList: freshTree
          }, config);

          if (updateRes.code === 200) {
              addLog(`✅ 树结构更新成功!`);
              await loadTemplateForDebug();
          } else {
              addLog(`❌ 树结构更新失败: ${updateRes.message}`);
          }

      } catch (err: any) {
          addLog(`❌ 异常: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

  // --- Wizard Mode Function ---
  const handleOneClickCreation = async () => {
    if (!config.authToken) return alert("请先配置全局 Token");
    if (!basicInfo.name || !basicInfo.unitCombinationName) return alert("请填写模板名称信息");
    const deducts = structureInfo.deductSequence.split(/[,，\s]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
    if (deducts.length !== structureInfo.lessonsPerUnit) return alert(`各讲序课时数数量不匹配`);
    const unitIds = structureInfo.unitIds.split(/[\n,，\s]+/).filter(id => id.trim());
    const requiredIds = structureInfo.totalUnitCount * structureInfo.lessonsPerUnit;
    if (unitIds.length < requiredIds) {
        if (!confirm(`ID数量不足！继续?`)) return;
    }

    setLoading(true);
    setLogs([]);
    setProgress(0);
    addLog(`🚀 开始任务: 创建并保存 (无提审)...`);

    try {
        // --- Step 1: Create Template ---
        addLog(`1️⃣ 创建模板基础信息...`);
        const templatePayload: CreateTemplatePayload = {
            name: basicInfo.name,
            unitCombinationName: basicInfo.unitCombinationName,
            courseGroup: basicInfo.courseGroup,
            avatarUrl: "",
            businessLabel: basicInfo.businessLabel,
            description: basicInfo.description,
            direction: 0,
            grade: basicInfo.grade,
            groupType: "major",
            label: "",
            phase: basicInfo.phase,
            subjectId: 14
        };

        const templateRes = await CrmService.createTemplate(templatePayload, config);
        if (!templateRes.success || !templateRes.data) throw new Error(`创建模板失败: ${templateRes.message}`);
        
        const { unitTemplateId, unitCombinationId } = templateRes.data;
        addLog(`✅ 模板创建成功 (ID: ${unitTemplateId})`);

        // --- Step 2: Build Full Tree In Memory ---
        addLog(`2️⃣ 批量创建课时并构建完整结构...`);
        
        const fullTree: TemplateTreeItemDTO[] = [];
        const gradeText = GradeMap[basicInfo.grade] || '未知年级';
        let globalIdIndex = 0;
        let globalSaleUnitSequence = 0; // GLOBAL SEQUENCE

        for (let u = 0; u < structureInfo.totalUnitCount; u++) {
            const containerSequence = u + 1;
            const containerName = `第${numberToChinese(containerSequence)}单元`;

            const container: TemplateTreeItemDTO = {
                name: containerName,
                type: 1,
                level: 1, 
                sequence: containerSequence,
                unitCombinationId: unitCombinationId,
                saleUnitIdList: [],
                saleUnitDTOList: [], 
                description: "",
                avatar: "",
                customId: "",
                subjectId: 14
            };

            for (let l = 0; l < structureInfo.lessonsPerUnit; l++) {
                 if (globalIdIndex >= unitIds.length) break;
                 const contentUnitIdStr = unitIds[globalIdIndex];
                 globalIdIndex++;
                 globalSaleUnitSequence++; // Increment globally
                 
                 const lessonNum = l + 1;
                 const lessonName = `${gradeText}W${containerSequence}D${lessonNum}`;
                 const currentDeduct = deducts[l];
                 const isLastUnitInBatch = (u === structureInfo.totalUnitCount - 1) && (l === structureInfo.lessonsPerUnit - 1);

                 try {
                     const salePayload: CreateSaleUnitPayload = {
                        name: lessonName,
                        unitName: lessonName,
                        unitType: "常规",
                        deductClass: currentDeduct,
                        description: "",
                        lastUnit: isLastUnitInBatch ? 1 : 0,
                        sequence: globalSaleUnitSequence, // Use Global Sequence
                        subjectId: 14,
                        unitId: parseInt(contentUnitIdStr)
                    };

                    const saleRes = await CrmService.createSaleUnit(salePayload, config);
                    if (saleRes.code === 200 && saleRes.data) {
                        const saleUnitId = saleRes.data;
                        container.saleUnitIdList.push(saleUnitId);
                        
                        container.saleUnitDTOList?.push({
                            id: saleUnitId,
                            name: lessonName,
                            unitName: lessonName,
                            unitType: "常规",
                            deductClass: currentDeduct,
                            lastUnit: isLastUnitInBatch ? 1 : 0,
                            sequence: globalSaleUnitSequence,
                            subjectId: 14,
                            unitId: parseInt(contentUnitIdStr),
                            version: 1,
                            type: 1, 
                            unitCombinationId: unitCombinationId,
                            teachType: "", // Added
                            duration: 0,   // Added
                            delFlag: 0     // Added
                        });
                        addLog(`  - [${containerName}] 课时 ${lessonName} 创建成功 (ID: ${saleUnitId}, Seq: ${globalSaleUnitSequence})`);
                    } else {
                        addLog(`⚠️ 创建课时 ${lessonName} 失败: ${saleRes.message}`);
                    }
                 } catch (err: any) {
                     addLog(`⚠️ 创建课时异常: ${err.message}`);
                 }
            }
            
            fullTree.push(container);
            setProgress(Math.round(((u + 1) / structureInfo.totalUnitCount) * 100));
        }

        addLog(`3️⃣ 保存完整课程树结构 (${fullTree.length} 单元)...`);
        
        const updateRes = await CrmService.updateTemplateTree({
            id: unitTemplateId,
            unitCombinationDataSavedDTOList: fullTree
        }, config);

        if (updateRes.code !== 200) throw new Error(`保存完整结构失败: ${updateRes.message}`);
        
        addLog(`✅ 结构写入成功`);
        addLog(`🎉 任务完成！已保存模板结构 (请在后台手动提审)`);

    } catch (err: any) {
        addLog(`❌ 流程终止: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">课程模板创建</h2>
          <p className="text-slate-500 mt-1 text-sm">支持“一键全流程”和“分步调试”两种模式。</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
          <button onClick={() => setActiveTab('wizard')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'wizard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Play size={16} /> 一键全流程
          </button>
          <button onClick={() => setActiveTab('debug')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'debug' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Wrench size={16} /> 分步调试模式
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
            
            {activeTab === 'wizard' ? (
                <>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                            <FilePlus size={18} className="text-sky-600" />
                            <h3 className="font-semibold text-slate-800">1. 模板基础信息</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <Input label="对外展示名 (课程组合名)" placeholder="例如: 26年二年级春季启航班-A+班" value={basicInfo.unitCombinationName} onChange={(e) => handleCombinationNameChange(e.target.value)} required />
                                <Input label="模板名称 (内部管理)" placeholder="例如: 26年二年级春季启航班-A+班（上）" value={basicInfo.name} onChange={(e) => setBasicInfo({...basicInfo, name: e.target.value})} required />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <Select label="年级" options={[{ label: '一年级', value: GradeEnum.ONE }, { label: '二年级', value: GradeEnum.TWO }, { label: '三年级', value: GradeEnum.THREE }, { label: '四年级', value: GradeEnum.FOUR }, { label: '五年级', value: GradeEnum.FIVE }, { label: '六年级', value: GradeEnum.SIX }]} value={basicInfo.grade} onChange={(e) => setBasicInfo({ ...basicInfo, grade: e.target.value as GradeEnum })} required />
                                <Select label="课程类型" options={[{ label: '年课 (ID: 2)', value: 2 }, { label: 'L1 (ID: 1)', value: 1 }]} value={basicInfo.courseGroup} onChange={(e) => setBasicInfo({ ...basicInfo, courseGroup: parseInt(e.target.value) })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <Select label="阶段" options={[{ label: '第一阶段', value: 1 }, { label: '第二阶段', value: 2 }, { label: '第三阶段', value: 3 }, { label: '第四阶段', value: 4 }, { label: '第五阶段', value: 5 }, { label: '第六阶段', value: 6 }]} value={basicInfo.phase} onChange={(e) => setBasicInfo({ ...basicInfo, phase: parseInt(e.target.value) })} required />
                                <Select label="商品类型" options={[{ label: '主修课 (Normal)', value: 'Normal' }, { label: '拓展课 (Extension)', value: 'Extension' }]} value={basicInfo.businessLabel} onChange={(e) => setBasicInfo({ ...basicInfo, businessLabel: e.target.value })} required />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" />
                            <h3 className="font-semibold text-slate-800">2. 结构生成配置</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="单元总数" type="number" value={structureInfo.totalUnitCount} onChange={e => setStructureInfo({...structureInfo, totalUnitCount: parseInt(e.target.value) || 0})} required icon={<Hash size={14} />} />
                                <Input label="每单元讲数" type="number" value={structureInfo.lessonsPerUnit} onChange={e => setStructureInfo({...structureInfo, lessonsPerUnit: parseInt(e.target.value) || 0})} required icon={<ListOrdered size={14} />} />
                            </div>
                            <Input label="各讲序消耗课时" placeholder="例如: 4, 4, 4" value={structureInfo.deductSequence} onChange={e => setStructureInfo({...structureInfo, deductSequence: e.target.value})} required helperText={`请输入 ${structureInfo.lessonsPerUnit} 个数字，用逗号分隔。`} />
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Content Unit ID 列表 <span className="text-red-500">*</span></label>
                                <textarea className="w-full h-32 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono" placeholder="粘贴 Unit IDs..." value={structureInfo.unitIds} onChange={(e) => setStructureInfo({...structureInfo, unitIds: e.target.value})} required />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleOneClickCreation} disabled={loading || !config.authToken} className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-lg transition-all shadow-lg shadow-indigo-900/20 ${loading || !config.authToken ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99]'}`}>
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} fill="currentColor" />}
                            {loading ? '执行中...' : '一键创建并保存'}
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Wrench size={18} className="text-orange-500"/> 调试连接
                        </h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Input label="Template ID (已创建的模板)" value={debugTemplateId} onChange={e => setDebugTemplateId(e.target.value)} placeholder="例如: 9824" />
                            </div>
                            <button onClick={loadTemplateForDebug} disabled={loading} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900 flex items-center gap-2 mb-[1px]">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} 加载/刷新
                            </button>
                        </div>
                    </div>

                    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${!debugUnitCombId ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            第一步：创建单元 (Container)
                        </h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Input label="单元名称" value={debugContainerName} onChange={e => setDebugContainerName(e.target.value)} />
                            </div>
                            <button onClick={debugCreateContainer} disabled={loading} className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 flex items-center gap-2 mb-[1px]">
                                <Save size={16}/> 保存单元
                            </button>
                        </div>
                    </div>

                    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${!debugUnitCombId || debugTree.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            第二步：添加课时 (SaleUnit)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1">选择目标单元</label>
                                <select 
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                                    value={selectedContainerIdx}
                                    onChange={e => setSelectedContainerIdx(parseInt(e.target.value))}
                                >
                                    {debugTree.map((item, idx) => (
                                        <option key={idx} value={idx}>{item.name} (Seq: {item.sequence})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Content Unit ID" value={debugLessonUnitId} onChange={e => setDebugLessonUnitId(e.target.value)} placeholder="142973" />
                                <Input label="课时名称" value={debugLessonName} onChange={e => setDebugLessonName(e.target.value)} />
                            </div>
                            <div className="flex justify-end">
                                <button onClick={debugAddLesson} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus size={16}/> 创建并挂载
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="lg:col-span-1">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full max-h-[calc(100vh-100px)] flex flex-col sticky top-6">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm rounded-t-xl">
                    <h3 className="font-semibold text-slate-800">执行日志</h3>
                    {progress > 0 && progress < 100 && activeTab === 'wizard' && (
                        <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-300" style={{width: `${progress}%`}}></div>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs font-mono">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-10">
                            <FileText size={24} className="opacity-20" />
                            <p>等待操作...</p>
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
