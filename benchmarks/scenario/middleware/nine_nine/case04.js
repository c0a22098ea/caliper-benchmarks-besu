'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case04UpdateCreate extends OperationBase {
    constructor() { 
        super(); 
        this.contexts = new Map(); 
    }

    createSimpleState() { 
        return new SimpleState(this.workerIndex, this.tokenId, this.numberOfAccounts / this.totalWorkers); 
    }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();
        const targetTokenId = mintArgs.tokenID + 300 * 3;

        if (!this.contexts.has(targetTokenId)) {
            const context = new TokenContext(targetTokenId, this);
            context.initializeCreatedState(1, mintArgs._tokenURI);
            this.contexts.set(targetTokenId, context);
        }
        const context = this.contexts.get(targetTokenId);

        // ★ SETUP (safeMint) を削除！
        // すでに mint.js ラウンドで targetTokenId (Version 1) が作成済みである前提で実行

        // OP-1: 正常な更新処理 (version 2)
        const req1 = { 
            scenarioId: 'OP-1 (updateTokenURI)', 
            opType: 'update', 
            nextVersion: 2, 
            verb: 'updateTokenURI', 
            args: { tokenId: targetTokenId, newURI: 'ipfs://cid-v2', newVersion: 2 } 
        };

        // OP-2: 作成済みトークンに対する重複 Create (即時 Revert / 防衛されるべき)
        const req2 = { 
            scenarioId: 'OP-2 (safeMint-Duplicate)', 
            currentScenario: '04. Update vs Create', 
            opType: 'create', 
            nextVersion: 1, 
            verb: 'safeMint', 
            args: { tokenId: targetTokenId, to: mintArgs.to, tokenURI_: 'ipfs://cid-duplicate' } 
        };

        console.log(`\n[Test 04] Update vs Create | Target Token ID: ${targetTokenId}`);
        
        // 競合リクエストを並行送信
        const results = await Promise.all([
            context.processOperation(req1), 
            context.processOperation(req2)
        ]);

        // Caliper に測定させるプライマリトランザクションの結果を返す
        return results[0];
    }
}

module.exports.createWorkloadModule = () => new Case04UpdateCreate();