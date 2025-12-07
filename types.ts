
export type Status = 'success' | 'failed' | 'running' | 'pending' | 'skipped';

export interface Pipeline {
  id: string;
  name: string;
  lastRunId: number;
  lastRunStatus: Status;
  lastRunTime: string;
  duration: string;
  author: string;
  branch: string;
}

export interface Job {
  id: string;
  name: string;
  status: Status;
  duration?: string;
  type: 'scan' | 'test' | 'build' | 'deploy' | 'custom';
  logs: string[];
  stats?: {
    errors: number;
    warnings: number;
    info: number;
  };
  dependencies?: string[]; // IDs of jobs that must complete before this one
}

export interface Stage {
  id: string;
  name: string;
  jobs: Job[];
  width?: number; // Optional width in pixels for UI resizing
}

export interface PipelineDetail extends Pipeline {
  stages: Stage[];
}

export type TabView = 'flow' | 'runs' | 'stats' | 'settings' | 'members';
export type SettingsTab = 'basic' | 'flow_config' | 'triggers' | 'variables' | 'cache';