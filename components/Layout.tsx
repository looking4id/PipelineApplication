import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 bg-white border-r border-gray-200 z-20 shadow-sm">
        <div className="mb-6 p-2 bg-blue-600 text-white rounded-lg font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
          F
        </div>
        
        <nav className="flex flex-col gap-4 w-full items-center">
          <NavItem icon={<Icons.Layout size={20} />} active label="Pipelines" onClick={() => navigate('/')} />
          <NavItem icon={<Icons.GitBranch size={20} />} label="Repos" />
          <NavItem icon={<Icons.Box size={20} />} label="Artifacts" />
          <NavItem icon={<Icons.Settings size={20} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
             <span className="cursor-pointer hover:text-blue-600" onClick={() => navigate('/')}>Home</span>
             <Icons.ChevronRight size={14} />
             <span className="font-medium text-gray-900">My-Java-Pipeline-01</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
                <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search pipelines (Ctrl+K)" 
                    className="pl-8 pr-4 py-1.5 bg-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                <Icons.Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <Icons.HelpCircle size={18} />
            </button>
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                AP
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, active = false, label, onClick }: { icon: React.ReactNode, active?: boolean, label: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`p-3 rounded-lg cursor-pointer group relative flex items-center justify-center transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
  >
    {icon}
    <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
    </div>
  </div>
);

export default Layout;
