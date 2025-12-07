import { PipelineDetail, Pipeline, Stage } from './types';

export const MOCK_PIPELINES: Pipeline[] = [
  {
    id: 'p-001',
    name: 'My-Java-Pipeline-01',
    lastRunId: 2,
    lastRunStatus: 'failed',
    lastRunTime: '2025-12-06 19:35',
    duration: '1m 5s',
    author: 'dev@aliyun.com',
    branch: 'master'
  },
  {
    id: 'p-002',
    name: 'Frontend-React-Build',
    lastRunId: 15,
    lastRunStatus: 'success',
    lastRunTime: '2025-12-06 14:20',
    duration: '2m 12s',
    author: 'admin@aliyun.com',
    branch: 'feature/new-ui'
  }
];

export const MOCK_LOGS_JAVA = [
  "[executionStep begins at 2025-12-06 19:35:27]",
  "[Build Cluster Info]",
  ">> Cluster Name   : Cloud Beijing Build Cluster",
  "[Build Machine Info]:",
  ">> OS             : linux",
  ">> Arch           : amd64",
  ">> Hostname       : build-job-417458194-k74mn",
  "[Build Job Info]:",
  ">> ID             : 9b34299d-33cb-4de0-80e1-2574c39c51ba",
  ">> ParentID       : a65da666-f3e5-4b7c-af1e-a202880a2fae",
  ">> Namespace      : be-08gtr9g3d1sliabfbcp8sjj5",
  ">> Executor       : Node",
  "[Container Image]:",
  ">> ID             : build-steps-public-registry.cn-beijing.cr.aliyuncs.com/build-steps/alinux3:latest",
  "[Flow Step]:",
  ">> Start downloading flow steps: Cache_production@v1.0.13, JavaP3CScan_production@v1.2.0",
  ">> [Cache_production@v1.0.13] Download step from http://steps-cn-beijing.oss-cn-beijing-internal.aliyuncs.com/steps/Cache_production_production/v1.0.13/code.tgz?",
  "Expires=1765035306&OSSAccessKeyId=LTAI5tD73GwJz6t9q3A3oFMk&Signature=0t3Mow%2Fg9p7w8DpSnHz9a3oqeCg%3D",
  ">> [Cache_production@v1.0.13] Download step successfully, time cost 30.498272ms",
  ">> [JavaP3CScan_production@v1.2.0] Download step from http://steps-cn-beijing.oss-cn-beijing-internal.aliyuncs.com/steps/JavaP3CScan_production_production/v1.2.0/code.tgz?",
  ">> [JavaP3CScan_production@v1.2.0] Download step successfully, time cost 1.50317875s",
  ">> [Cache_production@v1.0.13] Step already exists, skip download",
  "------------------------------------------------------------------------",
  "BUILD FAILURE",
  "------------------------------------------------------------------------",
  "Total time:  0.074 s",
  "Finished at: 2025-12-06T19:35:21+08:00",
  "[ERROR] The goal you specified requires a project to execute but there is no POM in this directory.",
];

export const DEFAULT_PIPELINE_DETAIL: PipelineDetail = {
  ...MOCK_PIPELINES[0],
  stages: [
    {
      id: 'stage-test',
      name: 'Test',
      jobs: [
        {
          id: 'job-scan',
          name: 'Java Code Scan',
          status: 'success',
          duration: '1m 5s',
          type: 'scan',
          logs: MOCK_LOGS_JAVA,
          stats: { errors: 0, warnings: 0, info: 0 }
        },
        {
          id: 'job-unit',
          name: 'Maven Unit Test',
          status: 'failed',
          duration: '17s',
          type: 'test',
          logs: MOCK_LOGS_JAVA
        }
      ]
    },
    {
      id: 'stage-build',
      name: 'Build',
      jobs: [
        {
          id: 'job-build-java',
          name: 'Java Build',
          status: 'pending',
          duration: '0s',
          type: 'build',
          logs: []
        }
      ]
    },
    {
      id: 'stage-deploy',
      name: 'Deploy',
      jobs: [
        {
          id: 'job-deploy',
          name: 'Deploy to K8s',
          status: 'pending',
          duration: '0s',
          type: 'deploy',
          logs: []
        }
      ]
    }
  ]
};

