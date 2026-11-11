'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case02CreateUpdate extends OperationBase {
    constructor() { super(); this.contexts = new Map(); }
    createSimpleState() { return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID+ 300*1; // ★ workerIndex を加算してトークンIDを分散させる
        if (!this.contexts.has(targetTokenId)) this.contexts.set(targetTokenId, new TokenContext(targetTokenId, this));
        const context = this.contexts.get(targetTokenId);

        // OP-1: 作成 (version 1)
        const req1 = { scenarioId: 'OP-1 (safeMint)', opType: 'create', nextVersion: 1, verb: 'safeMint', args: { tokenId: targetTokenId, to: mintArgs.to, tokenURI_: mintArgs._tokenURI } };
        
        // OP-2: 正常な順序の更新 (version 1 -> version 2)
        // ★ nextVersion を 1 から 2 に変更！ これによりバージョン不整合にならずキューに回ります
        const req2 = { scenarioId: 'OP-2 (updateURI-Interrupt)', 
            currentScenario: '02. Create vs Update', 
            opType: 'update', 
            nextVersion: 2, 
            verb: 'updateTokenURI', // ★ コントラクトの正しい関数名
            args: { tokenId: targetTokenId, newURI: 'ipfs://cid-v2-updated', newVersion: 2 } // ★ 3つの引数をすべて渡す
        };

        console.log(`\n[Test 02] Create vs Update | Token ID: ${targetTokenId}`);
        const results = await Promise.all([context.processOperation(req1), context.processOperation(req2)]);
        return results[0];
    }
}
module.exports.createWorkloadModule = () => new Case02CreateUpdate();