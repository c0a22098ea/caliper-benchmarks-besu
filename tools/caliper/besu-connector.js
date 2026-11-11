'use strict';

const EthereumConnector = require('@hyperledger/caliper-ethereum/lib/ethereum-connector');

// Keep the upstream connector for WebSocket; opt in to ordered HTTP sends.
class BesuConnector extends EthereumConnector {
    checkConfig(config) {
        if (/^https?:\/\//i.test(config.url || '') && config.allowHttpRpc === true) {
            if (!config.fromAddressPrivateKey && !config.fromAddressSeed) {
                throw new Error('HTTP RPC requires a local signing key or seed for explicit nonce management');
            }
            return;
        }
        super.checkConfig(config);
    }

    constructor(workerIndex) {
        super(workerIndex, 'ethereum');
        this.pendingSend = Promise.resolve();
    }

    _sendSingleRequest(request) {
        if (!/^https?:\/\//i.test(this.ethereumConfig.url) || request.readOnly) {
            return super._sendSingleRequest(request);
        }
        // Wait for confirmation before sending the next transaction so HTTP
        // requests cannot reorder transactions from this worker's account.
        const result = this.pendingSend.then(() => super._sendSingleRequest(request));
        this.pendingSend = result.catch(() => {});
        return result;
    }
}

module.exports.BesuConnector = BesuConnector;
module.exports.ConnectorFactory = async workerIndex => new BesuConnector(workerIndex);
