#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const directory = process.argv[2] || '.';
const output = path.resolve('dependency-reports', directory === '.' ? 'root' : directory.replaceAll('/', '-'));
fs.mkdirSync(output, { recursive: true });
let failed = false;
function report(name, args) {
    const result = spawnSync('npm', args, {
        cwd: directory, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    });
    fs.writeFileSync(path.join(output, `${name}.json`), result.stdout || '{}');
    if (result.stderr) process.stderr.write(result.stderr);
    let data;
    try { data = JSON.parse(result.stdout); } catch {
        throw new Error(`npm ${name} did not return valid JSON: ${result.error || result.status}`);
    }
    if (result.error || ![0, 1].includes(result.status) || data.error) {
        throw new Error(`npm ${name} failed: ${JSON.stringify(data.error || result.error || result.status)}`);
    }
    return { data, status: result.status };
}

try {
    const audit = report('audit', ['audit', '--json', '--audit-level=high']);
    const counts = audit.data.metadata?.vulnerabilities;
    if (!counts) throw new Error('npm audit returned no vulnerability counts');
    const outdated = report('outdated', ['outdated', '--json', '--long']);
    const lock = JSON.parse(fs.readFileSync(path.join(directory, 'package-lock.json'), 'utf8'));
    fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(lock.packages, null, 2));
    const rows = ['info', 'low', 'moderate', 'high', 'critical']
        .map(level => `| ${level} | ${counts[level] || 0} |`).join('\n');
    const updates = Object.entries(outdated.data).map(([name, item]) => `| ${name} | ${item.current || 'not installed'} | ${item.wanted || '-'} | ${item.latest || '-'} |`).join('\n');
    const summary = `## Dependencies: ${directory}\n\n| Severity | Count |\n| --- | ---: |\n${rows}\n\nUpdate candidates: ${Object.keys(outdated.data).length}\n\n| Package | Current | Wanted | Latest |\n| --- | --- | --- | --- |\n${updates}\n\nFull audit, update candidates, and locked dependency inventory are available in the workflow artifact.\n`;
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    failed = audit.status !== 0;
} catch (error) {
    console.error(error.message);
    failed = true;
}
process.exitCode = failed ? 1 : 0;
