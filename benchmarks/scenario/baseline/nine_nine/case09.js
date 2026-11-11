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

        await this.prepareExistingTokens(this.roundArguments.prepareCount);
    }

    async submitTransaction() {
        const targetTokenId = this.reserveExistingTokenId();

        const req1 = this.createDeleteRequest(targetTokenId);
        const req2 = this.createDeleteRequest(targetTokenId);

        return this.executePair(
            'Conventional 09 Delete vs Delete',
            req1,
            req2,
            `Token ID: ${targetTokenId}`
        );
    }
}

module.exports.createWorkloadModule = () => new Case09DeleteDelete();