export const TEMPLATES = [
    { 
      name: 'Java', 
      desc: 'Java Spring Boot', 
      icon: '☕',
      stages: [
        {
          id: 't-java-s1', name: 'Code Check', width: 300, jobs: [
            { id: 'j-java-scan', name: 'Java Code Scan', type: 'scan', status: 'pending', logs: [] },
            { id: 'j-java-pmd', name: 'PMD Check', type: 'scan', status: 'pending', logs: [] }
          ]
        },
        {
          id: 't-java-s2', name: 'Build & Test', width: 300, jobs: [
            { id: 'j-java-mvn', name: 'Maven Build', type: 'build', status: 'pending', logs: [] },
            { id: 'j-java-unit', name: 'Unit Tests', type: 'test', status: 'pending', logs: [] }
          ]
        },
        {
          id: 't-java-s3', name: 'Deploy', width: 300, jobs: [
            { id: 'j-java-deploy', name: 'Deploy to K8s', type: 'deploy', status: 'pending', logs: [] }
          ]
        }
      ] as Stage[]
    },
    { 
      name: 'Node.js', 
      desc: 'React/Vue Build', 
      icon: '🟢',
      stages: [
        {
          id: 't-node-s1', name: 'Install', width: 300, jobs: [
            { id: 'j-node-install', name: 'NPM Install', type: 'build', status: 'pending', logs: [] }
          ]
        },
        {
          id: 't-node-s2', name: 'Check', width: 300, jobs: [
            { id: 'j-node-lint', name: 'ESLint', type: 'scan', status: 'pending', logs: [] },
            { id: 'j-node-test', name: 'Jest Tests', type: 'test', status: 'pending', logs: [] }
          ]
        },
        {
          id: 't-node-s3', name: 'Build', width: 300, jobs: [
            { id: 'j-node-build', name: 'Webpack Build', type: 'build', status: 'pending', logs: [] }
          ]
        }
      ] as Stage[]
    },
    { 
      name: 'Go', 
      desc: 'Go Microservice', 
      icon: '🐹',
      stages: [
        {
          id: 't-go-s1', name: 'Build', width: 300, jobs: [
            { id: 'j-go-build', name: 'Go Build', type: 'build', status: 'pending', logs: [] }
          ]
        },
        {
          id: 't-go-s2', name: 'Test', width: 300, jobs: [
            { id: 'j-go-test', name: 'Go Test', type: 'test', status: 'pending', logs: [] },
            { id: 'j-go-lint', name: 'GolangCI-Lint', type: 'scan', status: 'pending', logs: [] }
          ]
        }
      ] as Stage[]
    },
    { 
      name: 'Python', 
      desc: 'Django/Flask', 
      icon: '🐍',
      stages: [
        {
            id: 't-py-s1', name: 'Dependencies', width: 300, jobs: [
                { id: 'j-py-install', name: 'Pip Install', type: 'build', status: 'pending', logs: [] }
            ]
        },
        {
            id: 't-py-s2', name: 'Test', width: 300, jobs: [
                { id: 'j-py-test', name: 'PyTest', type: 'test', status: 'pending', logs: [] },
                { id: 'j-py-flake8', name: 'Flake8', type: 'scan', status: 'pending', logs: [] }
            ]
        }
      ] as Stage[]
    },
    { name: 'PHP', desc: 'Laravel/Symfony', icon: '🐘' },
    { name: '.NET', desc: 'ASP.NET Core', icon: '🔷' },
];

export const MOCK_HISTORY = [
    { runId: 3, status: 'running', message: 'Merge pull request #42', trigger: 'ap7430v1p@aliyun.com', duration: 'Running', time: '2025-12-06 19:40', branch: 'master', commitId: '8a2b1c' },
    { runId: 2, status: 'failed', message: 'Update README.md', trigger: 'ap7430v1p@aliyun.com', duration: '1m 5s', time: '2025-12-06 19:35', branch: 'master', commitId: '7b3c2d' },
    { runId: 1, status: 'failed', message: 'Initial commit', trigger: 'ap7430v1p@aliyun.com', duration: '1m 21s', time: '2025-12-06 19:21', branch: 'master', commitId: '6c4d3e' },
    { runId: 10, status: 'success', message: 'Fix build script', trigger: 'dev@aliyun.com', duration: '2m 10s', time: '2025-12-05 14:20', branch: 'develop', commitId: '5d5e4f' },
];