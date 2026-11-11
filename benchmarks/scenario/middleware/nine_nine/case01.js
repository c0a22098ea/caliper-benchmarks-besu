'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case01CreateCreate extends OperationBase {
    constructor() {
        super();
        this.contexts = new Map();
    }

    createSimpleState() {
        return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers);
    }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID;

        if (!this.contexts.has(targetTokenId)) {
            this.contexts.set(targetTokenId, new TokenContext(targetTokenId, this));
        }
        const context = this.contexts.get(targetTokenId);

        const req1 = { 
            scenarioId: 'OP-1 (safeMint)', 
            opType: 'create', 
            nextVersion: 1, 
            verb: 'safeMint', 
            args: { tokenId: targetTokenId, to: mintArgs.to, tokenURI_: mintArgs._tokenURI } 
        };

        // ★ currentScenario を追加して他ケースとプロパティを揃える
        const req2 = { 
            scenarioId: 'OP-2 (safeMint-Interrupt)', 
            currentScenario: '01. Create vs Create', 
            opType: 'create', 
            nextVersion: 1, 
            verb: 'safeMint', 
            args: { tokenId: targetTokenId, to: mintArgs.to, tokenURI_: 'ipfs://cid-interrupt' } 
        };

        console.log(`\n[Test 01] Create vs Create | Token ID: ${targetTokenId}`);
        const results = await Promise.all([
            context.processOperation(req1), 
            context.processOperation(req2)
        ]);

        return results[0]; 
    }
}

module.exports.createWorkloadModule = () => new Case01CreateCreate();