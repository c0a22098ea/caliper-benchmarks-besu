'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case06UpdateDelete extends ConventionalBase {
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
            `ipfs://case06-update-${tokenId}`,
            2
        );

        const deleteRequest = this.createDeleteRequest(tokenId);

        return this.executePair(
            'Conventional 06 Update vs Delete',
            updateRequest,
            deleteRequest,
            `Existing Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case06UpdateDelete();
}

module.exports.createWorkloadModule = createWorkloadModule;