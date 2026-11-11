'use strict';

const OperationBase = require('./operation-base');

class ConventionalBase extends OperationBase {
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

        this.roundArguments = roundArguments;
        this.roundIndex = roundIndex;

        this.contractName = 'BaselineERC721';
        this.toAddress = '0xd1cf9d73a91de6630c2bb068ba5fddf9f0deac09';

        this.existingTokenIds = [];
        this.operationIndex = 0;
        this.prepareCount = Number(roundArguments.prepareCount ?? 10);

        this.nextTokenIdCursor = await this.fetchNextTokenId();

        console.log(
            `[Conventional] initial nextTokenId = ${this.nextTokenIdCursor}`
        );
    }

    async fetchNextTokenId() {
        const request = {
            contract: this.contractName,
            verb: 'getNextTokenId',
            args: [],
            readOnly: true
        };

        const result = await this.sutAdapter.sendRequests(request);
        const status = Array.isArray(result) ? result[0] : result;

        if (!status || typeof status.GetResult !== 'function') {
            throw new Error('Failed to get next Token ID');
        }

        const rawResult = status.GetResult();
        const tokenId = Number(rawResult.toString());

        if (!Number.isFinite(tokenId)) {
            throw new Error(`Invalid Token ID returned: ${rawResult}`);
        }

        return tokenId;
    }

    reserveNewTokenId() {
        const tokenId = this.nextTokenIdCursor;
        this.nextTokenIdCursor++;

        return tokenId;
    }

    createTraditionalRequest(verb, args, readOnly = false) {
        return {
            contract: this.contractName,
            verb,
            args,
            readOnly
        };
    }

    createMintRequest(tokenId, uri) {
        return this.createTraditionalRequest(
            'safeMint',
            [this.toAddress, tokenId, uri]
        );
    }

    createUpdateRequest(tokenId, uri, version) {
        return this.createTraditionalRequest(
            'updateTokenURI',
            [tokenId, uri, version]
        );
    }

    createDeleteRequest(tokenId) {
        return this.createTraditionalRequest(
            'deleteNFT',
            [tokenId]
        );
    }

    async prepareExistingTokens(count) {
        if (count <= 0) {
            return;
        }

        const firstTokenId = this.nextTokenIdCursor;

        for (let i = 0; i < count; i++) {
            const tokenId = this.reserveNewTokenId();

            const request = this.createMintRequest(
                tokenId,
                `ipfs://setup-${this.roundIndex}-${tokenId}`
            );

            const result = await this.sutAdapter.sendRequests(request);
            const status = Array.isArray(result) ? result[0] : result;

            if (this.getTxStatus(status) === 'failed') {
                throw new Error(`Failed to prepare Token ID ${tokenId}`);
            }

            this.existingTokenIds.push(tokenId);
        }

        console.log(
            `[Conventional] prepared tokens: ${firstTokenId} - ${this.nextTokenIdCursor - 1}`
        );
    }

    reserveExistingTokenId() {
        if (this.operationIndex >= this.existingTokenIds.length) {
            throw new Error(
                `No prepared token available: index=${this.operationIndex}, prepared=${this.existingTokenIds.length}`
            );
        }

        const tokenId = this.existingTokenIds[this.operationIndex];
        this.operationIndex++;

        return tokenId;
    }

    getTxStatus(txStatus) {
        if (!txStatus) {
            return 'unknown';
        }

        if (typeof txStatus.GetStatus === 'function') {
            return txStatus.GetStatus();
        }

        if (
            txStatus.status &&
            typeof txStatus.status.status === 'string'
        ) {
            return txStatus.status.status;
        }

        return 'unknown';
    }

    async executePair(label, req1, req2, targetInfo) {
        console.log(`\n[${label}] ${targetInfo}`);

        const result = await this.sutAdapter.sendRequests([
            req1,
            req2
        ]);

        const results = Array.isArray(result) ? result : [result];

        console.log(`[${label}] OP1: ${this.getTxStatus(results[0])}`);
        console.log(`[${label}] OP2: ${this.getTxStatus(results[1])}`);

        return result;
    }
}

module.exports = ConventionalBase;