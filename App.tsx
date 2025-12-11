import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClassCreator } from './features/ClassCreator';
import { FastJoin } from './features/FastJoin';
import { LevelCreator } from './features/LevelCreator';
import { CourseUpdater } from './features/CourseUpdater';
import { TemplateValidator } from './features/TemplateValidator';
import { CourseCreator } from './features/CourseCreator';
import { TemplateCreator } from './features/TemplateCreator';
import { SettingsPanel } from './features/SettingsPanel';
import { GlobalConfig } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState('create-class');
  
  // Load config from localStorage or use defaults
  const [config, setConfig] = useState<GlobalConfig>(() => {
    const saved = localStorage.getItem('crmToolboxConfig');
    
    // User provided defaults
    // Note: Removed "Bearer " prefix to match screenshot API requirements for TMS
    const defaultToken = "";
    const defaultOperatorId = 30008819;

    if (saved) {
      return JSON.parse(saved);
    } else {
      // Pre-fill with user provided credentials if no local config exists
      return { 
        authToken: defaultToken, 
        operatorId: defaultOperatorId 
      };
    }
  });

  // Save config changes
  const handleConfigChange = (newConfig: GlobalConfig) => {
    setConfig(newConfig);
    localStorage.setItem('crmToolboxConfig', JSON.stringify(newConfig));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'create-class' && (
            <ClassCreator config={config} />
          )}

          {currentTab === 'create-level' && (
            <LevelCreator config={config} />
          )}

          {currentTab === 'course-creator' && (
            <CourseCreator config={config} />
          )}

          {currentTab === 'template-creator' && (
            <TemplateCreator config={config} />
          )}

          {currentTab === 'template-validator' && (
            <TemplateValidator config={config} />
          )}

          {currentTab === 'course-updater' && (
            <CourseUpdater config={config} setConfig={handleConfigChange} />
          )}

          {currentTab === 'fast-join' && (
            <FastJoin config={config} />
          )}
          
          {currentTab === 'settings' && (
            <SettingsPanel config={config} setConfig={handleConfigChange} />
          )}
        </div>
      </main>
    </div>
  );
}