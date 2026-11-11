'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case03CreateDelete extends OperationBase {
    constructor() { super(); this.contexts = new Map(); }
    createSimpleState() { return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID+300*2;
        if (!this.contexts.has(targetTokenId)) this.contexts.set(targetTokenId, new TokenContext(targetTokenId, this));
        const context = this.contexts.get(targetTokenId);

        const req1 = { scenarioId: 'OP-1 (safeMint)', opType: 'create', nextVersion: 1, verb: 'safeMint', args: { tokenId: targetTokenId, to: mintArgs.to, tokenURI_: mintArgs._tokenURI } };
        const req2 = { scenarioId: 'OP-2 (deleteNFT-Interrupt)', currentScenario: '03. Create vs Delete', opType: 'delete', nextVersion: 99, verb: 'deleteNFT', args: { tokenId: targetTokenId } };

        console.log(`\n[Test 03] Create vs Delete | Token ID: ${targetTokenId}`);
        const results = await Promise.all([context.processOperation(req1), context.processOperation(req2)]);
        return results[0];
    }
}
module.exports.createWorkloadModule = () => new Case03CreateDelete();