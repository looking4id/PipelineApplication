
import React from 'react';
import { 
  Play, RotateCw, XCircle, CheckCircle, Clock, 
  Settings, GitBranch, FileText, Layout, 
  Plus, Search, Bell, HelpCircle, ChevronRight,
  MoreHorizontal, Terminal, Save, Box, Trash2,
  GripVertical, Hammer, FlaskConical, CloudUpload, Code,
  Github, Gitlab, HardDrive, Server, Globe, Link,
  Maximize
} from 'lucide-react';

export const Icons = {
  Play,
  RotateCw,
  XCircle,
  CheckCircle,
  Clock,
  Settings,
  GitBranch,
  FileText,
  Layout,
  Plus,
  Search,
  Bell,
  HelpCircle,
  ChevronRight,
  MoreHorizontal,
  Terminal,
  Save,
  Box,
  Trash2,
  GripVertical,
  Hammer,
  FlaskConical,
  CloudUpload,
  Code,
  Github,
  Gitlab,
  HardDrive,
  Server,
  Globe,
  Link,
  Maximize
};

export const StatusIcon = ({ status, className = "w-5 h-5" }: { status: string, className?: string }) => {
  switch (status) {
    case 'success':
      return <Icons.CheckCircle className={`text-green-500 ${className}`} />;
    case 'failed':
      return <Icons.XCircle className={`text-red-500 ${className}`} />;
    case 'running':
      return <Icons.RotateCw className={`text-blue-500 animate-spin ${className}`} />;
    case 'skipped':
        return <div className={`w-4 h-4 rounded-full border-2 border-gray-300 ${className}`} />;
    default:
      return <div className={`w-4 h-4 rounded-full border-2 border-gray-300 ${className}`} />;
  }
};
