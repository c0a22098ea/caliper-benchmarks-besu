'use strict';

const OperationBase = require('../utils/operation-base');
const SimpleState = require('../utils/simple-state');
// const TokenContext = require('../utils/token-context');

/**
 * Create単体シナリオ
 *
 * 1回のsubmitTransactionにつき、
 * safeMintを1回だけ実行する。
 */
class CaseCreateSingle extends OperationBase {
    constructor() {
        super();
    }

    createSimpleState() {
        return new SimpleState(
            this.workerIndex,
            this.tokenId,
            this.numberOfAccounts / this.totalWorkers
        );
    }

    async submitTransaction(){
        const targetTokenId = this.simpleState.getCurrentTokenId();
        const datacid = await this.ipfsService.add("Create single transaction test");
        const metadata = {
            name: `NFT-${targetTokenId}`,
            description: "Create single transaction test",
            cid: datacid,
            workerIndex: this.workerIndex
        };
        const metadataCid = await this.ipfsService.add(JSON.stringify(metadata));
        const mintArgs = this.simpleState.getMintArguments(metadataCid);        
        
        const context = new TokenContext(targetTokenId,this);
        const request = {scenarioId:`CREATE-SINGLE-${targetTokenId}`, currentScenario: 'Create Single', opType: 'create', nextVersion: 1, verb: 'safeMint', args: {tokenId: targetTokenId, to: mintArgs.to}, metadata: {name: `NFT-${targetTokenId}`, description: 'Create single transaction test', workerIndex: this.workerIndex } };
        console.log( `\n[Create Single] Token ID: ${targetTokenId}`);
        console.log('[Create Single Request]',JSON.stringify(request,null, 2));

        /*
         * Createを1件だけ実行する。
         */
        const result = await context.processOperation(request);

        return result;
    }
}

module.exports.createWorkloadModule =
    () => new CaseCreateSingle();