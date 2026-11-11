'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case09DeleteDelete extends OperationBase {
    constructor() { super(); this.contexts = new Map(); }
    createSimpleState() { return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID + 300 * 8;

        if (!this.contexts.has(targetTokenId)) {
            const context = new TokenContext(targetTokenId, this);

            context.initializeCreatedState(
                1,
                mintArgs._tokenURI
            );

            this.contexts.set(targetTokenId, context);
        }
        const context = this.contexts.get(targetTokenId);

        // OP-1: 1回目の削除処理
        const req1 = { 
            scenarioId: 'OP-1 (deleteNFT)', 
            opType: 'delete', 
            nextVersion: 99, 
            verb: 'deleteNFT', 
            args: { tokenId: targetTokenId } 
        };

        // OP-2: 重複した2回目の削除要求 (即時拒否されるべき)
        const req2 = { 
            scenarioId: 'OP-2 (deleteNFT-Duplicate)', 
            currentScenario: '09. Delete vs Delete', 
            opType: 'delete', 
            nextVersion: 99, 
            verb: 'deleteNFT', 
            args: { tokenId: targetTokenId } 
        };

        console.log(`\n[Test 09] Delete vs Delete | Target Token ID: ${targetTokenId}`);
        const results = await Promise.all([context.processOperation(req1), context.processOperation(req2)]);
        return results[0];
    }
}

module.exports.createWorkloadModule = () => new Case09DeleteDelete();