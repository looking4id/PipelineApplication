import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';
import { SettingsTab, Stage, Job } from '../types';
import { DEFAULT_PIPELINE_DETAIL } from '../constants';

const PipelineSettings: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('flow_config');
  const [yamlMode, setYamlMode] = useState(false);
  const [stages, setStages] = useState<Stage[]>(DEFAULT_PIPELINE_DETAIL.stages);

  const mockYaml = `name: My-Java-Pipeline-01
stages:
  - name: Test
    jobs:
      - task: JavaCodeScan
        version: 1.2.0
      - task: MavenUnitTest
        version: 2.1.0
  - name: Build
    jobs:
      - task: JavaBuild
        jdk: 11
  - name: Deploy
    jobs:
      - task: K8sDeploy
        namespace: production
`;

  // Visual Editor Handlers
  const handleAddStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      jobs: []
    };
    setStages([...stages, newStage]);
  };

  const handleDeleteStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId));
  };

  const handleStageNameChange = (stageId: string, newName: string) => {
    setStages(stages.map(s => s.id === stageId ? { ...s, name: newName } : s));
  };

  const handleAddJob = (stageId: string) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      name: 'New Task',
      status: 'pending',
      type: 'custom',
      logs: []
    };
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return { ...s, jobs: [...s.jobs, newJob] };
      }
      return s;
    }));
  };

  const handleDeleteJob = (stageId: string, jobId: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        return { ...s, jobs: s.jobs.filter(j => j.id !== jobId) };
      }
      return s;
    }));
  };

  const handleJobNameChange = (stageId: string, jobId: string, newName: string) => {
      setStages(stages.map(s => {
          if (s.id === stageId) {
              return {
                  ...s,
                  jobs: s.jobs.map(j => j.id === jobId ? { ...j, name: newName } : j)
              };
          }
          return s;
      }));
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
             <button onClick={() => navigate(`/pipeline/${id}`)} className="text-gray-500 hover:text-gray-900">
                <Icons.ChevronRight className="rotate-180" size={20} />
             </button>
             <h1 className="text-lg font-bold text-gray-800">Pipeline Configuration</h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 py-4 flex flex-col gap-1 shrink-0 z-10">
                <SettingLink active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} label="Basic Information" />
                <SettingLink active={activeTab === 'flow_config'} onClick={() => setActiveTab('flow_config')} label="Flow Configuration" />
                <SettingLink active={activeTab === 'triggers'} onClick={() => setActiveTab('triggers')} label="Triggers & Schedules" />
                <SettingLink active={activeTab === 'variables'} onClick={() => setActiveTab('variables')} label="Variables & Secrets" />
                <SettingLink active={activeTab === 'cache'} onClick={() => setActiveTab('cache')} label="Cache Settings" />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-8 bg-gray-50">
                {activeTab === 'flow_config' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                        <div className="border-b border-gray-200 px-4 py-2 flex justify-between items-center bg-gray-50 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Editor Mode:</span>
                                <div className="bg-gray-200 rounded p-1 flex">
                                    <button 
                                        onClick={() => setYamlMode(false)}
                                        className={`px-3 py-1 text-xs rounded transition-colors font-medium ${!yamlMode ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Visual
                                    </button>
                                    <button 
                                        onClick={() => setYamlMode(true)}
                                        className={`px-3 py-1 text-xs rounded transition-colors font-medium ${yamlMode ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        YAML
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                                    <Icons.RotateCw size={14} /> Reset
                                </button>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 font-medium shadow-sm transition-colors">
                                    <Icons.Save size={14} /> Save Changes
                                </button>
                            </div>
                        </div>

                        {yamlMode ? (
                            <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-sm text-gray-300 overflow-auto">
                                <textarea 
                                    className="w-full h-full bg-transparent resize-none focus:outline-none text-green-400 font-mono leading-relaxed"
                                    defaultValue={mockYaml}
                                    spellCheck={false}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100/50 p-6">
                                <div className="flex items-start h-full gap-6">
                                    {/* Start Node */}
                                    <div className="w-64 shrink-0 flex flex-col gap-2 opacity-75">
                                        <div className="font-bold text-gray-500 text-sm px-1 flex items-center gap-2">
                                            <Icons.GitBranch size={14} /> SOURCE
                                        </div>
                                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm border-l-4 border-l-gray-400">
                                            <div className="font-bold text-gray-800">Git Repository</div>
                                            <div className="text-xs text-gray-500 mt-1">master branch</div>
                                        </div>
                                        <div className="text-center py-2 text-gray-400 text-xs">
                                            <Icons.ChevronRight className="rotate-90 mx-auto" size={16} />
                                        </div>
                                    </div>

                                    {/* Stages */}
                                    {stages.map((stage, idx) => (
                                        <div key={stage.id} className="w-80 shrink-0 flex flex-col max-h-full">
                                            {/* Stage Header */}
                                            <div className="flex items-center justify-between mb-3 px-1 group">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <input 
                                                        value={stage.name}
                                                        onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                                                        className="bg-transparent font-bold text-gray-700 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1 w-full outline-none"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteStage(stage.id)}
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Icons.Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Jobs Container */}
                                            <div className="bg-gray-100/80 rounded-xl p-3 flex flex-col gap-3 min-h-[150px] border border-gray-200/60 overflow-y-auto">
                                                {stage.jobs.map((job) => (
                                                    <div key={job.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1 text-gray-500">
                                                                <Icons.Box size={16} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <input 
                                                                    value={job.name}
                                                                    onChange={(e) => handleJobNameChange(stage.id, job.id, e.target.value)}
                                                                    className="w-full text-sm font-medium text-gray-900 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 outline-none truncate"
                                                                />
                                                                <p className="text-xs text-gray-400 mt-0.5">{job.type}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeleteJob(stage.id, job.id)}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                                            >
                                                                <Icons.XCircle size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <button 
                                                    onClick={() => handleAddJob(stage.id)}
                                                    className="flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all mt-auto"
                                                >
                                                    <Icons.Plus size={14} /> Add Task
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Stage Column */}
                                    <div className="w-80 shrink-0 h-full pt-9">
                                        <button 
                                            onClick={handleAddStage}
                                            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all gap-2"
                                        >
                                            <div className="p-2 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors">
                                                <Icons.Plus size={24} />
                                            </div>
                                            <span className="font-medium text-sm">Add New Stage</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'basic' && (
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
                        <h3 className="text-lg font-bold mb-6 text-gray-800">General Settings</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline Name</label>
                                <input type="text" defaultValue="My-Java-Pipeline-01" className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline ID</label>
                                <div className="flex gap-2">
                                    <input type="text" disabled defaultValue="p-001" className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-500" />
                                    <button className="text-gray-500 hover:bg-gray-100 p-2 rounded border border-gray-200"><Icons.FileText size={16} /></button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Unique identifier for API usage.</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <button className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
                            </div>
                        </div>
                     </div>
                )}

                {activeTab === 'triggers' && (
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Webhook Triggers</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 font-medium">Enable Webhooks</span>
                                <div className="w-11 h-6 bg-blue-600 rounded-full relative cursor-pointer transition-colors">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-8">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Git Source Webhook URL</label>
                            <div className="flex gap-2">
                                <input readOnly value="http://flow-openapi.aliyun.com/scm/webhook/WiuZBDDcl8gc72" className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 font-mono focus:outline-none" />
                                <button className="bg-white border border-gray-300 hover:bg-gray-50 px-3 rounded text-gray-600 transition-colors"><Icons.FileText size={16} /></button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Configure this URL in your Git provider's webhook settings.</p>
                        </div>
                        
                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-t border-gray-100 pt-6">Concurrency Control</h3>
                         <div className="bg-white border border-gray-200 rounded-lg p-5">
                             <div className="flex flex-col gap-4">
                                 <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Runs</label>
                                     <input type="number" defaultValue="1" className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                     <p className="text-xs text-gray-500 mt-1">Limit the number of simultaneous executions to save resources.</p>
                                 </div>
                                 <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 -ml-2 rounded">
                                     <input type="checkbox" className="rounded text-blue-600 w-4 h-4" checked />
                                     <span>Auto-cancel redundant pending builds (e.g., when a new commit is pushed)</span>
                                 </label>
                             </div>
                         </div>
                     </div>
                )}

                 {activeTab === 'variables' && (
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                         <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Environment Variables</h3>
                                <p className="text-sm text-gray-500">Manage secrets and variables available during build time.</p>
                            </div>
                            <button className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                                <Icons.Plus size={16} /> Add Variable
                            </button>
                         </div>
                         <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-4 border-b border-gray-200">Key</th>
                                        <th className="p-4 border-b border-gray-200">Value</th>
                                        <th className="p-4 border-b border-gray-200 w-24 text-center">Secret</th>
                                        <th className="p-4 border-b border-gray-200 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="hover:bg-gray-50/50">
                                        <td className="p-4 font-mono text-gray-700">JDK_VERSION</td>
                                        <td className="p-4 text-gray-900">11</td>
                                        <td className="p-4 text-center"><input type="checkbox" disabled className="text-gray-300" /></td>
                                        <td className="p-4 text-right"><Icons.Trash2 size={16} className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors" /></td>
                                    </tr>
                                    <tr className="hover:bg-gray-50/50">
                                        <td className="p-4 font-mono text-gray-700">DOCKER_REGISTRY_PWD</td>
                                        <td className="p-4 text-gray-400 font-mono">●●●●●●●●</td>
                                        <td className="p-4 text-center"><input type="checkbox" checked readOnly className="text-blue-600" /></td>
                                        <td className="p-4 text-right"><Icons.Trash2 size={16} className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors" /></td>
                                    </tr>
                                </tbody>
                            </table>
                         </div>
                     </div>
                 )}
            </div>
        </div>
      </div>
    </Layout>
  );
};

const SettingLink = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <div 
        onClick={onClick}
        className={`px-6 py-3 text-sm cursor-pointer border-l-4 transition-all ${active ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
    >
        {label}
    </div>
);

export default PipelineSettings;