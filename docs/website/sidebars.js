/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'guides/introduction',
        'guides/quick-start',
        'guides/key-concepts',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/authorization-model',
        'architecture/multi-tenant-design',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/auth-api',
        'api/tenant-api',
      ],
    },
    {
      type: 'category',
      label: 'SDK Documentation',
      items: [
        'sdk/typescript',
        'sdk/typescript-core',
        'sdk/typescript-tenant',
        'sdk/typescript-user',
        'sdk/typescript-middleware',
        'sdk/typescript-advanced',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
        'deployment/kubernetes',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'guides/integrating-with-server',
        'guides/implementing-rbac',
        'guides/managing-tenant-permissions',
        'guides/tenant-migration',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/security-updates',
        'architecture/security',
      ],
    },
  ],
};

module.exports = sidebars;
