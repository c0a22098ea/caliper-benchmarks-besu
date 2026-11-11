'use strict';

const {
    WorkloadModuleBase
} = require('@hyperledger/caliper-core');

const SupportedConnectors = [
    'ethereum'
];

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

        this.assertConnectorType();
        this.assertSetting('tokenId');

        this.tokenId = this.roundArguments.tokenId;
        this.simpleState = this.createSimpleState();
    }

    createSimpleState() {
        throw new Error(
            'Simple workload error: ' +
            '"createSimpleState" must be overridden in derived classes'
        );
    }

    assertConnectorType() {
        this.connectorType = this.sutAdapter.getType();

        if (!SupportedConnectors.includes(this.connectorType)) {
            throw new Error(
                `Connector type ${this.connectorType} ` +
                'is not supported by the benchmark'
            );
        }
    }

    assertSetting(settingName) {
        if (
            !Object.prototype.hasOwnProperty.call(
                this.roundArguments,
                settingName
            )
        ) {
            throw new Error(
                `Simple workload error: module setting ` +
                `"${settingName}" is missing from the ` +
                'benchmark configuration file'
            );
        }
    }

    createConnectorRequest(
        operation,
        args = {},
        contract = 'databaseTransaction'
    ) {
        switch (this.connectorType) {
        case 'ethereum':
            return this._createEthereumConnectorRequest(
                operation,
                args,
                contract
            );

        default:
            throw new Error(
                `Connector type ${this.connectorType} ` +
                'is not supported by the benchmark'
            );
        }
    }

    _createEthereumConnectorRequest(
        operation,
        args = {},
        contract = 'databaseTransaction'
    ) {
        const normalizedArgs = this._normalizeArguments(
            operation,
            args
        );

        const request = {
            contract,
            verb: operation,
            args: normalizedArgs,
            readOnly: false
        };

        console.log(
            '[Ethereum connector request]',
            JSON.stringify(request, null, 2)
        );

        return request;
    }

    _normalizeArguments(operation, args) {
        /*
         * すでに配列なら、そのままABI引数として使用する。
         */
        if (Array.isArray(args)) {
            return args;
        }

        switch (operation) {
        case 'safeMint':
            return [
                args.tokenId ??
                    args.tokenID ??
                    this.tokenId,

                args.to ??
                    args.owner ??
                    args.recipient,

                args.tokenURI_ ??
                    args._tokenURI ??
                    args.tokenURI ??
                    args.uri
            ];

        case 'updateTokenURI':
            return [
                args.tokenId ??
                    args.tokenID ??
                    this.tokenId,

                args.newURI ??
                    args.tokenURI_ ??
                    args._tokenURI ??
                    args.uri,

                args.newVersion ??
                    args.version
            ];

        case 'deleteNFT':
            return [
                args.tokenId ??
                    args.tokenID ??
                    this.tokenId
            ];

        case 'setDeleted':
            return [
                args.tokenId ??
                    args.tokenID ??
                    this.tokenId,

                args.isDeleted
            ];

        case 'batchUpdateTokenURIs':
            return [
                args.tokenIds,
                args.newURIs,
                args.newVersions
            ];

        case 'emitBatchMetadataUpdate':
            return [
                args.fromTokenId,
                args.toTokenId
            ];

        case 'getCurrentMetadataVersion':
        case 'getMetadataHistory':
        case 'getMetadataUpdateCount':
        case 'getLatestCID':
        case 'getPrevCID':
        case 'getDeleted':
        case 'ownerOf':
        case 'tokenURI':
            return [
                args.tokenId ??
                    args.tokenID ??
                    this.tokenId
            ];

        case 'getBalance':
        case 'balanceOf':
            return [
                args.owner ??
                    args.address
            ];

        case 'getTotalSupply':
            return [];

        default:
            return Object.keys(args).map(
                key => args[key]
            );
        }
    }
}

module.exports = OperationBase;