
import React, { useState, useEffect, useRef } from 'react';
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

// --- Helper Functions (Moved outside component for reuse) ---

const organizeJobsIntoChains = (jobs: Job[]): Job[][] => {
    const localIds = new Set(jobs.map(j => j.id));

    // Jobs that have NO dependencies pointing to other jobs in this stage
    const roots = jobs.filter(j => 
        !j.dependencies || j.dependencies.filter(d => localIds.has(d)).length === 0
    );

    const chains: Job[][] = [];
    const visited = new Set<string>();

    // Recursive chain builder
    const buildChain = (currentJob: Job): Job[] => {
        const chain = [currentJob];
        visited.add(currentJob.id);

        // Find immediate child in this stage
        const child = jobs.find(j => j.dependencies?.includes(currentJob.id));
        if (child && !visited.has(child.id)) {
                chain.push(...buildChain(child));
        }
        return chain;
    };

    roots.forEach(root => {
        if (!visited.has(root.id)) {
            chains.push(buildChain(root));
        }
    });

    // Cleanup orphans
    jobs.forEach(j => {
        if (!visited.has(j.id)) {
            chains.push([j]);
        }
    });

    return chains;
};

const calculateStageWidth = (jobs: Job[]): number => {
    const chains = organizeJobsIntoChains(jobs);
    
    // Constants matching UI rendering
    const JOB_CARD_WIDTH = 224; // w-56
    const CONNECTOR_WIDTH = 24; // w-6
    const CONTAINER_PADDING = 48; // p-3 * 2 + extra buffer

    let maxChainWidth = 0;
    
    if (chains.length === 0) {
        return 320; // Default min width
    } 

    chains.forEach(chain => {
        // Width = (JobCards) + (Connectors)
        const width = (chain.length * JOB_CARD_WIDTH) + (Math.max(0, chain.length - 1) * CONNECTOR_WIDTH);
        if (width > maxChainWidth) maxChainWidth = width;
    });

    // Clamp to reasonable defaults
    return Math.max(320, maxChainWidth + CONTAINER_PADDING);
};


