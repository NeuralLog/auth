#!/usr/bin/env node

/**
 * Script to generate a complete OpenAPI schema from component files
 * 
 * This script:
 * 1. Reads the base OpenAPI schema from src/openapi.yaml
 * 2. Reads component schemas from src/openapi/components/*.yaml
 * 3. Reads API paths from src/openapi/paths/*.yaml
 * 4. Combines them into a complete OpenAPI schema
 * 5. Writes the result to src/openapi.yaml
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const BASE_OPENAPI_PATH = path.resolve(__dirname, '../src/openapi.yaml');
const COMPONENTS_DIR = path.resolve(__dirname, '../src/openapi/components');
const PATHS_DIR = path.resolve(__dirname, '../src/openapi/paths');
const OUTPUT_PATH = path.resolve(__dirname, '../src/openapi.yaml');

// Read base OpenAPI schema
console.log('Reading base OpenAPI schema from', BASE_OPENAPI_PATH);
const baseOpenApi = yaml.load(fs.readFileSync(BASE_OPENAPI_PATH, 'utf8'));

// Initialize components and paths
if (!baseOpenApi.components) {
  baseOpenApi.components = {};
}
if (!baseOpenApi.components.schemas) {
  baseOpenApi.components.schemas = {};
}
if (!baseOpenApi.paths) {
  baseOpenApi.paths = {};
}

// Read component schemas
console.log('Reading component schemas from', COMPONENTS_DIR);
const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter(file => file.endsWith('.yaml'));
for (const file of componentFiles) {
  console.log(`Processing component file: ${file}`);
  const componentPath = path.join(COMPONENTS_DIR, file);
  const component = yaml.load(fs.readFileSync(componentPath, 'utf8'));
  
  // Add component schemas to the OpenAPI schema
  Object.assign(baseOpenApi.components.schemas, component);
}

// Read API paths
console.log('Reading API paths from', PATHS_DIR);
const pathFiles = fs.readdirSync(PATHS_DIR).filter(file => file.endsWith('.yaml'));
for (const file of pathFiles) {
  console.log(`Processing path file: ${file}`);
  const pathFilePath = path.join(PATHS_DIR, file);
  const paths = yaml.load(fs.readFileSync(pathFilePath, 'utf8'));
  
  // Add paths to the OpenAPI schema
  Object.assign(baseOpenApi.paths, paths);
}

// Write the complete OpenAPI schema
console.log('Writing complete OpenAPI schema to', OUTPUT_PATH);
fs.writeFileSync(OUTPUT_PATH, yaml.dump(baseOpenApi, { lineWidth: -1 }));
console.log('Done!');
