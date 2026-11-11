'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');

const CONTRACT = 'Middleware';

class NftMintOnce extends OperationBase {
    constructor() {
        super();
        this.workerIndex = -1;
    }

    createSimpleState() {
        const accountsPerWorker = this.numberOfAccounts / this.totalWorkers;
        return new SimpleState(this.workerIndex, this.tokenId, accountsPerWorker);
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        this.workerIndex = workerIndex;
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
    }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        
        // オフセット計算などを適用する場合（Case04にIDを合わせる）
        const targetTokenId = mintArgs.tokenID + 300 * 5;

        const request = this.createConnectorRequest('safeMint', {
            tokenId: targetTokenId,
            to: mintArgs.to,
            tokenURI_: mintArgs._tokenURI
        }, CONTRACT);

        const result = await this.sutAdapter.sendRequests(request);

        console.log(`[Setup Mint] Worker ${this.workerIndex} | Minted tokenId: ${targetTokenId}`);
        return result;
    }
}

function createWorkloadModule() {
    return new NftMintOnce();
}

module.exports.createWorkloadModule = createWorkloadModule;