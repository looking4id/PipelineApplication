
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';
import { SettingsTab, Stage, Job } from '../types';
import { DEFAULT_PIPELINE_DETAIL } from '../constants';

interface Source {
    id: string;
    type: string;
    name: string;
    repo?: string;
    branch?: string;
}

const PipelineSettings: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('flow_config');
  const [yamlMode, setYamlMode] = useState(false);
  
  // Initialize from location state (template) or fallback to default
  const [stages, setStages] = useState<Stage[]>(() => {
    if (location.state && location.state.templateStages) {
        return location.state.templateStages.map((s: Stage) => ({ ...s, width: s.width || 320 }));
    }
    // Deep copy to avoid mutating default immediately on load
    return JSON.parse(JSON.stringify(DEFAULT_PIPELINE_DETAIL.stages)).map((s: Stage) => ({ ...s, width: s.width || 320 }));
  });

  const [pipelineName, setPipelineName] = useState(() => {
    if (location.state && location.state.pipelineName) {
        return location.state.pipelineName;
    }
    return DEFAULT_PIPELINE_DETAIL.name;
  });

  // Source State
  const [sources, setSources] = useState<Source[]>([
      { id: 'src-1', type: 'Codeup', name: 'flow-example/spring-boot', repo: 'flow-example/spring-boot', branch: 'master' }
  ]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  
  // --- Edit Job State ---
  const [editingJob, setEditingJob] = useState<{ stageId: string, job: Job } | null>(null);

  // --- Save State ---
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // --- Drag and Drop State ---
  const [draggedJob, setDraggedJob] = useState<{ stageId: string, index: number } | null>(null);
  
  // --- Resizing State ---
  const [resizing, setResizing] = useState<{ stageId: string, startX: number, startWidth: number } | null>(null);

  const mockYaml = `name: ${pipelineName}
sources:
${sources.map(s => `  - type: ${s.type}\n    repo: ${s.repo}\n    branch: ${s.branch}`).join('\n')}
stages:
${stages.map(s => `  - name: ${s.name}\n    jobs:\n${s.jobs.map(j => `      - task: ${j.name}${j.dependencies?.length ? `\n        needs: [${j.dependencies.join(', ')}]` : ''}`).join('\n')}`).join('\n')}
`;

  // --- Save Handler ---
  const handleSave = async () => {
      setIsSaving(true);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));

      // Persist changes to the mock data "backend"
      DEFAULT_PIPELINE_DETAIL.name = pipelineName;
      // We perform a deep copy to ensure the reference is updated but data is preserved
      DEFAULT_PIPELINE_DETAIL.stages = JSON.parse(JSON.stringify(stages));

      setIsSaving(false);
      setShowToast(true);

      // Hide toast after 3 seconds
      setTimeout(() => {
          setShowToast(false);
      }, 3000);
  };

  // --- Resize Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const delta = e.clientX - resizing.startX;
      setStages(prev => prev.map(s => {
        if (s.id === resizing.stageId) {
          // Minimum width constraint of 250px
          return { ...s, width: Math.max(250, resizing.startWidth + delta) };
        }
        return s;
      }));
    };

    const handleMouseUp = () => {
      if (resizing) {
        setResizing(null);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while resizing
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const startResize = (e: React.MouseEvent, stage: Stage) => {
    e.preventDefault();
    setResizing({
      stageId: stage.id,
      startX: e.clientX,
      startWidth: stage.width || 320
    });
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, stageId: string, index: number) => {
    setDraggedJob({ stageId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string, targetIndex?: number) => {
    e.preventDefault();
    if (!draggedJob) return;

    const newStages = JSON.parse(JSON.stringify(stages)) as Stage[];
    const sourceStageIdx = newStages.findIndex(s => s.id === draggedJob.stageId);
    const targetStageIdx = newStages.findIndex(s => s.id === targetStageId);

    if (sourceStageIdx === -1 || targetStageIdx === -1) return;

    // Remove from source
    const [movedJob] = newStages[sourceStageIdx].jobs.splice(draggedJob.index, 1);

    // Insert into target
    const destIndex = targetIndex !== undefined ? targetIndex : newStages[targetStageIdx].jobs.length;
    
    // Adjust index logic if needed for same-stage moves (simplified here)
    newStages[targetStageIdx].jobs.splice(destIndex, 0, movedJob);

    setStages(newStages);
    setDraggedJob(null);
  };

  // --- CRUD Handlers ---
  const handleAddStage = () => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      jobs: [],
      width: 320
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

  const handleSaveJob = (updatedJob: Job, stageId: string) => {
      setStages(stages.map(s => {
          if (s.id === stageId) {
              return {
                  ...s,
                  jobs: s.jobs.map(j => j.id === updatedJob.id ? updatedJob : j)
              };
          }
          return s;
      }));
      setEditingJob(null);
  };
  
  const handleAddSource = (newSource: Source) => {
      setSources([...sources, newSource]);
      setShowSourceModal(false);
  };

  const handleRemoveSource = (sourceId: string) => {
      setSources(sources.filter(s => s.id !== sourceId));
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 relative">
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
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 font-medium shadow-sm transition-colors ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? <Icons.RotateCw className="animate-spin" size={14} /> : <Icons.Save size={14} />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
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
                                    {/* Sources Column */}
                                    <div className="w-64 shrink-0 flex flex-col gap-3">
                                        <div className="font-bold text-gray-500 text-sm px-1 flex items-center gap-2">
                                            <Icons.GitBranch size={14} /> SOURCES
                                        </div>
                                        
                                        {sources.map(source => (
                                            <div key={source.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm border-l-4 border-l-blue-400 group relative">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {source.type === 'Github' ? <Icons.Github size={16} /> : 
                                                     source.type === 'Gitlab' ? <Icons.Gitlab size={16} /> :
                                                     <Icons.Box size={16} className="text-blue-600" />}
                                                    <span className="font-bold text-gray-800 text-sm">{source.type}</span>
                                                </div>
                                                <div className="font-medium text-xs text-gray-700 truncate" title={source.name}>{source.name}</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Icons.GitBranch size={10} /> {source.branch || 'master'}
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveSource(source.id)}
                                                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Icons.XCircle size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        <button 
                                            onClick={() => setShowSourceModal(true)}
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium"
                                        >
                                            <Icons.Plus size={16} /> Add Pipeline Source
                                        </button>
                                        
                                        <div className="text-center py-2 text-gray-400 text-xs">
                                            <Icons.ChevronRight className="rotate-90 mx-auto" size={16} />
                                        </div>
                                    </div>

                                    {/* Stages */}
                                    {stages.map((stage, idx) => (
                                        <div 
                                            key={stage.id} 
                                            style={{ width: stage.width || 320 }}
                                            className="shrink-0 flex flex-col max-h-full relative group/stage"
                                        >
                                            {/* Stage Header */}
                                            <div className="flex items-center justify-between mb-3 px-1">
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
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover/stage:opacity-100 transition-opacity"
                                                >
                                                    <Icons.Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Jobs Container (Drop Zone) */}
                                            <div 
                                                className={`bg-gray-100/80 rounded-xl p-3 flex flex-col gap-3 min-h-[150px] border border-gray-200/60 overflow-y-auto transition-colors ${draggedJob && draggedJob.stageId !== stage.id ? 'bg-blue-50/50 border-blue-200 border-dashed' : ''}`}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, stage.id)}
                                            >
                                                {stage.jobs.map((job, jobIdx) => (
                                                    <div 
                                                        key={job.id} 
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, stage.id, jobIdx)}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => {
                                                            e.stopPropagation(); // Stop propagation to stage container
                                                            handleDrop(e, stage.id, jobIdx);
                                                        }}
                                                        onClick={() => setEditingJob({ stageId: stage.id, job })}
                                                        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative cursor-move hover:border-blue-400"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1 text-gray-400 cursor-grab active:cursor-grabbing">
                                                                <Icons.GripVertical size={16} />
                                                            </div>
                                                            <div className="mt-1 text-gray-500">
                                                                <JobTypeIcon type={job.type} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-gray-900 truncate pr-6">{job.name}</div>
                                                                <p className="text-xs text-gray-400 mt-0.5">{job.type}</p>
                                                                {/* Dependency Indicator */}
                                                                {job.dependencies && job.dependencies.length > 0 && (
                                                                    <div className="flex items-center gap-1 mt-1.5 text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded w-fit border border-orange-100">
                                                                        <Icons.Link size={10} />
                                                                        <span>Depends on {job.dependencies.length} task{job.dependencies.length > 1 ? 's' : ''}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteJob(stage.id, job.id); }}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                                                            >
                                                                <Icons.XCircle size={14} />
                                                            </button>
                                                            {/* Edit Indicator */}
                                                            <div className="absolute right-8 top-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Icons.Settings size={14} />
                                                            </div>
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

                                            {/* Resize Handle */}
                                            <div 
                                                className="absolute right-[-12px] top-0 bottom-0 w-4 cursor-col-resize flex items-center justify-center opacity-0 hover:opacity-100 z-20 group/handle"
                                                onMouseDown={(e) => startResize(e, stage)}
                                            >
                                                <div className="w-1 h-full bg-blue-400/50 group-hover/handle:bg-blue-500 rounded-full transition-colors"></div>
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
                
                {/* Truncated other tabs... */}
                {activeTab === 'basic' && (
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
                        <h3 className="text-lg font-bold mb-6 text-gray-800">General Settings</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline Name</label>
                                <input 
                                  type="text" 
                                  value={pipelineName}
                                  onChange={(e) => setPipelineName(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" 
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline ID</label>
                                <div className="flex gap-2">
                                    <input type="text" disabled defaultValue={id || "p-001"} className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-500" />
                                    <button className="text-gray-500 hover:bg-gray-100 p-2 rounded border border-gray-200"><Icons.FileText size={16} /></button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Unique identifier for API usage.</p>
                            </div>
                        </div>
                     </div>
                )}
            </div>
        </div>

        {/* Success Toast */}
        {showToast && (
            <div className="fixed top-20 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-bounce-in">
                <Icons.CheckCircle className="text-green-400" size={20} />
                <div>
                    <div className="font-medium text-sm">Configuration Saved</div>
                    <div className="text-xs text-gray-400">Your pipeline flow has been updated.</div>
                </div>
            </div>
        )}

        {/* Add Source Modal */}
        {showSourceModal && (
            <AddSourceModal 
                onClose={() => setShowSourceModal(false)} 
                onAdd={handleAddSource} 
            />
        )}
        
        {/* Edit Task Modal */}
        {editingJob && (
            <TaskEditModal 
                job={editingJob.job}
                siblingJobs={stages.find(s => s.id === editingJob.stageId)?.jobs.filter(j => j.id !== editingJob.job.id) || []}
                onClose={() => setEditingJob(null)}
                onSave={(updatedJob) => handleSaveJob(updatedJob, editingJob.stageId)}
            />
        )}
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

// Job Type Icon Helper
const JobTypeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'build': return <Icons.Hammer className="text-orange-500" size={16} />;
        case 'test': return <Icons.FlaskConical className="text-purple-500" size={16} />;
        case 'scan': return <Icons.Search className="text-blue-500" size={16} />;
        case 'deploy': return <Icons.CloudUpload className="text-green-600" size={16} />;
        default: return <Icons.Code className="text-gray-500" size={16} />;
    }
};

// --- Task Edit Modal ---
const TaskEditModal = ({ job, siblingJobs, onClose, onSave }: { job: Job, siblingJobs: Job[], onClose: () => void, onSave: (j: Job) => void }) => {
    const [name, setName] = useState(job.name);
    const [tab, setTab] = useState<'basic' | 'vars' | 'policy'>('basic');
    const [dependencies, setDependencies] = useState<string[]>(job.dependencies || []);

    // Simulate different configs based on type
    const [buildCommand, setBuildCommand] = useState('mvn clean install -DskipTests');
    const [image, setImage] = useState('maven:3.8-openjdk-11');
    const [envName, setEnvName] = useState('Production');

    const handleSave = () => {
        onSave({ ...job, name, dependencies });
    };

    const toggleDependency = (id: string) => {
        setDependencies(prev => 
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[650px] flex flex-col overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border border-gray-200 rounded shadow-sm">
                            <JobTypeIcon type={job.type} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Edit Task: {job.type.toUpperCase()}</h3>
                            <p className="text-xs text-gray-500">Configure task parameters and runtime environment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icons.XCircle size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button onClick={() => setTab('basic')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Basic Config</button>
                    <button onClick={() => setTab('vars')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'vars' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Variables</button>
                    <button onClick={() => setTab('policy')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'policy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Retry & Policy</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {tab === 'basic' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Task Name</label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            
                            {/* Dependencies Section */}
                            {siblingJobs.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <Icons.Link size={14} className="text-gray-500" /> 
                                        Task Dependencies
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">Select tasks in the current stage that must complete before this task starts.</p>
                                    <div className="flex flex-col gap-2">
                                        {siblingJobs.map(sibling => (
                                            <label key={sibling.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded -ml-1.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={dependencies.includes(sibling.id)}
                                                    onChange={() => toggleDependency(sibling.id)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300" 
                                                />
                                                <span className="text-sm text-gray-700">{sibling.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Fields based on Job Type */}
                            {job.type === 'build' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Build Environment Image</label>
                                        <select 
                                            value={image} 
                                            onChange={(e) => setImage(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="maven:3.8-openjdk-11">Maven 3.8 (JDK 11)</option>
                                            <option value="node:16-alpine">Node.js 16 Alpine</option>
                                            <option value="golang:1.18">Go 1.18</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Build Command</label>
                                        <div className="border border-gray-300 rounded-md overflow-hidden">
                                            <div className="bg-gray-50 border-b border-gray-300 px-3 py-1 text-xs text-gray-500 font-mono">Shell Script</div>
                                            <textarea 
                                                value={buildCommand}
                                                onChange={(e) => setBuildCommand(e.target.value)}
                                                className="w-full p-3 text-sm font-mono h-32 focus:outline-none"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Enter the shell commands to execute for the build.</p>
                                    </div>
                                </>
                            )}

                            {job.type === 'test' && (
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Test Framework</label>
                                        <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                                            <option>JUnit</option>
                                            <option>Jest</option>
                                            <option>PyTest</option>
                                        </select>
                                    </div>
                                    <ToggleRow label="Upload Test Report" />
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                                        Tests will run in parallel with up to 4 agents.
                                    </div>
                                </div>
                            )}

                            {job.type === 'deploy' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Target Environment</label>
                                        <select 
                                            value={envName}
                                            onChange={(e) => setEnvName(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                                        >
                                            <option>Production</option>
                                            <option>Staging</option>
                                            <option>Dev</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" defaultChecked className="text-blue-600 rounded" />
                                        <span className="text-sm text-gray-700">Require Manual Approval</span>
                                    </div>
                                </div>
                            )}

                             {job.type === 'scan' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Scan Ruleset</label>
                                        <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                                            <option>Alibaba Java Style Guide</option>
                                            <option>SonarQube Standard</option>
                                        </select>
                                    </div>
                                    <ToggleRow label="Block on Critical Issues" />
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'vars' && (
                         <div className="text-center py-10 text-gray-500">
                             <Icons.Box size={40} className="mx-auto mb-3 opacity-30" />
                             <p className="text-sm">No environment variables defined for this task.</p>
                             <button className="mt-4 text-blue-600 text-sm hover:underline">+ Add Variable</button>
                         </div>
                    )}

                    {tab === 'policy' && (
                        <div className="space-y-4">
                             <div className="border p-4 rounded-lg border-gray-200">
                                <ToggleRow label="Enable Retry on Failure" />
                                <div className="mt-3 pl-2 border-l-2 border-gray-100 ml-2">
                                    <label className="text-xs text-gray-500 block mb-1">Max Retries</label>
                                    <input type="number" defaultValue={3} className="border w-20 px-2 py-1 text-sm rounded" />
                                </div>
                             </div>
                             <div className="border p-4 rounded-lg border-gray-200">
                                <label className="text-sm font-medium text-gray-700 mb-1 block">Timeout (minutes)</label>
                                <input type="number" defaultValue={60} className="border w-full px-3 py-2 text-sm rounded" />
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                     <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100">Cancel</button>
                     <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm">Save Configuration</button>
                </div>
            </div>
        </div>
    );
};

const AddSourceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (s: Source) => void }) => {
    const [selectedCategory, setSelectedCategory] = useState('code');
    const [selectedType, setSelectedType] = useState('Codeup');
    
    // Form State
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('');
    const [authType, setAuthType] = useState('service_conn');

    const handleAdd = () => {
        onAdd({
            id: `src-${Date.now()}`,
            type: selectedType,
            name: repoUrl || 'New Repository',
            repo: repoUrl,
            branch: branch || 'master'
        });
    };

    const categories = [
        { id: 'code', label: '代码源' },
        { id: 'artifact', label: '制品源' },
        { id: 'jenkins', label: 'Jenkins' },
        { id: 'flow', label: 'Flow流水线' }
    ];

    const sourceTypes = [
        { id: 'Gitlab', label: '自建Gitlab', icon: <Icons.Gitlab className="text-orange-600" size={24} /> },
        { id: 'Example', label: '示例代码源', icon: <Icons.Code className="text-blue-500" size={24} /> },
        { id: 'Gitee', label: '码云', icon: <Icons.Globe className="text-red-600" size={24} /> },
        { id: 'Codeup', label: 'Codeup', icon: <Icons.Box className="text-blue-600" size={24} /> },
        { id: 'GenericGit', label: '通用Git', icon: <Icons.GitBranch className="text-gray-600" size={24} /> },
        { id: 'AtomGit', label: 'AtomGit', icon: <Icons.Server className="text-blue-400" size={24} /> },
        { id: 'Github', label: 'Github', icon: <Icons.Github className="text-gray-800" size={24} /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[700px] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800">添加流水线源</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icons.XCircle size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar */}
                    <div className="w-48 border-r border-gray-200 bg-gray-50 py-4 flex flex-col">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 py-3 text-left text-sm font-medium border-l-4 transition-colors ${selectedCategory === cat.id ? 'bg-white border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-6">
                            <h4 className="text-sm text-gray-500 mb-3">选择代码源</h4>
                            <div className="grid grid-cols-4 gap-4">
                                {sourceTypes.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all h-28 gap-2 ${selectedType === type.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {type.icon}
                                        <span className={`text-sm font-medium ${selectedType === type.id ? 'text-blue-700' : 'text-gray-700'}`}>{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Configuration Form */}
                        <div className="border-t border-gray-100 pt-6 space-y-5">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">代码仓库 <Icons.HelpCircle size={14} className="inline text-gray-400" /></label>
                                <input 
                                    type="text" 
                                    placeholder="请输入代码仓库"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">默认分支 <Icons.HelpCircle size={14} className="inline text-gray-400" /></label>
                                <input 
                                    type="text" 
                                    placeholder="请输入分支"
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>

                             <div className="flex items-center gap-2">
                                <input type="checkbox" id="filter" className="rounded text-blue-600" />
                                <label htmlFor="filter" className="text-sm text-gray-700 flex items-center gap-1">过滤规则 <Icons.HelpCircle size={14} className="text-gray-400" /></label>
                             </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">选择凭证类型</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="auth" 
                                            checked={authType === 'service_conn'} 
                                            onChange={() => setAuthType('service_conn')}
                                            className="text-blue-600"
                                        />
                                        服务连接
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="auth" 
                                            checked={authType === 'org_key'} 
                                            onChange={() => setAuthType('org_key')}
                                            className="text-blue-600"
                                        />
                                        组织公钥
                                    </label>
                                </div>
                             </div>

                             {authType === 'service_conn' && (
                                 <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-sm font-medium text-gray-700">服务连接</label>
                                        <span className="text-sm text-blue-600 cursor-pointer flex items-center gap-1"><Icons.Plus size={14} /> 添加服务连接</span>
                                    </div>
                                    <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option>请选择</option>
                                        <option>My-Aliyun-Connection</option>
                                    </select>
                                 </div>
                             )}

                             <div className="space-y-3 pt-2">
                                 <ToggleRow label="同时克隆子模块" />
                                 <ToggleRow label="自定义克隆深度" />
                                 <ToggleRow label="开启代码源触发" />
                                 <ToggleRow label="开启分支模式" />
                             </div>
                             
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">工作目录 <Icons.HelpCircle size={14} className="inline text-gray-400" /></label>
                                <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50" disabled />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                     <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100">取消</button>
                     <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">添加</button>
                </div>
            </div>
        </div>
    );
};

const ToggleRow = ({ label }: { label: string }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
            {label}
            <Icons.HelpCircle size={14} className="text-gray-400" />
        </div>
        <div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer hover:bg-gray-400 transition-colors">
            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
        </div>
    </div>
);

export default PipelineSettings;