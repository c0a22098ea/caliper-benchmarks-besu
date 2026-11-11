'use strict';

const ConventionalBase = require('../utils/conventional-base');

class Case02CreateUpdate extends ConventionalBase {
    async submitTransaction() {
        const tokenId = this.reserveNewTokenId();

        const createRequest = this.createMintRequest(
            tokenId,
            `ipfs://case02-create-${tokenId}`
        );

        const updateRequest = this.createUpdateRequest(
            tokenId,
            `ipfs://case02-update-${tokenId}`,
            2
        );

        return this.executePair(
            'Conventional 02 Create vs Update',
            createRequest,
            updateRequest,
            `Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case02CreateUpdate();
}

module.exports.createWorkloadModule = createWorkloadModule;