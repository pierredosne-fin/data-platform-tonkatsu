import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '7df'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '9e2'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'd87'),
            routes: [
              {
                path: '/docs/api/rest-api',
                component: ComponentCreator('/docs/api/rest-api', '183'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/api/socket-events',
                component: ComponentCreator('/docs/api/socket-events', '8b2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/agent-workspace',
                component: ComponentCreator('/docs/architecture/agent-workspace', 'e49'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/client',
                component: ComponentCreator('/docs/architecture/client', '7f2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/overview',
                component: ComponentCreator('/docs/architecture/overview', '304'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/server',
                component: ComponentCreator('/docs/architecture/server', '604'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/examples/first-agent',
                component: ComponentCreator('/docs/examples/first-agent', '5a2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/examples/multi-agent-team',
                component: ComponentCreator('/docs/examples/multi-agent-team', 'c6d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/examples/repo-backed-agent',
                component: ComponentCreator('/docs/examples/repo-backed-agent', 'd4f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/examples/scheduled-tasks',
                component: ComponentCreator('/docs/examples/scheduled-tasks', 'd95'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/getting-started',
                component: ComponentCreator('/docs/getting-started', '565'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', 'a6e'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
