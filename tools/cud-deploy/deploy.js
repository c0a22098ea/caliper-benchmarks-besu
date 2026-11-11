'use strict';

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_NETWORKCONFIG = path.join(ROOT, 'networks', 'besu', '4node', 'networkconfig.json');
const NETWORKCONFIG = process.env.NETWORKCONFIG_PATH
    ? path.resolve(ROOT, process.env.NETWORKCONFIG_PATH)
    : DEFAULT_NETWORKCONFIG;
const CONTRACT_SOL = path.join(ROOT, 'src', 'ethereum', 'cud', 'CreateUpdateDeleteNFT.sol');
const CONTRACT_KEY = process.env.CALIPER_CONTRACT_KEY || 'databaseTransaction';

function createProvider(url) {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
        return new ethers.WebSocketProvider(url);
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return new ethers.JsonRpcProvider(url);
    }

    throw new Error(`Unsupported ethereum.url protocol in ${NETWORKCONFIG}: ${url}`);
}

function readJson(jsonPath) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4) + '\n');
}

function compile() {
    const source = fs.readFileSync(CONTRACT_SOL, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'CreateUpdateDeleteNFT.sol': { content: source }
        },
        settings: {
            optimizer: { enabled: true, runs: 200 },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object']
                }
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors && output.errors.length) {
        const fatal = output.errors.filter(e => e.severity === 'error');
        for (const e of output.errors) {
            // Keep this noisy on purpose; deployment failures are otherwise opaque.
            console.error(e.formattedMessage || e.message);
        }
        if (fatal.length) {
            throw new Error(`Solidity compilation failed with ${fatal.length} error(s)`);
        }
    }

    const contract = output.contracts['CreateUpdateDeleteNFT.sol']?.CreateUpdateDeleteNFT;
    if (!contract) {
        throw new Error('Compiled contract not found: CreateUpdateDeleteNFT');
    }

    const abi = contract.abi;
    const bytecodeObject = contract.evm?.bytecode?.object;
    if (!bytecodeObject || bytecodeObject.length === 0) {
        throw new Error('Empty bytecode from compiler output');
    }

    return { abi, bytecode: '0x' + bytecodeObject };
}

async function main() {
    const cfg = readJson(NETWORKCONFIG);
    const url = cfg.ethereum?.url;
    const privateKey = cfg.ethereum?.contractDeployerAddressPrivateKey;

    if (!url) {
        throw new Error(`Missing ethereum.url in ${NETWORKCONFIG}`);
    }
    if (!privateKey) {
        throw new Error(`Missing ethereum.contractDeployerAddressPrivateKey in ${NETWORKCONFIG}`);
    }

    const { abi, bytecode } = compile();

    const provider = createProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`RPC: ${url}`);
    console.log(`Deployer: ${await wallet.getAddress()}`);

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log('Deploying CreateUpdateDeleteNFT...');
    const contract = await factory.deploy('CUDToken', 'CUD');

    console.log('Waiting for deployment transaction...');
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const txHash = contract.deploymentTransaction()?.hash;

    console.log(`Deployed at: ${address}`);
    if (txHash) {
        console.log(`TxHash: ${txHash}`);
    }

    // Patch networkconfig.json so Caliper can use the deployed contract.
    if (!cfg.ethereum.contracts) {
        cfg.ethereum.contracts = {};
    }
    if (!cfg.ethereum.contracts[CONTRACT_KEY]) {
        cfg.ethereum.contracts[CONTRACT_KEY] = {};
    }

    cfg.ethereum.contracts[CONTRACT_KEY].address = address;
    cfg.ethereum.contracts[CONTRACT_KEY].abi = abi;
    writeJson(NETWORKCONFIG, cfg);

    console.log(`Updated network config: ${NETWORKCONFIG} (contracts.${CONTRACT_KEY}.address)`);

    // Best effort close.
    try {
        if (typeof provider.destroy === 'function') {
            await provider.destroy();
        }
    } catch (_) {
        // ignore
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
