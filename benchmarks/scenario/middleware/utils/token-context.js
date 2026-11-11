'use strict';

const collector = require('./collector.js');

const CONTRACT = 'Middleware';

const LockStatus = {
    FREE: 'FREE',
    CREATE_LOCK: 'CREATE_LOCK',
    UPDATE_LOCK: 'UPDATE_LOCK',
    DELETE_LOCK: 'DELETE_LOCK'
};

function createFailedTxStatus(runner, scenarioId, reason) {
    if (runner && typeof runner.createTxStatus === 'function') {
        const txStatus = runner.createTxStatus();
        txStatus.SetStatusFail();

        // CaliperのTxStatusに任意項目を付けられる環境なら記録する
        txStatus.scenarioId = scenarioId;
        txStatus.errMsg = reason;

        return txStatus;
    }

    return {
        GetStatus: () => 'failed',
        GetResult: () => null,
        GetTxTimeMs: () => 0,
        GetTxId: () => scenarioId,
        IsVerified: () => true,
        GetVerificationResult: () => false,
        status: 'failed',
        errMsg: reason
    };
}

class TokenContext {
    constructor(tokenId, runner) {
        this.tokenId = tokenId;
        this.runner = runner;
        this.tokenLocks = LockStatus.FREE;
        this.requestQueue = [];

        /*
         * このキャッシュには、確定済みの状態だけを保存する。
         */
        this.localStateCache = {
            version: 0,
            uri: '',
            isDeleted: false,
            isCreated: false
        };
    }
    initializeCreatedState(version = 1, uri = '') {
        this.localStateCache = {
            version: version,
            uri: uri,
            isDeleted: false,
            isCreated: true
        };
    }
    
    async processOperation(req) {
        const {
            scenarioId,
            currentScenario,
            opType,
            nextVersion,
            verb,
            args
        } = req;

        /*
         * 1. 入力と事前状態の検証
         */
        const validationError = this._validateRequest(req);

        if (validationError) {
            console.log(
                `[TokenContext ${this.tokenId}] ` +
                `[早期遮断] ${scenarioId}: ${validationError}`
            );

            if (currentScenario) {
                collector.recordPrevention(currentScenario);
            }

            return createFailedTxStatus(
                this.runner,
                scenarioId,
                validationError
            );
        }

        /*
         * 2. ロック中なら、競合しない正常要求だけキューへ入れる
         */
        if (this.tokenLocks !== LockStatus.FREE) {
            console.log(
                `[TokenContext ${this.tokenId}] ` +
                `[キューイング] ${scenarioId}`
            );

            return new Promise(resolve => {
                this.requestQueue.push({
                    req,
                    resolve
                });
            });
        }

        /*
         * 3. ロック取得
         */
        this._setLockStatus(opType);

        /*
         * 失敗時に状態を戻せるよう、確定状態を保存する。
         *
         * この修正版では成功前にキャッシュ更新を行わないため、
         * 通常はrollback不要だが、将来の拡張に備えて保持する。
         */
        const cacheSnapshot = this._cloneLocalState();

        try {
            /*
             * SolidityのABI順に引数配列を構築する。
             *
             * safeMint:
             * safeMint(uint256 tokenId, address to, string tokenURI_)
             *
             * updateTokenURI:
             * updateTokenURI(uint256 tokenId, string newURI, uint256 newVersion)
             *
             * deleteNFT:
             * deleteNFT(uint256 tokenId)
             */
            const contractArgs = this._buildContractArguments(
                verb,
                args,
                nextVersion
            );

            const requestObject =
                this.runner.createConnectorRequest(
                    verb,
                    contractArgs,
                    CONTRACT
                );

            console.log(
                `[TokenContext ${this.tokenId}] ` +
                `[Contract Request]`,
                JSON.stringify(requestObject, null, 2)
            );

            const result =
                await this.runner.sutAdapter.sendRequests(
                    requestObject
                );

            /*
             * sendRequestsが例外を投げずに失敗結果を返す場合もあるため、
             * 戻り値を明示的に判定する。
             */
            if (!this._isTransactionSuccessful(result)) {
                throw new Error(
                    this._extractFailureReason(result)
                );
            }

            /*
             * オンチェーン成功後にだけキャッシュを確定する。
             */
            this._commitLocalCache(
                opType,
                nextVersion,
                args
            );

            console.log(
                `[TokenContext ${this.tokenId}] ` +
                `[コミット成功] ${scenarioId}`
            );

            return result;
        } catch (error) {
            /*
             * キャッシュを処理前の確定状態へ戻す。
             */
            this.localStateCache = cacheSnapshot;

            console.log(
                `[TokenContext ${this.tokenId}] ` +
                `[処理失敗・ロールバック] ` +
                `${scenarioId}: ${error.message}`
            );

            return createFailedTxStatus(
                this.runner,
                scenarioId,
                error.message
            );
        } finally {
            /*
             * 成功・失敗に関係なくロックを解放する。
             */
            await this._releaseLockAndProcessNext(
                scenarioId
            );
        }
    }

