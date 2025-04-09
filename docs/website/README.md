# NeuralLog Auth Documentation Website

This directory contains the configuration for the NeuralLog Auth documentation website.

## Overview

The documentation website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator that makes it easy to create and maintain documentation websites.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Install dependencies:

```bash
cd website
npm install
```

### Local Development

Start the local development server:

```bash
npm start
```

This will start a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

### Build

Build the website for production:

```bash
npm run build
```

This will generate static content in the `build` directory that can be served using any static content hosting service.

### Deployment

#### GitHub Pages (Automated)

The documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment is handled by a GitHub Actions workflow defined in `.github/workflows/docs-deploy.yml`.

The live documentation can be accessed at: https://neurallog.github.io/auth/

#### Manual Deployment to GitHub Pages

If you need to deploy manually:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

This command is a convenient way to build the website and push to the `gh-pages` branch.

#### Vercel Deployment

To deploy to Vercel:

1. Import your GitHub repository in Vercel
2. Configure the project with these settings:
   - Framework Preset: Docusaurus 2
   - Root Directory: docs/website
   - Build Command: npm run build
   - Output Directory: build

After deployment, you'll get a URL like: https://neurallog-auth-docs.vercel.app

Other deployment options include Netlify, AWS S3, and Azure Static Web Apps. See the [Docusaurus deployment documentation](https://docusaurus.io/docs/deployment) for more information.

## Structure

The website is structured as follows:

```
website/
├── blog/                 # Blog posts
├── docs/                 # Documentation
│   ├── api/              # API reference
│   ├── architecture/     # Architecture documentation
│   ├── deployment/       # Deployment guides
│   ├── guides/           # User guides
│   └── sdk/              # SDK documentation
├── src/                  # Source code
│   ├── components/       # React components
│   ├── css/              # CSS files
│   └── pages/            # Custom pages
├── static/               # Static files
│   ├── img/              # Images
│   └── diagrams/         # Diagrams
├── docusaurus.config.js  # Docusaurus configuration
├── sidebars.js           # Sidebar configuration
└── package.json          # npm/yarn configuration
```

## Customization

### Configuration

The website can be customized by editing the `docusaurus.config.js` file:

```js
module.exports = {
  title: 'NeuralLog Auth',
  tagline: 'Secure, scalable, multi-tenant authorization for NeuralLog',
  url: 'https://auth.neurallog.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'neurallog',
  projectName: 'neurallog-auth',
  // ...
};
```

### Sidebars

The sidebar can be customized by editing the `sidebars.js` file:

```js
module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'guides/introduction',
        'guides/quick-start',
        'guides/key-concepts',
        'guides/installation',
      ],
    },
    // ...
  ],
};
```

### Theme

The theme can be customized by editing the `src/css/custom.css` file:

```css
:root {
  --ifm-color-primary: #25c2a0;
  --ifm-color-primary-dark: #21af90;
  --ifm-color-primary-darker: #1fa588;
  --ifm-color-primary-darkest: #1a8870;
  --ifm-color-primary-light: #29d5b0;
  --ifm-color-primary-lighter: #32d8b4;
  --ifm-color-primary-lightest: #4fddbf;
}
```

## Contributing

Contributions to the documentation website are welcome! Please see the [contribution guidelines](../guides/contributing.md) for more information.

## License

The documentation website is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
