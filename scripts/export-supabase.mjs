#!/usr/bin/env node
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF || 'umluahqqpoimkbidndll';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const PAGE_SIZE = Number.parseInt(process.env.SUPABASE_EXPORT_PAGE_SIZE || '1000', 10);

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const restUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

const baseHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

const backupRoot = path.resolve(process.cwd(), 'data-export');
await mkdir(backupRoot, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const exportDir = path.join(backupRoot, timestamp);
await mkdir(exportDir, { recursive: true });

const tables = await listTables();
if (!tables.length) {
  console.warn('No tables found to export.');
}

const summary = {
  projectRef: PROJECT_REF,
  supabaseUrl: SUPABASE_URL,
  generatedAt: new Date().toISOString(),
  pageSize: PAGE_SIZE,
  tables: [],
};

for (const table of tables) {
  const rows = await fetchAllRows(table.schema, table.name);
  const safeName = `${table.schema}.${table.name}`.replace(/[^a-z0-9._-]+/gi, '_');
  const jsonPath = path.join(exportDir, `${safeName}.json`);
  const csvPath = path.join(exportDir, `${safeName}.csv`);

  await writeFile(jsonPath, JSON.stringify(rows, null, 2), 'utf8');
  const csvContent = toCsv(rows);
  await writeFile(csvPath, csvContent, 'utf8');

  summary.tables.push({
    schema: table.schema,
    name: table.name,
    rowCount: rows.length,
    jsonFile: path.relative(process.cwd(), jsonPath),
    csvFile: path.relative(process.cwd(), csvPath),
  });

  console.log(`Exported ${table.schema}.${table.name} (${rows.length} rows).`);
}

const summaryPath = path.join(exportDir, 'summary.json');
await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`\nAll exports saved to ${path.relative(process.cwd(), exportDir)}`);

async function listTables() {
  const url = `${restUrl}/pg_tables?select=schemaname,tablename`;
  const response = await fetch(url, {
    headers: {
      ...baseHeaders,
      'Accept-Profile': 'pg_catalog',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list tables: ${response.status} ${response.statusText}\n${text}`);
  }

  const payload = await response.json();
  return payload
    .filter((entry) => entry?.schemaname && entry?.tablename)
    .filter((entry) => !['pg_catalog', 'information_schema'].includes(entry.schemaname))
    .filter((entry) => !entry.tablename.startsWith('pg_') && !entry.tablename.startsWith('sql_'))
    .map((entry) => ({
      schema: entry.schemaname,
      name: entry.tablename,
    }));
}

async function fetchAllRows(schema, table) {
  const rows = [];
  let offset = 0;

  while (true) {
    const rangeFrom = offset;
    const rangeTo = offset + PAGE_SIZE - 1;

    const response = await fetch(`${restUrl}/${encodeURIComponent(table)}?select=*`, {
      headers: {
        ...baseHeaders,
        'Accept-Profile': schema,
        Range: `${rangeFrom}-${rangeTo}`,
        Prefer: 'count=exact',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch rows for ${schema}.${table}: ${response.status} ${response.statusText}\n${text}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch)) {
      throw new Error(`Unexpected response for ${schema}.${table}: ${JSON.stringify(batch)}`);
    }

    rows.push(...batch);

    const contentRange = response.headers.get('content-range');
    if (!contentRange) {
      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
      continue;
    }

    const total = parseContentRangeTotal(contentRange);
    if (total === null || rows.length >= total) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

function parseContentRangeTotal(contentRange) {
  const parts = contentRange.split('/');
  if (parts.length !== 2) {
    return null;
  }
  const total = Number.parseInt(parts[1], 10);
  return Number.isNaN(total) ? null : total;
}

function toCsv(rows) {
  if (!rows.length) {
    return '';
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const header = columns.map((column) => escapeCsvValue(column)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((column) => escapeCsvValue(normaliseValue(row[column])))
      .join(',')
  );

  return [header, ...lines].join('\n');
}

function normaliseValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');
  const needsEscaping = /[",\n\r]/.test(stringValue);
  const safeValue = stringValue.replace(/"/g, '""');
  return needsEscaping ? `"${safeValue}"` : safeValue;
}
