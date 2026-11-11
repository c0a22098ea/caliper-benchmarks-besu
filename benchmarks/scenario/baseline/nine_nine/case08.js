'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case09DeleteDelete extends ConventionalBase {
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

        const deleteRequest1 = this.createDeleteRequest(tokenId);
        const deleteRequest2 = this.createDeleteRequest(tokenId);

        return this.executePair(
            'Conventional 09 Delete vs Delete',
            deleteRequest1,
            deleteRequest2,
            `Existing Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case09DeleteDelete();
}

module.exports.createWorkloadModule = createWorkloadModule;