    /**
     * Solidity関数のABI定義順に引数配列を構築する。
     */
    _buildContractArguments(verb, args = {}, nextVersion) {
        if (Array.isArray(args)) {
            return args;
        }

        switch (verb) {
        case 'safeMint':
            return [
                args.tokenId ?? args.tokenID ?? this.tokenId,
                args.to,
                args.tokenURI_ ??
                    args._tokenURI ??
                    args.tokenURI ??
                    args.uri
            ];

        case 'updateTokenURI':
            return [
                args.tokenId ?? args.tokenID ?? this.tokenId,
                args.newURI ??
                    args.tokenURI_ ??
                    args._tokenURI ??
                    args.uri,
                args.newVersion ?? nextVersion
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

        case 'deleteNFT':
            return [
                args.tokenId ?? args.tokenID ?? this.tokenId
            ];

        case 'setDeleted':
            return [
                args.tokenId ?? args.tokenID ?? this.tokenId,
                args.isDeleted
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
                args.tokenId ?? args.tokenID ?? this.tokenId
            ];

        case 'getBalance':
        case 'balanceOf':
            return [
                args.owner ?? args.address
            ];

        case 'getTotalSupply':
            return [];

        default:
            /*
             * 未登録関数でオブジェクトが渡された場合は、
             * オブジェクトの値を定義順の保証なしで配列化しない。
             */
            throw new Error(
                `Unsupported contract argument mapping: ${verb}`
            );
        }
    }

    _validateRequest(req) {
        const {
            opType,
            nextVersion,
            args
        } = req;

        /*
         * 削除済みTokenへの全要求を拒否する。
         */
        if (
            this.localStateCache.isDeleted ||
            this.tokenLocks === LockStatus.DELETE_LOCK
        ) {
            return 'Token deleted or being deleted';
        }

        /*
         * 同一Tokenに対する重複Createを拒否する。
         */
        if (
            opType === 'create' &&
            (
                this.localStateCache.isCreated ||
                this.tokenLocks === LockStatus.CREATE_LOCK
            )
        ) {
            return 'Token already created or being created';
        }

        /*
         * CreateのURI形式を確認する。
         *
         * argsのキーは実際のMiddleware関数に合わせる。
         * tokenURI_、_tokenURIのどちらにも対応する。
         */
        if (opType === 'create') {
            const uri =
                args?.tokenURI_ ??
                args?._tokenURI ??
                args?.tokenURI ??
                args?.uri ??
                '';

            if (!this._isValidIpfsUri(uri)) {
                return 'Invalid IPFS URI';
            }

            const to = args?.to;

            if (
                typeof to !== 'string' ||
                !to.startsWith('0x') ||
                to.length !== 42
            ) {
                return 'Invalid recipient address';
            }

            const tokenId =
                args?.tokenId ??
                args?.tokenID ??
                this.tokenId;

            if (
                tokenId === undefined ||
                tokenId === null
            ) {
                return 'Token ID is required';
            }
        }

        /*
         * 未作成TokenへのUpdate/Deleteを拒否する。
         */
        if (
            (opType === 'update' || opType === 'delete') &&
            !this.localStateCache.isCreated &&
            this.tokenLocks !== LockStatus.CREATE_LOCK
        ) {
            return 'Token has not been created';
        }

        /*
         * 更新バージョンの単調増加を検証する。
         */
        if (
            opType === 'update' &&
            (
                !Number.isInteger(Number(nextVersion)) ||
                Number(nextVersion) <=
                    Number(this.localStateCache.version)
            )
        ) {
            return 'Invalid version sequence';
        }

        if (opType === 'update') {
            const newURI =
                args?.newURI ??
                args?.tokenURI_ ??
                args?._tokenURI ??
                args?.uri ??
                '';

            if (!this._isValidIpfsUri(newURI)) {
                return 'Invalid IPFS URI';
            }
        }

        return null;
    }

    _isValidIpfsUri(uri) {
        if (typeof uri !== 'string') {
            return false;
        }

        if (!uri.startsWith('ipfs://')) {
            return false;
        }

        const cid = uri.slice('ipfs://'.length).trim();

        return cid.length > 0;
    }

    _setLockStatus(opType) {
        if (opType === 'create') {
            this.tokenLocks = LockStatus.CREATE_LOCK;
        } else if (opType === 'update') {
            this.tokenLocks = LockStatus.UPDATE_LOCK;
        } else if (opType === 'delete') {
            this.tokenLocks = LockStatus.DELETE_LOCK;
        } else {
            throw new Error(
                `Unsupported operation type: ${opType}`
            );
        }
    }

    /*
     * オンチェーン成功後にだけ呼び出す。
     */
    _commitLocalCache(opType, nextVersion, args) {
        if (opType === 'create') {
            const uri =
                args?.tokenURI_ ??
                args?._tokenURI ??
                args?.tokenURI ??
                args?.uri ??
                '';

            this.localStateCache.isCreated = true;
            this.localStateCache.isDeleted = false;
            this.localStateCache.version = 1;
            this.localStateCache.uri = uri;

            return;
        }

        if (opType === 'update') {
            const uri =
                args?.newURI ??
                args?.tokenURI_ ??
                args?._tokenURI ??
                args?.uri ??
                '';

            this.localStateCache.version =
                Number(nextVersion);

            this.localStateCache.uri = uri;
            this.localStateCache.isDeleted = false;

            return;
        }

        if (opType === 'delete') {
            this.localStateCache.isDeleted = true;
        }
    }

    _cloneLocalState() {
        return {
            version: this.localStateCache.version,
            uri: this.localStateCache.uri,
            isDeleted: this.localStateCache.isDeleted,
            isCreated: this.localStateCache.isCreated
        };
    }

    _isTransactionSuccessful(result) {
        if (!result) {
            return false;
        }

        const results =
            Array.isArray(result) ? result : [result];

        return results.every(item => {
            if (!item) {
                return false;
            }

            if (typeof item.GetStatus === 'function') {
                const status = String(
                    item.GetStatus()
                ).toLowerCase();

                return (
                    status === 'success' ||
                    status === 'succeeded'
                );
            }

            const status =
                item.status?.status ??
                item.status;

            if (
                item.error ||
                item.status?.error ||
                item.status?.success === false ||
                item.status?.successful === false ||
                status === false
            ) {
                return false;
            }

            if (typeof status === 'string') {
                const normalized =
                    status.toLowerCase();

                if (
                    normalized === 'failed' ||
                    normalized === 'failure' ||
                    normalized === 'error' ||
                    normalized === 'reverted'
                ) {
                    return false;
                }
            }

            return true;
        });
    }

    _extractFailureReason(result) {
        const item =
            Array.isArray(result) ? result[0] : result;

        return (
            item?.errMsg ??
            item?.error?.message ??
            item?.error ??
            item?.status?.error?.message ??
            item?.status?.error ??
            'Blockchain transaction failed'
        );
    }

    async _releaseLockAndProcessNext(scenarioId) {
        console.log(
            `[TokenContext ${this.tokenId}] ` +
            `[処理完了] ${scenarioId}`
        );

        this.tokenLocks = LockStatus.FREE;

        if (this.requestQueue.length === 0) {
            return;
        }

        const nextTask =
            this.requestQueue.shift();

        console.log(
            `[TokenContext ${this.tokenId}] ` +
            `[デキュー] ${nextTask.req.scenarioId}`
        );

        /*
         * 再帰処理の完了結果を待ち、元のPromiseを解決する。
         */
        const result =
            await this.processOperation(
                nextTask.req
            );

        nextTask.resolve(result);
    }

    /*
     * テスト時の状態確認に使用する。
     */
    getLocalState() {
        return this._cloneLocalState();
    }
}

module.exports = TokenContext;