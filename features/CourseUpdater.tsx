import React, { useState, useRef } from 'react';
import { Input } from '../components/ui/Input';
import { GlobalConfig, CourseUpdateTask } from '../types';
import { JenkinsService } from '../services/jenkinsService';
import { Loader2, UploadCloud, Download, Play, AlertTriangle, FileSpreadsheet, Trash2, ExternalLink, Link } from 'lucide-react';

interface CourseUpdaterProps {
  config: GlobalConfig;
  setConfig: (config: GlobalConfig) => void;
}

export const CourseUpdater: React.FC<CourseUpdaterProps> = ({ config, setConfig }) => {
  const [tasks, setTasks] = useState<CourseUpdateTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [crumb, setCrumb] = useState(config.jenkinsCrumb || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Upload & Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      // @ts-ignore - XLSX is loaded via script tag in index.html
      const wb = window.XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      // @ts-ignore
      const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Parse rows (Skip header row 0)
      const newTasks: CourseUpdateTask[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length < 6) continue;

        // Column C (Index 2): PathID (UnitID)
        const unitId = row[2];
        // Column E (Index 4): Games (Optional)
        const rawGame = row[4]; 
        // Column F (Index 5): Folder Name
        const folderName = row[5];

        if (unitId && folderName) {
            const gameName = rawGame ? rawGame.toString().trim() : 'nogame';

            newTasks.push({
                id: Math.random().toString(36).substr(2, 9),
                unitId: unitId.toString().trim(),
                folderName: folderName.toString().trim(),
                gameName: gameName,
                status: 'pending'
            });
        }
      }
      setTasks(newTasks);
    };
    reader.readAsBinaryString(file);
  };

  const startBuild = async () => {
    if (!crumb) {
      alert("请输入 Jenkins Crumb");
      return;
    }
    
    // Save crumb for future
    setConfig({ ...config, jenkinsCrumb: crumb });

    // Mark pending tasks as building
    const tasksToBuild = tasks.filter(t => t.status === 'pending');
    if (tasksToBuild.length === 0) return;

    setIsProcessing(true);

    // Update UI to show we are working
    setTasks(prev => prev.map(t => t.status === 'pending' ? { ...t, status: 'building' } : t));

    // Trigger builds sequentially
    for (const task of tasksToBuild) {
        try {
            await JenkinsService.triggerBuild(task, crumb);
            
            // Assume success (fire and forget)
            // Generate the predictable download link immediately
            const downloadUrl = JenkinsService.getDownloadUrl(task.folderName);
            
            setTasks(prev => prev.map(t => t.id === task.id ? { 
                ...t, 
                status: 'done', 
                downloadUrl: downloadUrl 
            } : t));

            // Delay 300ms to throttle requests slightly
            await new Promise(r => setTimeout(r, 300));
        } catch (e) {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: 'Request Failed' } : t));
        }
    }
    
    setIsProcessing(false);
  };

  const clearTasks = () => {
      setTasks([]);
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCrumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCrumb(val);
      // Auto-save to config
      setConfig({ ...config, jenkinsCrumb: val });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">课程更新打包</h2>
          <p className="text-slate-500 mt-1 text-sm">上传课程信息表，批量触发 Jenkins 打包。</p>
        </div>
      </div>

      {/* Config Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="flex flex-col md:flex-row md:items-end gap-4">
             <div className="flex-1">
                 <Input 
                    label="Jenkins Crumb (必填)" 
                    value={crumb}
                    onChange={handleCrumbChange}
                    placeholder="粘贴 Crumb..."
                    required
                />
                 <div className="mt-2 flex items-center gap-2">
                    <a 
                      href="http://10.218.229.30:8080/jenkins/crumbIssuer/api/json" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      点击此处打开 Jenkins 获取 Crumb (账号: root / 密码: 123456)
                    </a>
                 </div>
             </div>
             <div className="pb-6 text-xs text-slate-500 md:w-1/3">
                 <p className="flex items-start gap-1">
                     <AlertTriangle size={14} className="mt-0.5 text-amber-500 shrink-0" />
                     <span>
                        因内网安全限制，系统无法自动检测打包进度。
                        <br/>
                        点击打包后，系统将直接生成下载链接。如果点击下载提示 404，说明打包尚未完成，请稍后刷新下载页。
                     </span>
                 </p>
             </div>
         </div>
      </div>

      {/* Upload & Action Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200 font-medium text-sm w-full md:w-auto justify-center">
                          <FileSpreadsheet size={18} />
                          上传课程 Excel 表
                      </button>
                  </div>
                  {tasks.length > 0 && (
                      <span className="text-sm text-slate-500">已解析 {tasks.length} 个任务</span>
                  )}
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {tasks.length > 0 && (
                       <button 
                        onClick={clearTasks}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                       >
                           <Trash2 size={18} />
                           清空
                       </button>
                  )}
                  <button 
                    onClick={startBuild}
                    disabled={tasks.length === 0 || !crumb || isProcessing}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all text-sm w-full md:w-auto justify-center
                        ${tasks.length === 0 || !crumb || isProcessing
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-900/10'}`}
                  >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                      {isProcessing ? '正在发送请求...' : '开始批量打包'}
                  </button>
              </div>
          </div>

          {/* Task List Table */}
          {tasks.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                              <th className="px-4 py-3 w-16">#</th>
                              <th className="px-4 py-3 hidden md:table-cell">Path ID</th>
                              <th className="px-4 py-3">文件夹名</th>
                              <th className="px-4 py-3 hidden md:table-cell">游戏</th>
                              <th className="px-4 py-3">状态</th>
                              <th className="px-4 py-3 text-right">结果</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {tasks.map((task, idx) => (
                              <tr key={task.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                                  <td className="px-4 py-3 font-mono hidden md:table-cell">{task.unitId}</td>
                                  <td className="px-4 py-3 font-mono text-slate-600">{task.folderName}</td>
                                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{task.gameName}</td>
                                  <td className="px-4 py-3">
                                      {task.status === 'pending' && <span className="text-slate-400">待处理</span>}
                                      {task.status === 'building' && <span className="text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 请求中</span>}
                                      {task.status === 'done' && <span className="text-green-600">已发送</span>}
                                      {task.status === 'error' && <span className="text-red-600">请求失败</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      {task.status === 'done' && task.downloadUrl && (
                                          <a 
                                            href={task.downloadUrl}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-xs font-medium transition-colors"
                                          >
                                              <Link size={14} />
                                              验证/下载
                                          </a>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
                  <UploadCloud size={48} className="mx-auto mb-3 opacity-20" />
                  <p>请上传 Excel 文件</p>
              </div>
          )}
      </div>
    </div>
  );
};