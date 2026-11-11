'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case05UpdateUpdate extends ConventionalBase {
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

        const updateRequest1 = this.createUpdateRequest(
            tokenId,
            `ipfs://case05-v3-${tokenId}`,
            3
        );

        const updateRequest2 = this.createUpdateRequest(
            tokenId,
            `ipfs://case05-v2-${tokenId}`,
            2
        );

        return this.executePair(
            'Conventional 05 Update vs Update',
            updateRequest1,
            updateRequest2,
            `Existing Token ID: ${tokenId}, Version 2 vs Version 3`
        );
    }
}

function createWorkloadModule() {
    return new Case05UpdateUpdate();
}

module.exports.createWorkloadModule = createWorkloadModule;