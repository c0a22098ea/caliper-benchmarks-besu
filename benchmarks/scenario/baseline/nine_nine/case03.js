'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case03CreateDelete extends ConventionalBase {
    async submitTransaction() {
        const tokenId = this.reserveNewTokenId();

        const createRequest = this.createMintRequest(
            tokenId,
            `ipfs://case03-create-${tokenId}`
        );

        const deleteRequest = this.createDeleteRequest(tokenId);

        return this.executePair(
            'Conventional 03 Create vs Delete',
            createRequest,
            deleteRequest,
            `Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case03CreateDelete();
}

module.exports.createWorkloadModule = createWorkloadModule;