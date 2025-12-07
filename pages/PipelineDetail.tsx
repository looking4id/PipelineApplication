
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Terminal from '../components/Terminal';
import { Icons, StatusIcon } from '../components/Icons';
import { DEFAULT_PIPELINE_DETAIL, MOCK_HISTORY, MOCK_LOGS_JAVA } from '../constants';
import { PipelineDetail, Job } from '../types';

// Helper component for Job Type Icons
const JobTypeIcon = ({ type, className = "w-4 h-4" }: { type: string, className?: string }) => {
    switch (type) {
        case 'build':
            return <Icons.Hammer className={`text-orange-500 ${className}`} />;
        case 'test':
            return <Icons.FlaskConical className={`text-purple-500 ${className}`} />;
        case 'scan':
            return <Icons.Search className={`text-blue-500 ${className}`} />;
        case 'deploy':
            return <Icons.CloudUpload className={`text-green-600 ${className}`} />;
        case 'custom':
        default:
            return <Icons.Code className={`text-gray-500 ${className}`} />;
    }
};

const PipelineDetailView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineDetail>(DEFAULT_PIPELINE_DETAIL);
  const [activeTab, setActiveTab] = useState<'flow'|'history'|'jobs'>('flow');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Derived state for the selected job to ensure it receives updates
  const selectedJob = pipeline.stages
    .flatMap(s => s.jobs)
    .find(j => j.id === selectedJobId) || null;

  // Simulate run progression
  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;

    if (isRunning) {
       // Reset all to pending except first, and CLEAR LOGS for a fresh run
       setPipeline(prev => {
           const resetStages = prev.stages.map((stage, idx) => ({
               ...stage,
               jobs: stage.jobs.map(j => ({ 
                   ...j, 
                   status: idx === 0 ? 'running' as const : 'pending' as const,
                   logs: [] // Start with empty logs
               }))
           }));
           return { ...prev, stages: resetStages, lastRunStatus: 'running' };
       });

       // Progress to Stage 2 after delay
       timer1 = setTimeout(() => {
           setPipeline(prev => ({
                ...prev,
                stages: prev.stages.map((stage, idx) => {
                    if (idx === 0) return { ...stage, jobs: stage.jobs.map(j => ({ ...j, status: 'success' as const })) };
                    if (idx === 1) return { ...stage, jobs: stage.jobs.map(j => ({ ...j, status: 'running' as const })) };
                    return stage;
                })
           }));
       }, 2500);

       // Finish execution
       timer2 = setTimeout(() => {
            setPipeline(prev => ({
                ...prev,
                stages: prev.stages.map((stage, idx) => {
                    if (idx === 1) return { ...stage, jobs: stage.jobs.map(j => ({ ...j, status: 'success' as const })) };
                    if (idx === 2) return { ...stage, jobs: stage.jobs.map(j => ({ ...j, status: 'failed' as const })) };
                    return stage;
                }),
                lastRunStatus: 'failed'
            }));
            setIsRunning(false);
       }, 5000);
    }
    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
    };
  }, [isRunning]);

  // Real-time log streaming effect
  useEffect(() => {
      if (!isRunning) return;

      const interval = setInterval(() => {
          setPipeline(prev => {
              // Find if any job is running
              const hasRunningJob = prev.stages.some(s => s.jobs.some(j => j.status === 'running'));
              
              if (!hasRunningJob) return prev;

              return {
                  ...prev,
                  stages: prev.stages.map(stage => ({
                      ...stage,
                      jobs: stage.jobs.map(job => {
                          if (job.status === 'running') {
                              // Generate a simulated log line
                              const randomLog = MOCK_LOGS_JAVA[Math.floor(Math.random() * MOCK_LOGS_JAVA.length)];
                              const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
                              // Ensure clean formatting
                              const cleanLog = randomLog.replace(/^\[.*?\]\s*/, ''); 
                              const logLine = `[${timestamp}] [INFO] ${cleanLog}`;
                              
                              return {
                                  ...job,
                                  logs: [...job.logs, logLine]
                              };
                          }
                          return job;
                      })
                  }))
              };
          });
      }, 400); // Add a log line every 400ms

      return () => clearInterval(interval);
  }, [isRunning]);

  const handleRun = () => {
      setIsRunning(true);
      if (activeTab === 'history') setActiveTab('flow');
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Pipeline Control Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {pipeline.name}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${pipeline.lastRunStatus === 'success' ? 'bg-green-50 text-green-600 border-green-200' : pipeline.lastRunStatus === 'running' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        Last Run: {pipeline.lastRunStatus.toUpperCase()}
                    </span>
                </h2>
                <span className="text-xs text-gray-500 mt-1">
                    Pipeline ID: {pipeline.id} • Last execution: {pipeline.lastRunTime}
                </span>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
               <button 
                onClick={() => navigate(`/pipeline/${id}/edit`)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
               >
                 <Icons.Settings size={16} /> Edit
               </button>
               <button 
                onClick={handleRun}
                disabled={isRunning}
                className={`px-4 py-2 text-sm text-white rounded flex items-center gap-2 shadow-sm transition-all ${isRunning ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
               >
                 {isRunning ? <Icons.RotateCw className="animate-spin" size={16} /> : <Icons.Play size={16} />}
                 {isRunning ? 'Running...' : 'Run Pipeline'}
               </button>
           </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 bg-white flex gap-6 text-sm font-medium text-gray-500">
            <button 
                className={`py-3 border-b-2 transition-colors ${activeTab === 'flow' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
                onClick={() => setActiveTab('flow')}
            >
                Flow Graph
            </button>
            <button 
                className={`py-3 border-b-2 transition-colors ${activeTab === 'jobs' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
                onClick={() => setActiveTab('jobs')}
            >
                Job Status
            </button>
            <button 
                className={`py-3 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-800'}`}
                onClick={() => setActiveTab('history')}
            >
                Run History
            </button>
        </div>

        {/* Content Area */}
        {activeTab === 'flow' ? (
            <div className="flex-1 bg-gray-50 overflow-x-auto overflow-y-hidden p-8">
                <div className="min-w-max flex gap-12 h-full items-start pt-10">
                    
                    {/* Source Node (Static Start) */}
                    <div className="relative group">
                        <div className="w-64 bg-white rounded border border-gray-200 shadow-sm p-4 flex items-start gap-3 relative z-10">
                            <div className="bg-gray-100 p-2 rounded text-gray-600">
                                <Icons.GitBranch size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">Git Source</h4>
                                <p className="text-xs text-gray-500 mt-1">master • 8a2b1c</p>
                            </div>
                        </div>
                        {/* Connector Line */}
                        <div className="absolute top-1/2 left-full w-12 h-0.5 bg-gray-300 -translate-y-1/2"></div>
                    </div>

                    {/* Dynamic Stages */}
                    {pipeline.stages.map((stage, idx) => {
                        // Calculate stage statistics
                        const stats = {
                            success: stage.jobs.filter(j => j.status === 'success').length,
                            failed: stage.jobs.filter(j => j.status === 'failed').length,
                            running: stage.jobs.filter(j => j.status === 'running').length,
                            pending: stage.jobs.filter(j => j.status === 'pending').length,
                            total: stage.jobs.length
                        };

                        return (
                            <div key={stage.id} className="relative flex flex-col gap-4 min-w-[18rem]">
                                {/* Enhanced Stage Header */}
                                <div className="flex flex-col gap-2 mb-2 px-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-700 font-bold uppercase tracking-wide text-sm">
                                            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                                                <span className="text-xs">{idx + 1}</span>
                                            </div>
                                            {stage.name}
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono">
                                            {stats.total} Job{stats.total !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    
                                    {/* Status Summary Chips */}
                                    <div className="flex gap-2 text-xs">
                                        {stats.success > 0 && (
                                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 font-medium">
                                                <Icons.CheckCircle size={10} /> {stats.success}
                                            </div>
                                        )}
                                        {stats.failed > 0 && (
                                            <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-medium">
                                                <Icons.XCircle size={10} /> {stats.failed}
                                            </div>
                                        )}
                                        {stats.running > 0 && (
                                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                                                <Icons.RotateCw size={10} className="animate-spin" /> {stats.running}
                                            </div>
                                        )}
                                        {stats.pending > 0 && stats.total === stats.pending && (
                                            <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                                                <Icons.Clock size={10} /> Pending
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {stage.jobs.map((job) => (
                                    <div 
                                        key={job.id} 
                                        onClick={() => setSelectedJobId(job.id)}
                                        className={`w-72 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md cursor-pointer transition-all p-4 relative z-10 group
                                            ${job.status === 'success' ? 'border-l-green-500' : 
                                              job.status === 'failed' ? 'border-l-red-500' : 
                                              job.status === 'running' ? 'border-l-blue-500' : 'border-l-gray-300'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <JobTypeIcon type={job.type} className="w-4 h-4 opacity-70" />
                                                <h4 className="font-bold text-gray-800 text-sm">{job.name}</h4>
                                            </div>
                                            <StatusIcon status={job.status} />
                                        </div>
                                        <div className="mt-3 flex justify-between items-end">
                                            <div className="text-xs text-gray-500">{job.duration || '--'}</div>
                                            <div className="flex gap-4 text-xs text-gray-400">
                                                {job.stats && (
                                                    <>
                                                        <span className="text-red-500 font-medium">{job.stats.errors} Errors</span>
                                                        <span className="text-yellow-600">{job.stats.warnings} Warn</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Hover Action */}
                                        <div className="absolute inset-0 bg-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg flex items-center justify-center">
                                            <span className="bg-white text-gray-700 px-3 py-1 rounded shadow text-xs font-medium">View Logs</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Connector to next stage */}
                                {idx < pipeline.stages.length - 1 && (
                                    <div className="absolute top-24 left-full w-12 h-0.5 bg-gray-300 z-0"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : activeTab === 'jobs' ? (
             <div className="flex-1 bg-white overflow-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="py-3 px-6">Job Name</th>
                            <th className="py-3 px-6">Stage</th>
                            <th className="py-3 px-6">Type</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Duration</th>
                            <th className="py-3 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {pipeline.stages.flatMap(stage => stage.jobs.map(job => ({...job, stageName: stage.name}))).map((job) => (
                            <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 text-sm font-medium text-gray-900 flex items-center gap-3">
                                    <JobTypeIcon type={job.type} />
                                    {job.name}
                                </td>
                                <td className="py-4 px-6 text-sm text-gray-600">{job.stageName}</td>
                                <td className="py-4 px-6 text-sm text-gray-600">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono uppercase">{job.type}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon status={job.status} className="w-4 h-4" />
                                        <span className={`text-sm capitalize ${
                                            job.status === 'success' ? 'text-green-700' : 
                                            job.status === 'failed' ? 'text-red-700' : 
                                            job.status === 'running' ? 'text-blue-700' : 'text-gray-600'
                                        }`}>{job.status}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-sm text-gray-600 font-mono">{job.duration || '-'}</td>
                                <td className="py-4 px-6 text-right">
                                    <button 
                                        onClick={() => setSelectedJobId(job.id)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 justify-end ml-auto"
                                    >
                                        <Icons.Terminal size={14} /> Logs
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 {pipeline.stages.every(s => s.jobs.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Icons.Box size={48} className="mb-4 opacity-50" />
                        <p>No jobs configured</p>
                    </div>
                )}
             </div>
        ) : (
            <div className="flex-1 bg-white overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="py-3 px-6 w-20"># Run</th>
                            <th className="py-3 px-6 w-32">Status</th>
                            <th className="py-3 px-6">Commit / Message</th>
                            <th className="py-3 px-6">Branch</th>
                            <th className="py-3 px-6">Triggered By</th>
                            <th className="py-3 px-6 w-32">Duration</th>
                            <th className="py-3 px-6 w-40">Time</th>
                            <th className="py-3 px-6 w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {MOCK_HISTORY.map((run) => (
                            <tr key={run.runId} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setActiveTab('flow')}>
                                <td className="py-4 px-6 text-sm font-medium text-gray-900">#{run.runId}</td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon status={run.status} className="w-4 h-4" />
                                        <span className={`text-sm capitalize ${
                                            run.status === 'success' ? 'text-green-700' : 
                                            run.status === 'failed' ? 'text-red-700' : 'text-blue-700'
                                        }`}>{run.status}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900 font-medium truncate max-w-xs">{run.message}</span>
                                        <span className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                                            <Icons.GitBranch size={10} /> {run.commitId}
                                        </span>
                                    </div>
                                </td>
                                 <td className="py-4 px-6 text-sm text-gray-600">
                                     <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-700">{run.branch}</span>
                                 </td>
                                <td className="py-4 px-6 text-sm text-gray-600 flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">AP</div>
                                     <span className="truncate max-w-[150px]">{run.trigger}</span>
                                </td>
                                <td className="py-4 px-6 text-sm text-gray-600 font-mono">{run.duration}</td>
                                <td className="py-4 px-6 text-sm text-gray-600">{run.time}</td>
                                <td className="py-4 px-6 text-right">
                                     <button className="text-blue-600 hover:text-blue-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        View
                                     </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {MOCK_HISTORY.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Icons.Clock size={48} className="mb-4 opacity-50" />
                        <p>No run history available</p>
                    </div>
                )}
            </div>
        )}
      </div>
      
      {/* Log Terminal Modal */}
      <Terminal 
        isOpen={!!selectedJob} 
        onClose={() => setSelectedJobId(null)} 
        title={selectedJob?.name || 'Logs'} 
        logs={selectedJob?.logs || []}
      />
    </Layout>
  );
};

export default PipelineDetailView;
