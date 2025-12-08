
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
    const JOB_CARD_WIDTH = 224; // w-56
    const CONNECTOR_WIDTH = 48; // w-12 between jobs
    const BRACKET_WIDTH = 32; // min-w-[2rem] (w-8)

    let maxChainWidth = 0;
    
    if (chains.length === 0) {
        return 300;
    } 

    chains.forEach(chain => {
        const numCards = chain.length;
        const numConnectors = Math.max(0, numCards - 1);
        
        const width = (numCards * JOB_CARD_WIDTH) + 
                      (numConnectors * CONNECTOR_WIDTH) +
                      (BRACKET_WIDTH * 2); // Left and Right brackets min width

        if (width > maxChainWidth) maxChainWidth = width;
    });

    return Math.max(300, maxChainWidth + 24);
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
        <div className="w-12 h-8 flex items-center justify-center shrink-0 relative group/connector">
            {/* The Line */}
            <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors ${highlight ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            
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
            <div className={`flex-1 min-w-[2rem] flex items-center justify-center shrink-0 ${zIndex} relative group/bracket`}>
                <div className={`w-full h-[2px] ${lineBg} transition-colors duration-200`}></div>
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

    // Use fixed width for left bracket to enforce left alignment of parallel chains
    // Use flex-1 for right bracket to fill the remaining space
    const widthClass = type === 'left' ? "w-8" : "flex-1 min-w-[2rem]";

    return (
        <div className={`${widthClass} relative shrink-0 ${zIndex} group/bracket`}>
            <div className="absolute inset-0 w-full h-full">
                {type === 'left' ? (
                    <>
                        {/* Vertical Spines & Corners */}
                        {isFirst ? (
                            // Top Left Corner
                            <div className={`absolute top-1/2 left-0 w-full h-1/2 border-l-[2px] border-t-[2px] ${lineColor} rounded-tl-xl transition-colors duration-200`}></div>
                        ) : isLast ? (
                            // Bottom Left Corner
                            <div className={`absolute top-0 left-0 w-full h-1/2 border-l-[2px] border-b-[2px] ${lineColor} rounded-bl-xl transition-colors duration-200`}></div>
                        ) : (
                            // Middle T-Junction (Vertical + Horizontal)
                            <>
                                <div className={`absolute top-0 left-0 w-[2px] h-full ${lineBg} transition-colors duration-200`}></div>
                                <div className={`absolute top-1/2 left-0 w-full h-[2px] ${lineBg} -translate-y-1/2 transition-colors duration-200`}></div>
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
                            <div className={`absolute top-1/2 right-0 w-full h-1/2 border-r-[2px] border-t-[2px] ${lineColor} rounded-tr-xl transition-colors duration-200`}></div>
                        ) : isLast ? (
                            // Bottom Right Corner
                            <div className={`absolute top-0 right-0 w-full h-1/2 border-r-[2px] border-b-[2px] ${lineColor} rounded-br-xl transition-colors duration-200`}></div>
                        ) : (
                            // Middle T-Junction
                            <>
                                <div className={`absolute top-0 right-0 w-[2px] h-full ${lineBg} transition-colors duration-200`}></div>
                                <div className={`absolute top-1/2 right-0 w-full h-[2px] ${lineBg} -translate-y-1/2 transition-colors duration-200`}></div>
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


const PipelineSettings: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('flow_config');
  const [yamlMode, setYamlMode] = useState(false);
  
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

  const mockYaml = `name: ${pipelineName}
sources:
${sources.map(s => `  - type: ${s.type}\n    repo: ${s.repo}\n    branch: ${s.branch}`).join('\n')}
stages:
${stages.map(s => `  - name: ${s.name}\n    jobs:\n${s.jobs.map(j => `      - task: ${j.name}${j.dependencies?.length ? `\n        needs: [${j.dependencies.join(', ')}]` : ''}`).join('\n')}`).join('\n')}
`;

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

  const handleFitView = () => {
    if (!containerRef.current || stages.length === 0) return;
    const containerWidth = containerRef.current.clientWidth;
    const usedWidth = 464 + (stages.length > 0 ? (stages.length - 1) * 64 : 0);
    const availableWidth = containerWidth - usedWidth;
    const newWidth = Math.max(300, availableWidth / stages.length);
    setStages(prev => prev.map(s => ({ ...s, width: newWidth })));
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
    newStages[targetStageIdx].width = Math.max(newStages[targetStageIdx].width || 0, calculateStageWidth(newStages[targetStageIdx].jobs));

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
              // LEFT SIDE INSERTION
              // We need to insert the new job at the SAME INDEX as the anchor job
              // to preserve the order of roots in organizeJobsIntoChains, 
              // which prevents the parallel row from jumping to the bottom.
              
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
          const currentWidth = s.width || 0;
          const newWidth = Math.max(currentWidth, requiredWidth);

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
        const newJobs = [...s.jobs, newJob];
        return { ...s, jobs: newJobs, width: Math.max(s.width || 0, calculateStageWidth(newJobs)) };
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
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 relative">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
             <button onClick={() => navigate(`/pipeline/${id}`)} className="text-gray-500 hover:text-gray-900">
                <Icons.ChevronRight className="rotate-180" size={20} />
             </button>
             <h1 className="text-lg font-bold text-gray-800">Pipeline Configuration</h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="w-64 bg-white border-r border-gray-200 py-4 flex flex-col gap-1 shrink-0 z-10 overflow-y-auto">
                <SettingLink active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} label="Basic Information" />
                <SettingLink active={activeTab === 'flow_config'} onClick={() => setActiveTab('flow_config')} label="Flow Configuration" />
                <SettingLink active={activeTab === 'triggers'} onClick={() => setActiveTab('triggers')} label="Triggers & Schedules" />
                <SettingLink active={activeTab === 'variables'} onClick={() => setActiveTab('variables')} label="Variables & Secrets" />
                <SettingLink active={activeTab === 'cache'} onClick={() => setActiveTab('cache')} label="Cache Settings" />
            </div>

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
                                         <div className="w-full h-[2px] bg-gray-300"></div>
                                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                            <Icons.ChevronRight className="text-gray-400 bg-gray-100 rounded-full p-0.5" size={20} />
                                         </div>
                                    </div>

                                    {/* Stages Render Loop */}
                                    {stages.map((stage, idx) => {
                                        const isResizingThis = resizing?.stageId === stage.id;
                                        const chains = organizeJobsIntoChains(stage.jobs);
                                        const hasMultipleChains = chains.length > 1;

                                        return (
                                        <div key={stage.id} className="flex h-full shrink-0 group/stage">
                                            {/* Connector & Insert Button (Before Stage) */}
                                            {idx > 0 && (
                                                <div className="w-16 flex flex-col items-center justify-center relative shrink-0 group/connector">
                                                     <div className="w-full h-[2px] bg-gray-300 absolute top-24"></div>
                                                     <AddTaskButton 
                                                        onClick={() => handleAddStageAt(idx)}
                                                        className="absolute top-24 -translate-y-1/2 opacity-0 group-hover/connector:opacity-100 group-hover/connector:scale-100"
                                                     />
                                                </div>
                                            )}

                                            {/* Stage Column */}
                                            <div 
                                              className={`flex flex-col relative transition-all duration-300 ease-out ${isResizingThis ? 'z-30' : ''}`}
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
                                                    className={`flex-1 bg-gray-200/50 rounded-xl border px-2 py-3 flex flex-col gap-0 overflow-y-auto overflow-x-auto items-center relative ${isResizingThis ? 'border-blue-500 bg-blue-50/10' : 'border-gray-200'}`}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, stage.id)}
                                                >
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

                                                            <div className="flex flex-row items-center gap-0 w-auto justify-center py-3">
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

                                                                    let cardBorderClass = "border-gray-200 hover:border-blue-300";
                                                                    let cardRingClass = "";
                                                                    let cardShadowClass = "shadow-sm hover:shadow-md";

                                                                    if (jobRelation === 'hovered') {
                                                                        cardBorderClass = "border-blue-600";
                                                                        cardRingClass = "ring-2 ring-blue-100";
                                                                        cardShadowClass = "shadow-lg";
                                                                    } else if (jobRelation === 'upstream') {
                                                                        cardBorderClass = "border-indigo-400";
                                                                        cardRingClass = "ring-1 ring-indigo-200";
                                                                    } else if (jobRelation === 'downstream') {
                                                                        cardBorderClass = "border-purple-400";
                                                                        cardRingClass = "ring-1 ring-purple-200";
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
                                                                            className={`bg-white p-3 rounded border cursor-pointer relative group/job w-56 shrink-0 transition-all duration-200 ${cardBorderClass} ${cardRingClass} ${cardShadowClass}`}
                                                                        >
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Icons.Code size={14} className="text-gray-400" />
                                                                                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[180px]" title={job.name}>{job.name}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                                {job.dependencies && job.dependencies.length > 0 && <Icons.Link size={10} />}
                                                                                <span>{job.type}</span>
                                                                            </div>
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

                                                    <button 
                                                        onClick={() => handleAddJob(stage.id)}
                                                        className="w-56 py-2 border border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-all text-xs font-medium flex items-center justify-center gap-1 shrink-0 mt-4"
                                                    >
                                                        <Icons.Plus size={12} /> Add Parallel Task
                                                    </button>
                                                </div>

                                                <div 
                                                    className="absolute top-0 right-0 bottom-0 w-4 -mr-2 cursor-col-resize flex justify-center z-20 group/resizer"
                                                    onMouseDown={(e) => startResize(e, stage)}
                                                    onDoubleClick={() => handleAutoFitStage(stage.id)}
                                                    title="Drag to resize, Double-click to auto-fit"
                                                >
                                                    <div className={`w-1 h-full transition-colors rounded-full ${isResizingThis ? 'bg-blue-600' : 'bg-transparent group-hover/resizer:bg-blue-400'}`}></div>
                                                    
                                                    {isResizingThis && (
                                                        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 font-mono">
                                                            {Math.round(stage.width || 0)}px {stage.width && stage.width <= 280 ? '(Min)' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )})}

                                    <div className="flex items-start h-full pl-8 shrink-0">
                                        <div className="mt-24 flex items-center">
                                             <div className="w-12 h-[2px] bg-gray-300"></div>
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

                {['triggers', 'variables', 'cache'].includes(activeTab) && (
                    <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-400">Settings for {activeTab} coming soon...</p>
                    </div>
                )}
            </div>
        </div>

        {showSourceModal && (
            <AddSourceModal 
                onClose={() => setShowSourceModal(false)} 
                onAdd={handleAddSource} 
            />
        )}

        {editingJob && (
            <TaskEditModal
                job={editingJob.job}
                stageId={editingJob.stageId}
                allJobs={stages.flatMap(s => s.id === editingJob.stageId ? s.jobs : [])}
                onClose={() => setEditingJob(null)}
                onSave={(updatedJob) => handleSaveJob(updatedJob, editingJob.stageId)}
                onDelete={() => {
                    handleDeleteJob(editingJob.stageId, editingJob.job.id);
                    setEditingJob(null);
                }}
            />
        )}

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

const SettingLink = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <div 
        onClick={onClick}
        className={`px-6 py-3 text-sm font-medium cursor-pointer flex items-center justify-between transition-colors ${active ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
    >
        {label}
        {active && <Icons.ChevronRight size={14} />}
    </div>
);

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
                <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
                    <h3 className="font-bold text-gray-700 mb-4 px-2">Data Sources</h3>
                    <div className="space-y-1">
                        <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded font-medium text-sm cursor-pointer">Code Sources</div>
                        <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm cursor-pointer">Artifacts</div>
                        <div className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm cursor-pointer">Jenkins</div>
                    </div>
                </div>

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

const TaskEditModal = ({ job, stageId, allJobs, onClose, onSave, onDelete }: { job: Job, stageId: string, allJobs: Job[], onClose: () => void, onSave: (j: Job) => void, onDelete: () => void }) => {
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

                <div className="p-4 border-t border-gray-200 flex justify-between gap-3 bg-gray-50">
                    <button onClick={onDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors">Delete Task</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors">Save Task</button>
                    </div>
                </div>
             </div>
        </div>
    );
};

export default PipelineSettings;