const PipelineSettings: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('flow_config');
  const [yamlMode, setYamlMode] = useState(false);
  
  // Initialize from location state (template) or fallback to default
  const [stages, setStages] = useState<Stage[]>(() => {
    if (location.state && location.state.templateStages) {
        return location.state.templateStages.map((s: Stage) => ({ ...s, width: calculateStageWidth(s.jobs || []) }));
    }
    // Deep copy to avoid mutating default immediately on load
    return JSON.parse(JSON.stringify(DEFAULT_PIPELINE_DETAIL.stages)).map((s: Stage) => ({ ...s, width: calculateStageWidth(s.jobs || []) }));
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
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      // Use requestAnimationFrame for smoother resizing
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const delta = e.clientX - resizing.startX;
        setStages(prev => prev.map(s => {
          if (s.id === resizing.stageId) {
            // Minimum width constraint of 280px
            return { ...s, width: Math.max(280, resizing.startWidth + delta) };
          }
          return s;
        }));
      });
    };

    const handleMouseUp = () => {
      if (resizing) {
        setResizing(null);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        cancelAnimationFrame(animationFrameId);
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
      cancelAnimationFrame(animationFrameId);
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

  // --- Auto Fit Stage Width ---
  const handleAutoFitStage = (stageId: string) => {
      const stage = stages.find(s => s.id === stageId);
      if (!stage) return;
      
      const newWidth = calculateStageWidth(stage.jobs);
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, width: newWidth } : s));
  };

  // --- Fit View Logic (Global) ---
  const handleFitView = () => {
    if (!containerRef.current || stages.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const padding = 64; 
    const sourcesArea = 320 + 32; 
    const startConnector = 48; 
    const endPlaceholder = 32 + 48 + 192; 
    const connectorWidth = 64; 
    const totalConnectorsWidth = (stages.length > 0 ? (stages.length - 1) * connectorWidth : 0);

    const usedWidth = padding + sourcesArea + startConnector + endPlaceholder + totalConnectorsWidth;
    const availableWidth = containerWidth - usedWidth;

    const newWidth = Math.max(320, availableWidth / stages.length);

    setStages(prev => prev.map(s => ({ ...s, width: newWidth })));
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, stageId: string, index: number) => {
    setDraggedJob({ stageId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedJob) return;

    const newStages = JSON.parse(JSON.stringify(stages)) as Stage[];
    const sourceStageIdx = newStages.findIndex(s => s.id === draggedJob.stageId);
    const targetStageIdx = newStages.findIndex(s => s.id === targetStageId);

    if (sourceStageIdx === -1 || targetStageIdx === -1) return;

    // Remove from source
    const [movedJob] = newStages[sourceStageIdx].jobs.splice(draggedJob.index, 1);
    
    // If moved to a different stage, clear dependencies to avoid broken links
    if (sourceStageIdx !== targetStageIdx) {
        movedJob.dependencies = [];
    }

    // Add to target stage (append to end as a new parallel root)
    newStages[targetStageIdx].jobs.push(movedJob);

    setStages(newStages);
    setDraggedJob(null);
  };

  // --- CRUD Handlers ---
  const handleAddStage = () => {
    handleAddStageAt(stages.length);
  };

  const handleAddStageAt = (index: number) => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      jobs: [],
      width: 320
    };
    const newStages = [...stages];
    newStages.splice(index, 0, newStage);
    setStages(newStages);
  };

  // Add Serial Task within the SAME stage
  const handleAddSerialTask = (stageId: string, anchorJob: Job, side: 'left' | 'right') => {
      const newJob: Job = {
          id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: 'New Serial Task',
          status: 'pending',
          type: 'custom',
          logs: [],
          dependencies: []
      };

      setStages(prev => prev.map(s => {
          if (s.id !== stageId) return s;

          let newJobs = [...s.jobs];
          const isLocal = (id: string) => s.jobs.some(j => j.id === id);

          if (side === 'right') {
              // Anchor -> New
              newJob.dependencies = [anchorJob.id];
              
              // Find jobs that depended on Anchor, update them to depend on New
              newJobs = newJobs.map(j => {
                  if (j.dependencies?.includes(anchorJob.id)) {
                      return {
                          ...j,
                          dependencies: j.dependencies.map(d => d === anchorJob.id ? newJob.id : d)
                      };
                  }
                  return j;
              });
              newJobs.push(newJob);

          } else {
              // New -> Anchor
              // New takes Anchor's dependencies
              const localDeps = anchorJob.dependencies?.filter(isLocal) || [];
              const remoteDeps = anchorJob.dependencies?.filter(d => !isLocal(d)) || [];
              
              newJob.dependencies = [...localDeps];
              
              // Anchor depends on New
              newJobs = newJobs.map(j => {
                  if (j.id === anchorJob.id) {
                       return { ...j, dependencies: [newJob.id, ...remoteDeps] };
                  }
                  return j;
              });
              newJobs.push(newJob);
          }

          // Automatically adjust width to fit the new serial task
          const newWidth = calculateStageWidth(newJobs);

          return { ...s, jobs: newJobs, width: newWidth };
      }));
  };

  const handleDeleteStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId));
  };

  const handleStageNameChange = (stageId: string, newName: string) => {
    setStages(stages.map(s => s.id === stageId ? { ...s, name: newName } : s));
  };

  const handleAddJob = (stageId: string) => {
    const newJob: Job = {
      id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: 'New Parallel Task',
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
        // Remove job and cleanup dependencies
        const filteredJobs = s.jobs.filter(j => j.id !== jobId).map(j => ({
            ...j,
            dependencies: j.dependencies?.filter(d => d !== jobId)
        }));
        return { ...s, jobs: filteredJobs };
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
            <div className="w-64 bg-white border-r border-gray-200 py-4 flex flex-col gap-1 shrink-0 z-10 overflow-y-auto">
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
                                {!yamlMode && (
                                    <button 
                                        onClick={handleFitView}
                                        className="text-gray-500 hover:text-blue-600 p-1.5 rounded hover:bg-gray-100 transition-colors mr-2"
                                        title="Fit Stages to View"
                                    >
                                        <Icons.Maximize size={18} />
                                    </button>
                                )}
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
                            <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100 p-8">
                                <div className="flex h-full min-w-max pb-8 relative">
                                    {/* Sources Column */}
                                    <div className="w-80 flex flex-col shrink-0 mr-8">
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">Pipeline Sources</div>
                                        <div className="flex-1 bg-gray-50 rounded-xl border border-dashed border-gray-300 p-3 flex flex-col gap-3">
                                            {sources.map((src) => (
                                                <div key={src.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                                                    <button onClick={() => handleRemoveSource(src.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Icons.XCircle size={14} />
                                                    </button>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded flex items-center justify-center">
                                                            {src.type === 'Github' ? <Icons.Github size={14} /> : src.type === 'Gitlab' ? <Icons.Gitlab size={14} /> : <Icons.GitBranch size={14} />}
                                                        </div>
                                                        <span className="font-bold text-gray-700 text-sm">{src.type}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate">{src.repo}</div>
                                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <Icons.GitBranch size={10} /> {src.branch}
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => setShowSourceModal(true)}
                                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                            >
                                                <Icons.Plus size={16} /> Add Source
                                            </button>
                                        </div>
                                    </div>

                                    {/* Start Connector */}
                                    <div className="w-12 flex items-center justify-center relative shrink-0">
                                         <div className="w-full h-0.5 bg-gray-300"></div>
                                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                            <Icons.ChevronRight className="text-gray-400 bg-gray-100 rounded-full p-0.5" size={20} />
                                         </div>
                                    </div>

                                    {/* Stages Render Loop */}
                                    {stages.map((stage, idx) => (
                                        <div key={stage.id} className="flex h-full shrink-0 group/stage">
                                            {/* Connector & Insert Button (Before Stage) */}
                                            {idx > 0 && (
                                                <div className="w-16 flex flex-col items-center justify-center relative shrink-0 group/connector">
                                                     <div className="w-full h-0.5 bg-gray-300 absolute top-24"></div>
                                                     {/* Horizontal connecting line logic for lower items is implied/simplified here */}
                                                     <button 
                                                        onClick={() => handleAddStageAt(idx)}
                                                        className="z-10 w-6 h-6 bg-white border border-gray-300 text-gray-400 rounded-full flex items-center justify-center shadow-sm hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all opacity-0 group-hover/connector:opacity-100 absolute top-24 -translate-y-1/2"
                                                        title="Insert Stage Here"
                                                     >
                                                         <Icons.Plus size={14} />
                                                     </button>
                                                </div>
                                            )}

                                            {/* Stage Column */}
                                            <div 
                                              className="flex flex-col relative transition-all duration-300 ease-out"
                                              style={{ width: stage.width }}
                                            >
                                                <div className="flex items-center justify-between mb-3 px-1 group/header">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-gray-200 text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded">{idx + 1}</div>
                                                        <input 
                                                            value={stage.name}
                                                            onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                                                            className="bg-transparent font-bold text-gray-600 text-sm focus:outline-none focus:text-blue-600 w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                                        <Icons.Trash2 
                                                            size={14} 
                                                            className="cursor-pointer text-gray-400 hover:text-red-500"
                                                            onClick={() => handleDeleteStage(stage.id)}
                                                        />
                                                    </div>
                                                </div>

                                                <div 
                                                    className="flex-1 bg-gray-200/50 rounded-xl border border-gray-200 p-3 flex flex-col gap-4 overflow-y-auto overflow-x-auto"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, stage.id)}
                                                >
                                                    {/* Jobs Rendering with Chains */}
                                                    {organizeJobsIntoChains(stage.jobs).map((chain, chainIdx) => (
                                                        <div key={chainIdx} className="flex flex-row items-center gap-2">
                                                            {chain.map((job, jobIdx) => (
                                                                <React.Fragment key={job.id}>
                                                                    {jobIdx > 0 && (
                                                                        <div className="w-6 h-0.5 bg-gray-400 shrink-0"></div>
                                                                    )}
                                                                    <div 
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, stage.id, stage.jobs.indexOf(job))}
                                                                        className="bg-white p-3 rounded border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-move relative group/job w-56 shrink-0"
                                                                    >
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Icons.Code size={14} className="text-gray-400" />
                                                                                <span className="font-semibold text-gray-800 text-sm truncate max-w-[120px]" title={job.name}>{job.name}</span>
                                                                            </div>
                                                                            <div className="flex gap-1 opacity-0 group-hover/job:opacity-100 transition-opacity">
                                                                                <Icons.Settings 
                                                                                    size={14} 
                                                                                    className="text-gray-400 hover:text-blue-500 cursor-pointer" 
                                                                                    onClick={() => setEditingJob({ stageId: stage.id, job })}
                                                                                />
                                                                                <Icons.Trash2 
                                                                                    size={14} 
                                                                                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                                                                                    onClick={() => handleDeleteJob(stage.id, job.id)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                            {job.dependencies && job.dependencies.length > 0 && <Icons.Link size={10} />}
                                                                            <span>{job.type}</span>
                                                                        </div>

                                                                        {/* Serial Insert Buttons */}
                                                                        {/* Left */}
                                                                        <button 
                                                                            onClick={() => handleAddSerialTask(stage.id, job, 'left')}
                                                                            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-300 text-blue-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/job:opacity-100 hover:scale-110 z-10"
                                                                            title="Insert Task Before"
                                                                        >
                                                                            <Icons.Plus size={10} />
                                                                        </button>
                                                                        {/* Right */}
                                                                        <button 
                                                                            onClick={() => handleAddSerialTask(stage.id, job, 'right')}
                                                                            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-300 text-blue-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/job:opacity-100 hover:scale-110 z-10"
                                                                            title="Insert Task After"
                                                                        >
                                                                            <Icons.Plus size={10} />
                                                                        </button>
                                                                    </div>
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    ))}

                                                    <button 
                                                        onClick={() => handleAddJob(stage.id)}
                                                        className="w-full py-2 border border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-all text-xs font-medium flex items-center justify-center gap-1 shrink-0"
                                                    >
                                                        <Icons.Plus size={12} /> Add Parallel Task
                                                    </button>
                                                </div>

                                                {/* Resize Handle */}
                                                <div 
                                                    className="absolute top-0 right-0 bottom-0 w-4 -mr-2 cursor-col-resize flex justify-center z-20 group/resizer"
                                                    onMouseDown={(e) => startResize(e, stage)}
                                                    onDoubleClick={() => handleAutoFitStage(stage.id)}
                                                    title="Drag to resize, Double-click to auto-fit"
                                                >
                                                    <div className="w-1 h-full bg-transparent group-hover/resizer:bg-blue-400 transition-colors rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Stage Placeholder */}
                                    <div className="flex items-start h-full pl-8 shrink-0">
                                        <div className="mt-24 flex items-center">
                                             <div className="w-12 h-0.5 bg-gray-300"></div>
                                             <button 
                                                onClick={handleAddStage}
                                                className="w-48 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all gap-2"
                                             >
                                                <Icons.Plus size={20} /> New Stage
                                             </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'basic' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Basic Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Name</label>
                                <input 
                                    type="text" 
                                    value={pipelineName}
                                    onChange={(e) => setPipelineName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none h-24"></textarea>
                            </div>
                             <div className="pt-4">
                                <button 
                                    onClick={handleSave}
                                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholders for other tabs */}
                {['triggers', 'variables', 'cache'].includes(activeTab) && (
                    <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-400">Settings for {activeTab} coming soon...</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- Modals --- */}
        
        {/* Add Source Modal */}
        {showSourceModal && (
            <AddSourceModal 
                onClose={() => setShowSourceModal(false)} 
                onAdd={handleAddSource} 
            />
        )}

        {/* Task Edit Modal */}
        {editingJob && (
            <TaskEditModal
                job={editingJob.job}
                stageId={editingJob.stageId}
                allJobs={stages.flatMap(s => s.id === editingJob.stageId ? s.jobs : [])}
                onClose={() => setEditingJob(null)}
                onSave={(updatedJob) => handleSaveJob(updatedJob, editingJob.stageId)}
            />
        )}

        {/* Toast Notification */}
        {showToast && (
            <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 animate-slide-up z-50">
                <Icons.CheckCircle className="text-green-400" size={20} />
                <span>Pipeline settings saved successfully.</span>
            </div>
        )}

      </div>
    </Layout>
  );
};

// --- Sub-components ---

const SettingLink = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <div 
        onClick={onClick}
        className={`px-6 py-3 text-sm font-medium cursor-pointer flex items-center justify-between transition-colors ${active ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
    >
        {label}
        {active && <Icons.ChevronRight size={14} />}
    </div>
);

// Add Source Modal Component
const AddSourceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (s: Source) => void }) => {
    const [selectedType, setSelectedType] = useState('Github');
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('');

    const handleSubmit = () => {
        onAdd({
            id: `src-${Date.now()}`,
            type: selectedType,
            name: repoUrl,
            repo: repoUrl,
            branch: branch || 'master'
        });
    };

    const types = [
        { name: 'Github', icon: <Icons.Github size={24} /> },
        { name: 'Gitlab', icon: <Icons.Gitlab size={24} /> },
        { name: 'Codeup', icon: <Icons.CloudUpload size={24} /> },
        { name: 'General Git', icon: <Icons.GitBranch size={24} /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
                    <h3 className="font-bold text-gray-700 mb-4 px-2">Data Sources</h3>
                    <div className="space-y-1">
                        <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded font-medium text-sm cursor-pointer">Code Sources</div>
                        <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm cursor-pointer">Artifacts</div>
                        <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm cursor-pointer">Jenkins</div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                         <h3 className="font-bold text-gray-800">Add Pipeline Source</h3>
                         <button onClick={onClose}><Icons.XCircle className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select Source Type</label>
                            <div className="grid grid-cols-4 gap-4">
                                {types.map(t => (
                                    <div 
                                        key={t.name}
                                        onClick={() => setSelectedType(t.name)}
                                        className={`border rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedType === t.name ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                                    >
                                        <div className={selectedType === t.name ? 'text-blue-600' : 'text-gray-600'}>{t.icon}</div>
                                        <span className="text-sm font-medium">{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                                <input 
                                    type="text" 
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/user/repo.git"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Branch</label>
                                <input 
                                    type="text" 
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                    placeholder="main"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="trigger" className="rounded text-blue-600" />
                                <label htmlFor="trigger" className="text-sm text-gray-600">Enable Code Change Trigger</label>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                        <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Add Source</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Task Edit Modal Component
const TaskEditModal = ({ job, stageId, allJobs, onClose, onSave }: { job: Job, stageId: string, allJobs: Job[], onClose: () => void, onSave: (j: Job) => void }) => {
    const [name, setName] = useState(job.name);
    const [type, setType] = useState(job.type);
    const [dependencies, setDependencies] = useState<string[]>(job.dependencies || []);
    const [activeTab, setActiveTab] = useState('basic');

    const handleSave = () => {
        onSave({ ...job, name, type, dependencies });
    };

    const toggleDependency = (depId: string) => {
        if (dependencies.includes(depId)) {
            setDependencies(dependencies.filter(d => d !== depId));
        } else {
            setDependencies([...dependencies, depId]);
        }
    };

    // Filter out self from potential dependencies
    const availableDependencies = allJobs.filter(j => j.id !== job.id);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-gray-800">Edit Task: {job.name}</h3>
                     <button onClick={onClose}><Icons.XCircle className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="flex border-b border-gray-200 px-4">
                    {['basic', 'vars', 'policy'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            {t === 'vars' ? 'Variables' : t}
                        </button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'basic' && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                                <select 
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="build">Build</option>
                                    <option value="test">Test</option>
                                    <option value="scan">Scan</option>
                                    <option value="deploy">Deploy</option>
                                    <option value="custom">Custom Script</option>
                                </select>
                            </div>
                            
                            {/* Dependencies Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Dependencies (Same Stage)</label>
                                <div className="border border-gray-200 rounded-md p-3 max-h-40 overflow-y-auto bg-gray-50">
                                    {availableDependencies.length === 0 ? (
                                        <p className="text-xs text-gray-400">No other tasks in this stage.</p>
                                    ) : (
                                        availableDependencies.map(dep => (
                                            <div key={dep.id} className="flex items-center gap-2 mb-2 last:mb-0">
                                                <input 
                                                    type="checkbox" 
                                                    id={`dep-${dep.id}`}
                                                    checked={dependencies.includes(dep.id)}
                                                    onChange={() => toggleDependency(dep.id)}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor={`dep-${dep.id}`} className="text-sm text-gray-700 cursor-pointer select-none">
                                                    {dep.name} <span className="text-xs text-gray-400">({dep.type})</span>
                                                </label>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Select tasks that must complete before this task starts.</p>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'vars' && (
                        <div className="text-center py-8 text-gray-400">
                            <Icons.Box className="mx-auto mb-2 opacity-50" size={32} />
                            No variables configured
                        </div>
                    )}

                    {activeTab === 'policy' && (
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                 <span className="text-sm font-medium text-gray-700">Timeout</span>
                                 <input type="text" placeholder="60m" className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
                             </div>
                             <div className="flex items-center justify-between">
                                 <span className="text-sm font-medium text-gray-700">Retries</span>
                                 <input type="number" placeholder="0" className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
                             </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save Task</button>
                </div>
             </div>
        </div>
    );
};

export default PipelineSettings;
