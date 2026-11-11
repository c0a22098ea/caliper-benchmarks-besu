'use strict';

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

const root = path.resolve(__dirname, '../..');
const configPath = path.resolve(root, process.env.NETWORKCONFIG_PATH || 'networks/besu/4node/networkconfig.json');
const artifactPath = path.resolve(root, process.env.MIDDLEWARE_ARTIFACT || 'src/besu/Middleware.json');

async function main() {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    if (artifact.contractName !== 'Middleware' || !artifact.bytecode || !artifact.deployedBytecode) {
        throw new Error('A compiled Middleware artifact with deployment and runtime bytecode is required');
    }
    const web3 = new Web3(config.ethereum.url);
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== Number(config.ethereum.chainId)) {
        throw new Error(`Chain ID mismatch: RPC=${chainId}, config=${config.ethereum.chainId}`);
    }
    const signer = web3.eth.accounts.wallet.add(config.ethereum.contractDeployerAddressPrivateKey);
    if (signer.address.toLowerCase() !== config.ethereum.contractDeployerAddress.toLowerCase()) {
        throw new Error('Deployer address does not match signing key');
    }
    const deployment = new web3.eth.Contract(artifact.abi).deploy({
        data: artifact.bytecode,
        arguments: ['Middleware Test', 'MWT']
    });
    const gasPrice = await web3.eth.getGasPrice();
    const estimated = await deployment.estimateGas({ from: signer.address });
    console.log(`Deploying Middleware on chain ${chainId}, estimated gas ${estimated}`);
    const contract = await deployment.send({ from: signer.address, gas: Math.ceil(estimated * 1.2), gasPrice })
        .on('transactionHash', hash => console.log(`Transaction: ${hash}`));
    const address = contract.options.address;
    const code = await web3.eth.getCode(address);
    if (code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) {
        throw new Error(`Runtime verification failed at ${address}; configuration was not updated`);
    }
    config.ethereum.contracts.Middleware = {
        ...config.ethereum.contracts.Middleware,
        address,
        abi: artifact.abi
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4) + '\n');
    console.log(`Verified Middleware: ${address}`);
    console.log(`Updated Middleware address and ABI in ${configPath}`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
