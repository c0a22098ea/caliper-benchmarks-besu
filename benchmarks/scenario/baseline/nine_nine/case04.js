'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case04UpdateCreate extends ConventionalBase {
    async initializeWorkloadModule(
        workerIndex,
        totalWorkers,
        roundIndex,
        roundArguments,
        sutAdapter,
        sutContext
    ) {
        await super.initializeWorkloadModule(
            workerIndex,
            totalWorkers,
            roundIndex,
            roundArguments,
            sutAdapter,
            sutContext
        );

        await this.prepareExistingTokens(this.prepareCount);
    }

    async submitTransaction() {
        const tokenId = this.reserveExistingTokenId();

        const updateRequest = this.createUpdateRequest(
            tokenId,
            `ipfs://case04-update-${tokenId}`,
            2
        );

        const createRequest = this.createMintRequest(
            tokenId,
            `ipfs://case04-create-${tokenId}`
        );

        return this.executePair(
            'Conventional 04 Update vs Create',
            updateRequest,
            createRequest,
            `Existing Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case04UpdateCreate();
}

module.exports.createWorkloadModule = createWorkloadModule;