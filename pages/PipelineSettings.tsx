
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

// --- Helper Functions ---

const organizeJobsIntoChains = (jobs: Job[]): Job[][] => {
    const localIds = new Set(jobs.map(j => j.id));

    // Jobs that have NO dependencies pointing to other jobs in this stage
    const roots = jobs.filter(j => 
        !j.dependencies || j.dependencies.filter(d => localIds.has(d)).length === 0
    );

    const chains: Job[][] = [];
    const visited = new Set<string>();

    const buildChain = (currentJob: Job): Job[] => {
        const chain = [currentJob];
        visited.add(currentJob.id);

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
    const START_NODE_WIDTH = 48; // w-12 (Lightning icon area)
    const JOB_CARD_WIDTH = 180; // Reduced width for pill shape
    const CONNECTOR_WIDTH = 40; // w-10 between jobs
    const BRACKET_WIDTH = 20; // w-5 (1.25rem = 20px)

    let maxChainWidth = 0;
    
    if (chains.length === 0) {
        return 280;
    } 

    chains.forEach(chain => {
        const numCards = chain.length;
        const numConnectors = Math.max(0, numCards - 1); // Connectors between jobs
        // 1 connector between StartNode and FirstJob
        
        const width = (START_NODE_WIDTH) + 
                      (CONNECTOR_WIDTH) + // Connector after start node
                      (numCards * JOB_CARD_WIDTH) + 
                      (numConnectors * CONNECTOR_WIDTH) +
                      (BRACKET_WIDTH * 2); // Left and Right brackets

        if (width > maxChainWidth) maxChainWidth = width;
    });

    return Math.max(280, maxChainWidth + 10);
};

// --- Styled Components ---

const AddTaskButton = ({ onClick, className, visible }: { onClick: () => void, className?: string, visible?: boolean }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-5 h-5 bg-white border border-blue-500 text-blue-500 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 hover:bg-blue-600 hover:text-white hover:scale-110 hover:shadow-md z-30 ${className} ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
        title="Add Task"
    >
        <Icons.Plus size={12} strokeWidth={3} />
    </button>
);

const JobConnector = ({ 
    active, 
    onClick,
    highlight 
}: { 
    active: boolean, 
    onClick: () => void, 
    highlight: boolean 
}) => {
    return (
        <div className="w-10 h-8 flex items-center justify-center shrink-0 relative group/connector">
            {/* The Line */}
            <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] transition-colors ${highlight ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            
            {/* The Button */}
            <AddTaskButton 
                onClick={onClick} 
                visible={active} // Show if active (hovered) or if connector group is hovered
                className="group-hover/connector:opacity-100 group-hover/connector:scale-100 group-hover/connector:pointer-events-auto"
            />
        </div>
    );
};

// --- Bracket Component for Parallel Lines ---
const ChainBracket = ({ 
    type, 
    index, 
    total, 
    highlight,
    onAdd,
    showAdd
}: { 
    type: 'left' | 'right', 
    index: number, 
    total: number, 
    highlight?: boolean,
    onAdd: () => void,
    showAdd: boolean
}) => {
    const lineColor = highlight ? "border-blue-500" : "border-gray-300";
    const lineBg = highlight ? "bg-blue-500" : "bg-gray-300";
    const zIndex = highlight ? "z-20" : "z-0";

    // Single Chain Case - Straight Line
    if (total <= 1) {
        return (
            <div className={`flex-1 min-w-[1.25rem] flex items-center justify-center shrink-0 ${zIndex} relative group/bracket`}>
                <div className={`w-full h-[1px] ${lineBg} transition-colors duration-200`}></div>
                <AddTaskButton 
                    onClick={onAdd}
                    visible={showAdd} // Show on hover of job OR bracket
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover/bracket:opacity-100 group-hover/bracket:scale-100 group-hover/bracket:pointer-events-auto"
                />
            </div>
        );
    }

    const isFirst = index === 0;
    const isLast = index === total - 1;

    // Parallel Case:
    // Left side: Fixed width (20px) to ensure tasks are left-aligned relative to the split point.
    // Right side: Flex width to fill the remaining space to the merge point.
    // min-w-[1.25rem] matches 20px (w-5).
    const widthClass = type === 'left' ? "w-5 shrink-0" : "flex-1 min-w-[1.25rem]";

    return (
        <div className={`${widthClass} relative shrink-0 ${zIndex} group/bracket`}>
            <div className="absolute inset-0 w-full h-full">
                {type === 'left' ? (
                    <>
                        {/* Vertical Spines & Corners */}
                        {isFirst ? (
                            // Top Left Corner
                            <div className={`absolute top-1/2 left-0 w-full h-1/2 border-l-[1px] border-t-[1px] ${lineColor} rounded-tl-xl transition-colors duration-200`}></div>
                        ) : isLast ? (
                            // Bottom Left Corner
                            <div className={`absolute top-0 left-0 w-full h-1/2 border-l-[1px] border-b-[1px] ${lineColor} rounded-bl-xl transition-colors duration-200`}></div>
                        ) : (
                            // Middle T-Junction (Vertical + Horizontal)
                            <>
                                <div className={`absolute top-0 left-0 w-[1px] h-full ${lineBg} transition-colors duration-200`}></div>
                                <div className={`absolute top-1/2 left-0 w-full h-[1px] ${lineBg} -translate-y-1/2 transition-colors duration-200`}></div>
                            </>
                        )}
                        
                        {/* Add Button on Horizontal Segment */}
                        <AddTaskButton 
                            onClick={onAdd}
                            visible={showAdd}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover/bracket:opacity-100 group-hover/bracket:scale-100 group-hover/bracket:pointer-events-auto"
                        />
                    </>
                ) : (
                    <>
                         {/* Vertical Spines & Corners */}
                         {isFirst ? (
                            // Top Right Corner
                            <div className={`absolute top-1/2 right-0 w-full h-1/2 border-r-[1px] border-t-[1px] ${lineColor} rounded-tr-xl transition-colors duration-200`}></div>
                        ) : isLast ? (
                            // Bottom Right Corner
                            <div className={`absolute top-0 right-0 w-full h-1/2 border-r-[1px] border-b-[1px] ${lineColor} rounded-br-xl transition-colors duration-200`}></div>
                        ) : (
                            // Middle T-Junction
                            <>
                                <div className={`absolute top-0 right-0 w-[1px] h-full ${lineBg} transition-colors duration-200`}></div>
                                <div className={`absolute top-1/2 right-0 w-full h-[1px] ${lineBg} -translate-y-1/2 transition-colors duration-200`}></div>
                            </>
                        )}

                        {/* Add Button on Horizontal Segment */}
                        <AddTaskButton 
                            onClick={onAdd}
                            visible={showAdd}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover/bracket:opacity-100 group-hover/bracket:scale-100 group-hover/bracket:pointer-events-auto"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

// --- Modals ---

const AddSourceModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (s: Source) => void }) => {
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('master');

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Add Source</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Repository</label>
                        <input className="w-full border rounded px-3 py-2 mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="user/repo" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Branch</label>
                        <input className="w-full border rounded px-3 py-2 mt-1" value={branch} onChange={e => setBranch(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={() => onAdd({ id: `src-${Date.now()}`, type: 'Codeup', name, repo: name, branch })} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                </div>
            </div>
        </div>
    )
}

const TaskEditModal = ({ job, onClose, onSave, onDelete }: { job: Job, stageId: string, allJobs: Job[], onClose: () => void, onSave: (j: Job) => void, onDelete: () => void }) => {
    const [localJob, setLocalJob] = useState(job);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Edit Task</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input className="w-full border rounded px-3 py-2 mt-1" value={localJob.name} onChange={e => setLocalJob({...localJob, name: e.target.value})} />
                    </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                    <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm font-medium flex items-center gap-2">
                        <Icons.Trash2 size={14} /> Delete
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button onClick={() => onSave(localJob)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const PipelineSettings: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>('flow_config');
  
  const [stages, setStages] = useState<Stage[]>(() => {
    if (location.state && location.state.templateStages) {
        return location.state.templateStages.map((s: Stage) => ({ ...s, width: calculateStageWidth(s.jobs || []) }));
    }
    return JSON.parse(JSON.stringify(DEFAULT_PIPELINE_DETAIL.stages)).map((s: Stage) => ({ ...s, width: calculateStageWidth(s.jobs || []) }));
  });

  const [pipelineName, setPipelineName] = useState(() => {
    if (location.state && location.state.pipelineName) {
        return location.state.pipelineName;
    }
    return DEFAULT_PIPELINE_DETAIL.name;
  });

  const [sources, setSources] = useState<Source[]>([
      { id: 'src-1', type: 'Codeup', name: 'flow-example/spring-boot', repo: 'flow-example/spring-boot', branch: 'master' }
  ]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  
  const [editingJob, setEditingJob] = useState<{ stageId: string, job: Job } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [draggedJob, setDraggedJob] = useState<{ stageId: string, index: number } | null>(null);
  const [resizing, setResizing] = useState<{ stageId: string, startX: number, startWidth: number } | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  
  const getJobRelation = (jobId: string) => {
      if (!hoveredJobId || draggedJob || resizing) return 'none';
      if (jobId === hoveredJobId) return 'hovered';
      
      const hoveredJob = stages.flatMap(s => s.jobs).find(j => j.id === hoveredJobId);
      if (!hoveredJob) return 'none';

      if (hoveredJob.dependencies?.includes(jobId)) return 'upstream';

      const currentJob = stages.flatMap(s => s.jobs).find(j => j.id === jobId);
      if (currentJob?.dependencies?.includes(hoveredJobId)) return 'downstream';

      return 'none';
  };

  const handleSave = async () => {
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      DEFAULT_PIPELINE_DETAIL.name = pipelineName;
      DEFAULT_PIPELINE_DETAIL.stages = JSON.parse(JSON.stringify(stages));
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const delta = e.clientX - resizing.startX;
        setStages(prev => prev.map(s => {
          if (s.id === resizing.stageId) {
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
      document.body.style.userSelect = 'none';
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
      startWidth: stage.width || 300
    });
  };

  const handleAutoFitStage = (stageId: string) => {
      const stage = stages.find(s => s.id === stageId);
      if (!stage) return;
      
      const newWidth = calculateStageWidth(stage.jobs);
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, width: newWidth } : s));
  };

  const handleDragStart = (e: React.DragEvent, stageId: string, index: number) => {
    setDraggedJob({ stageId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedJob) return;

    const newStages = JSON.parse(JSON.stringify(stages)) as Stage[];
    const sourceStageIdx = newStages.findIndex(s => s.id === draggedJob.stageId);
    const targetStageIdx = newStages.findIndex(s => s.id === targetStageId);

    if (sourceStageIdx === -1 || targetStageIdx === -1) return;

    const [movedJob] = newStages[sourceStageIdx].jobs.splice(draggedJob.index, 1);
    
    if (sourceStageIdx !== targetStageIdx) {
        movedJob.dependencies = [];
    }

    newStages[targetStageIdx].jobs.push(movedJob);
    newStages[sourceStageIdx].width = calculateStageWidth(newStages[sourceStageIdx].jobs);
    newStages[targetStageIdx].width = calculateStageWidth(newStages[targetStageIdx].jobs);

    setStages(newStages);
    setDraggedJob(null);
  };

  const handleAddStage = () => {
    handleAddStageAt(stages.length);
  };

  const handleAddStageAt = (index: number) => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      jobs: [],
      width: 300
    };
    const newStages = [...stages];
    newStages.splice(index, 0, newStage);
    setStages(newStages);
  };

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
              newJob.dependencies = [anchorJob.id];
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
              const anchorIndex = newJobs.findIndex(j => j.id === anchorJob.id);
              
              const localDeps = anchorJob.dependencies?.filter(isLocal) || [];
              const remoteDeps = anchorJob.dependencies?.filter(d => !isLocal(d)) || [];
              newJob.dependencies = [...localDeps];
              
              newJobs = newJobs.map(j => {
                  if (j.id === anchorJob.id) {
                       return { ...j, dependencies: [newJob.id, ...remoteDeps] };
                  }
                  return j;
              });
              
              if (anchorIndex !== -1) {
                  newJobs.splice(anchorIndex, 0, newJob);
              } else {
                  newJobs.push(newJob);
              }
          }

          const requiredWidth = calculateStageWidth(newJobs);
          return { ...s, jobs: newJobs, width: requiredWidth };
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
        const newJobs = [...s.jobs, newJob];
        return { ...s, jobs: newJobs, width: calculateStageWidth(newJobs) };
      }
      return s;
    }));
  };

  const handleDeleteJob = (stageId: string, jobId: string) => {
    setStages(stages.map(s => {
      if (s.id === stageId) {
        const filteredJobs = s.jobs.filter(j => j.id !== jobId).map(j => ({
            ...j,
            dependencies: j.dependencies?.filter(d => d !== jobId)
        }));
        
        const newWidth = calculateStageWidth(filteredJobs);
        return { ...s, jobs: filteredJobs, width: newWidth };
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-50">
             <div className="flex items-center gap-4">
                 <button onClick={() => navigate(`/pipeline/${id}`)} className="text-gray-500 hover:text-gray-800">
                    <Icons.ChevronRight className="rotate-180" size={20} />
                 </button>
                 <span className="font-bold text-gray-800">{pipelineName}</span>
             </div>

             <div className="flex items-center gap-6 h-full">
                 {['Basic Info', 'Flow Config', 'Triggers', 'Variables & Cache'].map((tab) => {
                     const active = (tab === 'Flow Config' && activeTab === 'flow_config') || (tab === 'Basic Info' && activeTab === 'basic');
                     return (
                         <button 
                            key={tab}
                            onClick={() => {
                                if (tab === 'Flow Config') setActiveTab('flow_config');
                                else if (tab === 'Basic Info') setActiveTab('basic');
                                else setActiveTab(tab.toLowerCase());
                            }}
                            className={`h-full border-b-2 px-2 text-sm font-medium transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                         >
                             {tab}
                         </button>
                     );
                 })}
             </div>

             <div className="flex items-center gap-3">
                 <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                     Save
                 </button>
                 <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors flex items-center gap-2"
                 >
                     {isSaving ? 'Saving...' : 'Save & Run'}
                 </button>
             </div>
        </header>

        {/* Main Canvas Area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-[#F2F4F7] p-8">
            <div className="flex h-full min-w-max pb-8 relative items-start">
                
                {/* Pipeline Source Node */}
                <div className="flex flex-col shrink-0 mr-8 mt-9 relative group/source">
                    <div className="text-xs font-bold text-gray-400 mb-2 pl-1">PIPELINE SOURCE</div>
                    <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-4 relative z-10 hover:shadow-md transition-shadow">
                         {sources.length > 0 ? (
                             <>
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
                                    F
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{sources[0].name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <Icons.GitBranch size={12} />
                                        <span>{sources[0].branch}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 truncate">
                                        {sources[0].repo}
                                    </div>
                                </div>
                                <button onClick={() => setShowSourceModal(true)} className="absolute top-2 right-2 text-gray-300 hover:text-blue-500">
                                    <Icons.Settings size={14} />
                                </button>
                             </>
                         ) : (
                             <button onClick={() => setShowSourceModal(true)} className="w-full h-full flex items-center justify-center text-blue-500 gap-2 py-4">
                                 <Icons.Plus size={20} /> Add Source
                             </button>
                         )}
                    </div>
                    {/* Source Output Connector */}
                    <div className="absolute top-1/2 -right-8 w-8 h-[1px] bg-gray-300 translate-y-3"></div>
                    <div className="absolute top-1/2 -right-4 translate-x-1/2 translate-y-3 z-20">
                         <AddTaskButton onClick={() => handleAddStageAt(0)} className="opacity-0 group-hover/source:opacity-100" />
                    </div>
                </div>

                {/* Stages Loop */}
                {stages.map((stage, idx) => {
                    const isResizingThis = resizing?.stageId === stage.id;
                    const chains = organizeJobsIntoChains(stage.jobs);
                    const hasMultipleChains = chains.length > 1;

                    return (
                    <div key={stage.id} className="flex h-full shrink-0 group/stage relative">
                         {/* Connector to Next Stage */}
                         {idx < stages.length - 1 && (
                            <div className="absolute top-[88px] -right-8 w-16 h-[1px] bg-gray-300 z-0"></div>
                         )}
                         {/* Add Stage Button on Connector */}
                         <div className="absolute top-[88px] -right-8 w-16 flex items-center justify-center translate-y-[-50%] z-20">
                             <AddTaskButton 
                                onClick={() => handleAddStageAt(idx + 1)} 
                                className="opacity-0 group-hover/stage:opacity-100 scale-75 group-hover/stage:scale-100 transition-all"
                             />
                         </div>

                        <div 
                          className={`flex flex-col relative transition-all duration-300 ease-out ${isResizingThis ? 'z-30' : ''}`}
                          style={{ width: stage.width }}
                        >
                            {/* Stage Header */}
                            <div className="flex items-center gap-2 mb-3 px-1 group/header">
                                <span className="text-sm font-medium text-gray-500">{stage.name}</span>
                                <Icons.Settings 
                                    size={12} 
                                    className="text-gray-300 cursor-pointer hover:text-blue-500 opacity-0 group-hover/header:opacity-100 transition-opacity"
                                    onClick={() => { /* Rename logic */ }} 
                                />
                                <Icons.Trash2 
                                    size={12} 
                                    className="text-gray-300 cursor-pointer hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-opacity ml-auto"
                                    onClick={() => handleDeleteStage(stage.id)}
                                />
                            </div>

                            {/* Stage Content Area */}
                            <div 
                                className={`flex-1 flex flex-col items-center relative py-2 ${isResizingThis ? 'bg-blue-50/30' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className={hasMultipleChains ? "flex flex-col items-stretch w-full" : "flex flex-col w-full items-center"}>
                                {chains.map((chain, chainIdx) => {
                                    const firstJobRel = getJobRelation(chain[0].id);
                                    const lastJobRel = getJobRelation(chain[chain.length-1].id);
                                    
                                    const highlightLeft = firstJobRel === 'hovered' || firstJobRel === 'downstream';
                                    const highlightRight = lastJobRel === 'hovered' || lastJobRel === 'upstream';
                                    
                                    const isFirstChainJobHovered = getJobRelation(chain[0].id) === 'hovered';
                                    const isLastChainJobHovered = getJobRelation(chain[chain.length-1].id) === 'hovered';

                                    return (
                                    <div key={chainIdx} className="flex flex-row items-stretch w-full z-10">
                                        
                                        <ChainBracket 
                                            type="left" 
                                            index={chainIdx} 
                                            total={chains.length} 
                                            highlight={highlightLeft}
                                            onAdd={() => handleAddSerialTask(stage.id, chain[0], 'left')}
                                            showAdd={isFirstChainJobHovered}
                                        />

                                        <div className="flex flex-row items-center gap-0 w-auto justify-center py-2">
                                            
                                            {/* Start Node (Lightning Icon) */}
                                            <div className="w-12 h-8 flex items-center justify-center shrink-0 relative">
                                                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                                                    <Icons.Zap size={12} fill="currentColor" className="text-gray-400" />
                                                </div>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-gray-300"></div>
                                            </div>

                                            {chain.map((job, jobIdx) => {
                                                const jobRelation = getJobRelation(job.id);
                                                const isJobHovered = jobRelation === 'hovered';
                                                
                                                let highlightConnector = false;
                                                if (jobIdx > 0) {
                                                    const prevJob = chain[jobIdx - 1];
                                                    const prevRel = getJobRelation(prevJob.id);
                                                    highlightConnector = (prevRel === 'upstream' && jobRelation === 'hovered') || 
                                                                         (prevRel === 'hovered' && jobRelation === 'downstream');
                                                }

                                                let cardBorderClass = "border-gray-200 hover:border-blue-400";
                                                let cardShadowClass = "shadow-sm hover:shadow-md";

                                                if (jobRelation === 'hovered') {
                                                    cardBorderClass = "border-blue-500 ring-1 ring-blue-500";
                                                    cardShadowClass = "shadow-lg";
                                                } else if (jobRelation === 'upstream') {
                                                    cardBorderClass = "border-indigo-400 ring-1 ring-indigo-300";
                                                } else if (jobRelation === 'downstream') {
                                                    cardBorderClass = "border-purple-400 ring-1 ring-purple-300";
                                                }

                                                return (
                                                <React.Fragment key={job.id}>
                                                    {jobIdx > 0 && (
                                                        <JobConnector 
                                                            active={highlightConnector || isJobHovered || getJobRelation(chain[jobIdx-1].id) === 'hovered'} 
                                                            onClick={() => handleAddSerialTask(stage.id, chain[jobIdx-1], 'right')}
                                                            highlight={highlightConnector}
                                                        />
                                                    )}

                                                    <div 
                                                        draggable
                                                        onMouseEnter={() => setHoveredJobId(job.id)}
                                                        onMouseLeave={() => setHoveredJobId(null)}
                                                        onClick={() => setEditingJob({ stageId: stage.id, job })}
                                                        onDragStart={(e) => handleDragStart(e, stage.id, stage.jobs.indexOf(job))}
                                                        className={`bg-white px-4 py-2.5 rounded-full border cursor-pointer relative group/job w-[180px] shrink-0 transition-all duration-200 flex items-center gap-3 ${cardBorderClass} ${cardShadowClass}`}
                                                    >
                                                        {/* Status/Type Icon */}
                                                        {job.status === 'failed' && <Icons.AlertCircle size={14} className="text-red-500" />}
                                                        {job.status === 'success' && <Icons.CheckCircle size={14} className="text-green-500" />}
                                                        {job.status !== 'failed' && job.status !== 'success' && (
                                                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                                        )}
                                                        
                                                        <span className="font-medium text-gray-700 text-sm truncate" title={job.name}>{job.name}</span>
                                                    </div>
                                                </React.Fragment>
                                            )})}
                                        </div>

                                        <ChainBracket 
                                            type="right" 
                                            index={chainIdx} 
                                            total={chains.length}
                                            highlight={highlightRight}
                                            onAdd={() => handleAddSerialTask(stage.id, chain[chain.length-1], 'right')}
                                            showAdd={isLastChainJobHovered}
                                        />
                                    </div>
                                )})}
                                </div>

                                <button 
                                    onClick={() => handleAddJob(stage.id)}
                                    className="mt-4 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <Icons.Plus size={12} /> 并行任务
                                </button>
                            </div>

                            {/* Resizer Handle */}
                            <div 
                                className="absolute top-0 right-0 bottom-0 w-4 -mr-2 cursor-col-resize flex justify-center z-20 group/resizer"
                                onMouseDown={(e) => startResize(e, stage)}
                                onDoubleClick={() => handleAutoFitStage(stage.id)}
                            >
                                <div className={`w-[1px] h-full transition-colors ${isResizingThis ? 'bg-blue-500' : 'bg-transparent group-hover/resizer:bg-blue-200'}`}></div>
                            </div>
                        </div>
                    </div>
                )})}

                {/* New Stage Placeholder */}
                <div className="flex flex-col shrink-0 ml-8 mt-9 opacity-50 hover:opacity-100 transition-opacity cursor-pointer group" onClick={handleAddStage}>
                     <div className="text-xs font-bold text-gray-400 mb-2 pl-1">NEW STAGE</div>
                     <div className="w-64 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 group-hover:border-blue-400 group-hover:text-blue-500 bg-gray-50/50">
                         <div className="flex flex-col items-center gap-2">
                            <Icons.PlusCircle size={24} />
                            <span className="text-sm font-medium">Add Stage</span>
                         </div>
                     </div>
                </div>

            </div>
        </div>

        {showSourceModal && <AddSourceModal onClose={() => setShowSourceModal(false)} onAdd={handleAddSource} />}
        {editingJob && <TaskEditModal job={editingJob.job} stageId={editingJob.stageId} allJobs={stages.flatMap(s => s.id === editingJob.stageId ? s.jobs : [])} onClose={() => setEditingJob(null)} onSave={(j) => handleSaveJob(j, editingJob.stageId)} onDelete={() => { handleDeleteJob(editingJob.stageId, editingJob.job.id); setEditingJob(null); }} />}
        {showToast && <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 animate-slide-up z-50"><Icons.CheckCircle className="text-green-400" size={20} /><span>Pipeline saved.</span></div>}
    </div>
  );
};

export default PipelineSettings;
