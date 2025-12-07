import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Icons, StatusIcon } from '../components/Icons';
import { MOCK_PIPELINES, TEMPLATES } from '../constants';

const PipelineList: React.FC = () => {
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    // Mock creating a new pipeline ID
    const newId = `p-new-${Date.now()}`;
    
    // Navigate to the settings page with template state
    navigate(`/pipeline/${newId}/edit`, {
      state: {
        templateStages: template.stages,
        pipelineName: `My ${template.name} Pipeline`
      }
    });
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Pipelines</h1>
          <button 
            onClick={() => setShowTemplates(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
            <Icons.Plus size={16} />
            New Pipeline
          </button>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4">Pipeline Name</div>
                <div className="col-span-2">Last Status</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2">Last Run</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {MOCK_PIPELINES.map((pipeline) => (
                <div key={pipeline.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-4 flex flex-col">
                        <span 
                            className="font-medium text-blue-600 cursor-pointer hover:underline text-sm"
                            onClick={() => navigate(`/pipeline/${pipeline.id}`)}
                        >
                            {pipeline.name}
                        </span>
                        <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                             <Icons.GitBranch size={10} /> {pipeline.branch}
                        </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                         <StatusIcon status={pipeline.lastRunStatus} />
                         <span className="text-sm text-gray-700 capitalize">#{pipeline.lastRunId} {pipeline.lastRunStatus}</span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">{pipeline.duration}</div>
                    <div className="col-span-2 text-sm text-gray-600">{pipeline.lastRunTime}</div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                        <button 
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                            onClick={() => navigate(`/pipeline/${pipeline.id}`)}
                        >
                            <Icons.Play size={16} />
                        </button>
                        <button 
                             className="p-1.5 hover:bg-gray-100 text-gray-500 rounded"
                             onClick={() => navigate(`/pipeline/${pipeline.id}/edit`)}
                        >
                            <Icons.Settings size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 text-gray-500 rounded">
                            <Icons.MoreHorizontal size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Select Pipeline Template</h3>
                    <button onClick={() => setShowTemplates(false)} className="text-gray-500 hover:text-gray-800"><Icons.XCircle /></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50/50">
                    <div className="grid grid-cols-3 gap-4">
                        {TEMPLATES.map((tpl) => (
                            <div 
                              key={tpl.name} 
                              onClick={() => handleTemplateSelect(tpl)}
                              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                            >
                                <div className="text-3xl mb-3">{tpl.icon}</div>
                                <h4 className="font-bold text-gray-800 group-hover:text-blue-600">{tpl.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">{tpl.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
                    <button onClick={() => setShowTemplates(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                    <button 
                      onClick={() => handleTemplateSelect({ name: 'Empty', desc: '', icon: '', stages: [] })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Empty
                    </button>
                </div>
            </div>
        </div>
      )}
    </Layout>
  );
};

export default PipelineList;