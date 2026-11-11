'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

const SupportedConnectors = ['ethereum'];

class OperationBase extends WorkloadModuleBase {
    constructor() {
        super();
    }

    async initializeWorkloadModule(
        workerIndex,
        totalWorkers,
        roundIndex,
        roundArguments,
        sutAdapter,
        sutContext
    ) {
        await super.initializeWorkloadModule(
            workerIndex,
            totalWorkers,
            roundIndex,
            roundArguments,
            sutAdapter,
            sutContext
        );

        this.connectorType = this.sutAdapter.getType();

        if (!SupportedConnectors.includes(this.connectorType)) {
            throw new Error(
                `Connector type ${this.connectorType} is not supported by the benchmark`
            );
        }
    }

    createConnectorRequest(operation, args, contract, readOnly = false) {
        return {
            contract,
            verb: operation,
            args: Array.isArray(args)
                ? args
                : Object.keys(args).map(key => args[key]),
            readOnly
        };
    }
}

module.exports = OperationBase;