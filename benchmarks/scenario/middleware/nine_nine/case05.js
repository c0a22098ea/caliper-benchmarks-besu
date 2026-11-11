'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case05UpdateUpdate extends OperationBase {
    constructor() { super(); this.contexts = new Map(); }
    createSimpleState() { return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID + 300 * 4;

        if (!this.contexts.has(targetTokenId)) {
            const context = new TokenContext(targetTokenId, this);

            context.initializeCreatedState(
                1,
                mintArgs._tokenURI
            );

            this.contexts.set(targetTokenId, context);
        }

    const context = this.contexts.get(targetTokenId);

        // OP-1: 正常な更新処理 (version 1 -> version 2)
        const req1 = { 
            scenarioId: 'OP-1 (updateTokenURI-v2)', 
            opType: 'update', 
            nextVersion: 2, 
            verb: 'updateTokenURI', 
            args: { tokenId: targetTokenId, newURI: 'ipfs://cid-v2', newVersion: 2 } 
        };

        // OP-2: 古いバージョン(version 1)での逆行更新リクエスト (即時リジェクトされるべき)
        const req2 = { 
            scenarioId: 'OP-2 (updateTokenURI-v1)', 
            currentScenario: '05. Update vs Update', 
            opType: 'update', 
            nextVersion: 1, 
            verb: 'updateTokenURI', 
            args: { tokenId: targetTokenId, newURI: 'ipfs://cid-v1-old', newVersion: 1 } 
        };

        console.log(`\n[Test 05] Update vs Update | Target Token ID: ${targetTokenId}`);
        const results = await Promise.all([context.processOperation(req1), context.processOperation(req2)]);
        return results[0];
    }
}

module.exports.createWorkloadModule = () => new Case05UpdateUpdate();