#!/usr/bin/env node

/**
 * Script to generate TypeScript types from OpenAPI schema
 *
 * This script:
 * 1. Reads the OpenAPI schema from src/openapi.yaml
 * 2. Extracts the schema definitions
 * 3. Outputs them to ../typescript-client-sdk/src/types/api.ts
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const OPENAPI_PATH = path.resolve(__dirname, '../src/openapi.yaml');
const TYPES_OUTPUT_PATH = path.resolve(__dirname, '../../typescript-client-sdk/src/types/api.ts');

// Read OpenAPI schema
console.log('Reading OpenAPI schema from', OPENAPI_PATH);
const openApiSchema = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));

// Extract schema definitions
const schemas = openApiSchema.components.schemas;
console.log(`Found ${Object.keys(schemas).length} schema definitions`);

// Generate TypeScript interfaces
let output = `/**
 * API Types
 *
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Generated from OpenAPI schema
 */

`;

// Process each schema
for (const [name, schema] of Object.entries(schemas)) {
  output += `export interface ${name} {\n`;

  // Add required property marker
  const required = schema.required || [];

  // Process properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      // Add JSDoc comment if description exists or format exists
      if (propSchema.description || propSchema.format) {
        output += `  /**\n`;
        if (propSchema.description) {
          output += `   * ${propSchema.description}\n`;
        }
        if (propSchema.format) {
          output += `   * @format ${propSchema.format}\n`;
        }
        output += `   */\n`;
      }

      // Determine if property is required
      const isRequired = required.includes(propName);

      // Determine property type
      let propType = 'any';
      if (propSchema.type === 'string') {
        if (propSchema.enum) {
          propType = propSchema.enum.map(v => `"${v}"`).join(' | ');
        } else {
          propType = 'string';
        }
      } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
        propType = 'number';
      } else if (propSchema.type === 'boolean') {
        propType = 'boolean';
      } else if (propSchema.type === 'array') {
        if (propSchema.items.$ref) {
          const refType = propSchema.items.$ref.split('/').pop();
          propType = `${refType}[]`;
        } else if (propSchema.items.type) {
          propType = `${propSchema.items.type === 'integer' ? 'number' : propSchema.items.type}[]`;
        } else {
          propType = 'any[]';
        }
      } else if (propSchema.type === 'object') {
        if (propSchema.properties) {
          propType = '{\n';
          for (const [subPropName, subPropSchema] of Object.entries(propSchema.properties)) {
            if (subPropSchema.description) {
              propType += `    /** ${subPropSchema.description} */\n`;
            }
            let subPropType = 'any';
            if (subPropSchema.type === 'string') {
              subPropType = 'string';
            } else if (subPropSchema.type === 'integer' || subPropSchema.type === 'number') {
              subPropType = 'number';
            } else if (subPropSchema.type === 'boolean') {
              subPropType = 'boolean';
            }
            propType += `    ${subPropName}${subPropSchema.required ? '' : '?'}: ${subPropType};\n`;
          }
          propType += '  }';
        } else {
          propType = 'Record<string, any>';
        }
      } else if (propSchema.$ref) {
        propType = propSchema.$ref.split('/').pop();
      }

      // Add property to output
      output += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
    }
  }

  output += '}\n\n';
}

// Read existing types from the file
let existingTypes = '';
if (fs.existsSync(TYPES_OUTPUT_PATH)) {
  existingTypes = fs.readFileSync(TYPES_OUTPUT_PATH, 'utf8');

  // Extract existing type names to avoid duplicates
  const existingTypeNames = [];
  const typeRegex = /export\s+interface\s+([A-Za-z0-9_]+)/g;
  let match;
  while ((match = typeRegex.exec(existingTypes)) !== null) {
    existingTypeNames.push(match[1]);
  }

  // Filter out types that already exist
  const outputLines = output.split('\n');
  let filteredOutput = [];
  let currentType = null;
  let skipCurrentType = false;

  for (const line of outputLines) {
    const typeMatch = line.match(/export\s+interface\s+([A-Za-z0-9_]+)/);
    if (typeMatch) {
      currentType = typeMatch[1];
      skipCurrentType = existingTypeNames.includes(currentType);
    }

    if (!skipCurrentType || !line.trim()) {
      filteredOutput.push(line);
    }

    if (line.trim() === '}' && skipCurrentType) {
      skipCurrentType = false;
    }
  }

  output = filteredOutput.join('\n');
}

// Append our output to the existing types
const finalOutput = existingTypes ? existingTypes + '\n\n// Auth Service Types\n' + output : output;

// Write the combined output to the file
fs.writeFileSync(TYPES_OUTPUT_PATH, finalOutput);
console.log(`Types written to ${TYPES_OUTPUT_PATH}`);
