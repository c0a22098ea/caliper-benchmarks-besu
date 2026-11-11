'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '../..');
const txNumber = Number(process.env.TX_NUMBER || 10);
const tps = Number(process.env.TPS || 2);
if (!Number.isInteger(txNumber) || txNumber < 1 || txNumber > 300 || !Number.isFinite(tps) || tps <= 0) {
    throw new Error('TX_NUMBER must be an integer from 1 to 300, and TPS must be positive');
}
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-middleware-'));
const config = yaml.load(fs.readFileSync(path.join(root, 'benchmarks/scenario/middleware/config.yaml'), 'utf8'));
const tokenId = Date.now();
config.test.name = 'middleware-besu-smoke';
config.test.rounds.forEach(round => {
    round.txNumber = txNumber;
    round.rateControl.opts.tps = tps;
    round.workload.arguments.tokenId = tokenId;
    round.sleepAfterRound = 2;
});
const benchconfig = path.join(output, 'config.yaml');
fs.writeFileSync(benchconfig, yaml.dump(config));
console.log(`Token base: ${tokenId}; output: ${output}`);
const log = fs.openSync(path.join(output, 'run.log'), 'w');
const result = spawnSync(process.execPath, [
    path.join(root, 'node_modules/@hyperledger/caliper-cli/caliper.js'),
    'launch', 'manager',
    '--caliper-benchconfig', benchconfig,
    '--caliper-networkconfig', path.resolve(root, process.env.NETWORKCONFIG_PATH || 'networks/besu/4node/networkconfig.json'),
    '--caliper-workspace', root,
    '--caliper-flow-skip-install',
    '--caliper-report-path', path.join(output, 'report.html')
], { cwd: output, stdio: ['ignore', log, log] });
fs.closeSync(log);
const logText = fs.readFileSync(path.join(output, 'run.log'), 'utf8');
const tables = [...logText.matchAll(/\+[-+]+\+\n\| Name[^\n]*\n(?:[|+][^\n]*\n)+/g)];
if (tables.length) {
    console.log(tables[tables.length - 1][0]);
}
if (result.error) {
    console.error(result.error.message);
}
console.log(`Review transaction success/failure in ${path.join(output, 'report.html')} and run.log`);
process.exitCode = result.status === null ? 1 : result.status;
if (!process.exitCode) {
    const metricsPath = path.join(output, 'middleware_metrics.txt');
    const metrics = fs.existsSync(metricsPath) ? fs.readFileSync(metricsPath, 'utf8') : '';
    const roundsPassed = config.test.rounds.every(round => {
        const label = round.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = logText.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|\\s*(\\d+)\\s*\\|`));
        return match && Number(match[1]) >= txNumber && Number(match[2]) === 0;
    });
    const preventionPassed = config.test.rounds.filter(round => /^0[1-9]\./.test(round.label)).every(round => {
        const expected = /^(02|03|06)\./.test(round.label) ? 0 : txNumber;
        return metrics.split('\n').some(line => line.startsWith(round.label) &&
            new RegExp(`:\\s*${expected} 件遮断`).test(line));
    });
    if (!roundsPassed || !preventionPassed || !fs.existsSync(path.join(output, 'report.html'))) {
        console.error('Middleware smoke test failed: check transaction results and prevention counts');
        process.exitCode = 1;
    } else {
        console.log('PASS: all scenarios 01–09 succeeded; prevention counts match expectations');
    }
}
