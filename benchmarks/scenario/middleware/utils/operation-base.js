'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const SupportedConnectors = ['ethereum'];

class OperationBase extends WorkloadModuleBase {
    constructor() {
        super();
        this.pendingOperations = new Set();
        const submit = this.submitTransaction.bind(this);
        this.submitTransaction = (...args) => {
            const operation = Promise.resolve().then(() => submit(...args));
            this.pendingOperations.add(operation);
            operation.then(
                () => this.pendingOperations.delete(operation),
                () => this.pendingOperations.delete(operation)
            );
            return operation;
        };
    }

    async cleanupWorkloadModule() {
        await Promise.all([...this.pendingOperations]);
        await super.cleanupWorkloadModule();
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        this.assertConnectorType();
        this.assertSetting('tokenId');
        this.tokenId = this.roundArguments.tokenId;
        if (!Number.isSafeInteger(this.tokenId) || this.tokenId < 0) {
            throw new Error('workload.arguments.tokenId must be a nonnegative safe integer');
        }
        this.simpleState = this.createSimpleState();

        const { create } =  await import('kubo-rpc-client');
        this.ipfsService = create({
            url: 'http://10.203.92.63:5001/api/v0'
        });
    }

    createSimpleState() {
        throw new Error('Simple workload error: "createSimpleState" must be overridden in derived classes');
    }

    assertConnectorType() {
        this.connectorType = this.sutAdapter.getType();
        if (!SupportedConnectors.includes(this.connectorType)) {
            throw new Error(`Connector type ${this.connectorType} is not supported by the benchmark`);
        }
    }

    assertSetting(settingName) {
        if(!this.roundArguments.hasOwnProperty(settingName)) {
            throw new Error(`Simple workload error: module setting "${settingName}" is missing from the benchmark configuration file`);
        }
    }

    createConnectorRequest(operation, args, contract = 'Middleware') {
        switch (this.connectorType) {
            case 'ethereum':
                return this._createEthereumConnectorRequest(operation, args, contract);
            default:
                throw new Error(`Connector type ${this.connectorType} is not supported by the benchmark`);
        }
    }

    _createEthereumConnectorRequest(operation, args, contract = 'Middleware') {
        return {
            contract: contract,
            verb: operation,
            args: Object.keys(args).map(k => args[k]),
            readOnly: false
        };
    }
}

module.exports = OperationBase;
