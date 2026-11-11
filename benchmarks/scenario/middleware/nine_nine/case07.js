'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
const TokenContext = require('../utils/token-context');

class Case07DeleteCreate extends OperationBase {
    constructor() {
        super();
        this.contexts = new Map();
    }

    createSimpleState() {
        return new SimpleState(
            this.workerIndex,
            this.tokenId,
            this.numberOfAccounts / this.totalWorkers
        );
    }

    async submitTransaction() {
        const mintArgs = this.simpleState.getMintArguments();

        // Case07用のToken ID領域
        // case03-07.js のSetup Mintと同じオフセット
        const targetTokenId = mintArgs.tokenID + 300 * 6;

            if (!this.contexts.has(targetTokenId)) {
                const context = new TokenContext(targetTokenId, this);

                context.initializeCreatedState(
                    1,
                    mintArgs._tokenURI
                );

                this.contexts.set(targetTokenId, context);
                }
                const context = this.contexts.get(targetTokenId);

        /*
         * OP-1:
         * 既存Tokenを削除
         */
        const req1 = {
            scenarioId: 'OP-1 (deleteNFT)',
            opType: 'delete',
            nextVersion: 99,
            verb: 'deleteNFT',
            args: {
                tokenId: targetTokenId
            }
        };

        /*
         * OP-2:
         * Delete処理中の同一Token IDに対して
         * 再Createを要求
         *
         * DELETE_LOCKによって
         * 早期遮断されることを期待する。
         */
        const req2 = {
            scenarioId: 'OP-2 (safeMint-AfterDelete)',
            currentScenario: '07. Delete vs Create',
            opType: 'create',
            nextVersion: 1,
            verb: 'safeMint',
            args: {
                tokenId: targetTokenId,
                to: mintArgs.to,
                tokenURI_: 'ipfs://cid-recreate'
            }
        };

        console.log(
            `\n[Test 07] Delete vs Create | ` +
            `Target Token ID: ${targetTokenId}`
        );

        const results = await Promise.all([
            context.processOperation(req1),
            context.processOperation(req2)
        ]);

        return results[0];
    }
}

module.exports.createWorkloadModule =
    () => new Case07DeleteCreate();