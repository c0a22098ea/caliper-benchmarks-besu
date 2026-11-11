'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const EthereumConnector = require('@hyperledger/caliper-ethereum/lib/ethereum-connector');
const { BesuConnector } = require('./besu-connector');

test('HTTP requires explicit permission and local signing; WebSocket keeps upstream validation', () => {
    const check = config => BesuConnector.prototype.checkConfig(config);
    assert.throws(() => check({ url: 'http://localhost:8545' }), /must not use http/);
    assert.throws(() => check({ url: 'http://localhost:8545', allowHttpRpc: true }), /signing key/);
    assert.doesNotThrow(() => check({ url: 'http://localhost:8545', allowHttpRpc: true, fromAddressPrivateKey: 'test' }));
    assert.doesNotThrow(() => check({ url: 'ws://localhost:8546' }));
    assert.throws(() => check({}), /No URL/);
});

test('HTTP writes wait for preceding confirmation and recover after rejection', async t => {
    const connector = Object.create(BesuConnector.prototype);
    connector.ethereumConfig = { url: 'http://localhost:8545' };
    connector.pendingSend = Promise.resolve();
    const calls = [];
    let rejectFirst;
    const original = EthereumConnector.prototype._sendSingleRequest;
    t.after(() => { EthereumConnector.prototype._sendSingleRequest = original; });
    EthereumConnector.prototype._sendSingleRequest = function(request) {
        calls.push(request.id);
        return request.id === 1 ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve(request.id);
    };
    const first = connector._sendSingleRequest({ id: 1 });
    const rejected = assert.rejects(first, /failed/);
    const second = connector._sendSingleRequest({ id: 2 });
    await Promise.resolve();
    assert.deepEqual(calls, [1]);
    // Reads can still run while the first write is pending.
    assert.equal(await connector._sendSingleRequest({ id: 3, readOnly: true }), 3);
    rejectFirst(new Error('failed'));
    await rejected;
    assert.equal(await second, 2);
    assert.deepEqual(calls, [1, 3, 2]);
});
