// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BaselineERC721 is ERC721URIStorage {
    /*
     * 次に利用可能なToken ID。
     *
     * Benchmark側で新しいToken IDを確保するために使用する。
     * Token IDそのものはsafeMint()の引数として指定する。
     */
    uint256 private _nextTokenId;

    /*
     * Metadata Version。
     *
     * Baselineではバージョン検証を行わない。
     * 単純に指定された値で上書きする。
     */
    mapping(uint256 => uint256) private _metadataVersion;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    /*
     * 指定されたToken IDでNFTを作成する。
     *
     * Baselineには以下を実装しない。
     *
     * - 状態参照バリデーション
     * - 排他ロック
     * - キュー
     * - 重複要求管理
     * - バージョン検証
     *
     * ERC721自身の標準的な存在チェックのみ働く。
     */
    function safeMint(
        address to,
        uint256 tokenId,
        string memory tokenURI_
    ) public returns (uint256) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _metadataVersion[tokenId] = 1;

        /*
         * 次回のBenchmark用Token IDを更新する。
         */
        if (tokenId >= _nextTokenId) {
            _nextTokenId = tokenId + 1;
        }

        return tokenId;
    }

    /*
     * URIとVersionを単純に上書きする。
     *
     * newVersionが現在より新しいかどうかは確認しない。
     */
    function updateTokenURI(
        uint256 tokenId,
        string memory newURI,
        uint256 newVersion
    ) public {
        _requireOwned(tokenId);

        _setTokenURI(tokenId, newURI);
        _metadataVersion[tokenId] = newVersion;
    }

    /*
     * NFTをBurnする。
     */
    function deleteNFT(
        uint256 tokenId
    ) public {
        _requireOwned(tokenId);

        _burn(tokenId);

        delete _metadataVersion[tokenId];
    }

    function getCurrentMetadataVersion(
        uint256 tokenId
    ) public view returns (uint256) {
        _requireOwned(tokenId);

        return _metadataVersion[tokenId];
    }

    /*
     * 既存JSとの互換性のため残す。
     */
    function getTotalSupply()
        public
        view
        returns (uint256)
    {
        return _nextTokenId;
    }

    /*
     * 新しいBenchmarkではこちらを使用する。
     */
    function getNextTokenId()
        public
        view
        returns (uint256)
    {
        return _nextTokenId;
    }
}