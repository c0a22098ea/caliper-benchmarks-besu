'use strict';

const ConventionalBase =
    require('../utils/conventional-base');

class Case01CreateCreate
    extends ConventionalBase {

    async submitTransaction() {
        /*
         * 未作成Token
         */
        const tokenId =
            this.reserveNewTokenId();

        /*
         * 同一Token ID・同一URIへのCreate
         */
        const uri =
            `ipfs://case01-${tokenId}`;

        const create1 =
            this.createMintRequest(
                tokenId,
                uri
            );

        const create2 =
            this.createMintRequest(
                tokenId,
                uri
            );

        return this.executePair(
            'Conventional 01 Create vs Create',
            create1,
            create2,
            `Token ID: ${tokenId}`
        );
    }
}

function createWorkloadModule() {
    return new Case01CreateCreate();
}

module.exports.createWorkloadModule =
    createWorkloadModule;