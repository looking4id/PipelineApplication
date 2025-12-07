import React, { useRef, useEffect } from 'react';
import { Icons } from './Icons';

interface TerminalProps {
  logs: string[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ logs, title, isOpen, onClose }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] w-full max-w-5xl h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
            <Icons.Terminal size={16} />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-4">
             <button className="text-gray-400 hover:text-white text-xs">Download Log</button>
             <button className="text-gray-400 hover:text-white text-xs">View Raw</button>
             <button onClick={onClose} className="text-gray-400 hover:text-white">
                <Icons.XCircle size={18} />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            {logs.map((log, i) => {
                let colorClass = "text-gray-300";
                if (log.includes("[ERROR]") || log.includes("FAILURE")) colorClass = "text-red-400";
                else if (log.includes("[INFO]") || log.includes("successfully")) colorClass = "text-green-400";
                else if (log.includes("[WARNING]")) colorClass = "text-yellow-400";
                else if (log.startsWith(">>")) colorClass = "text-blue-300";

                return (
                    <div key={i} className={`${colorClass} whitespace-pre-wrap mb-0.5 leading-relaxed`}>
                        {log}
                    </div>
                );
            })}
            <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
