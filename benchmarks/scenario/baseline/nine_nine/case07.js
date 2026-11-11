'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case08DeleteUpdate extends ConventionalBase {
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

        const deleteRequest = this.createDeleteRequest(tokenId);

        const updateRequest = this.createUpdateRequest(
            tokenId,
            `ipfs://case08-update-${tokenId}`,
            2
        );

        return this.executePair(
            'Conventional 08 Delete vs Update',
            deleteRequest,
            updateRequest,
            `Existing Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case08DeleteUpdate();
}

module.exports.createWorkloadModule = createWorkloadModule;