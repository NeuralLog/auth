// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'NeuralLog Auth',
  tagline: 'Secure, scalable, multi-tenant authorization for NeuralLog',
  url: 'https://neurallog.github.io',
  baseUrl: '/auth/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'neurallog', // Usually your GitHub org/user name.
  projectName: 'neurallog-auth', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/neurallog/neurallog-auth/edit/main/docs/website/',
          path: '../',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/neurallog/neurallog-auth/edit/main/docs/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'NeuralLog Auth',
        logo: {
          alt: 'NeuralLog Auth Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'guides/introduction',
            position: 'left',
            label: 'Docs',
          },
          {
            type: 'doc',
            docId: 'api/auth-api',
            position: 'left',
            label: 'API',
          },
          {
            type: 'doc',
            docId: 'sdk/typescript',
            position: 'left',
            label: 'SDK',
          },
          {
            href: 'https://github.com/neurallog/neurallog-auth',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/guides/introduction',
              },
              {
                label: 'Quick Start',
                to: '/docs/guides/quick-start',
              },
              {
                label: 'API Reference',
                to: '/docs/api/auth-api',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/neurallog',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/neurallog',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/neurallog',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/neurallog/neurallog-auth',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} NeuralLog. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
