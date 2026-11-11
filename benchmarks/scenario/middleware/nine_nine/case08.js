'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case08DeleteUpdate extends OperationBase {
    constructor() { 
        super(); 
        this.contexts = new Map(); 
    }

    createSimpleState() { 
        return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); 
    }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID + 300 * 7;

        if (!this.contexts.has(targetTokenId)) {
            const context = new TokenContext(targetTokenId, this);

            context.initializeCreatedState(
                1,
                mintArgs._tokenURI
            );

            this.contexts.set(targetTokenId, context);
        }
        const context = this.contexts.get(targetTokenId);

        const req1 = { 
            scenarioId: 'OP-1 (deleteNFT)', 
            opType: 'delete', 
            nextVersion: 99, 
            verb: 'deleteNFT', 
            args: { tokenId: targetTokenId } 
        };

        const req2 = { 
            scenarioId: 'OP-2 (updateTokenURI-AfterDelete)', 
            currentScenario: '08. Delete vs Update', 
            opType: 'update', 
            nextVersion: 2, 
            verb: 'updateTokenURI', 
            args: { tokenId: targetTokenId, newURI: 'ipfs://cid-after-delete', newVersion: 2 } 
        };

        console.log(`\n[Test 08] Delete vs Update | Target Token ID: ${targetTokenId}`);

        // ★ 他のケース(04等)と全く同じ集計ロジックに統一
        const results = await Promise.all([
            context.processOperation(req1), 
            context.processOperation(req2)
        ]);

        return results[0];
    }
}

module.exports.createWorkloadModule = () => new Case08DeleteUpdate();