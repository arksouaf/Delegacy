// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "../interfaces/IPolicy.sol";

/// @title PolicyLib — Helpers for encoding and decoding policy configurations
library PolicyLib {
    /// @notice Encode a spending limit policy configuration
    function encodeSpendingLimit(address account, address sessionKey, uint256 maxAmount)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSignature("configureLimit(address,address,uint256)", account, sessionKey, maxAmount);
    }

    /// @notice Encode an allowlist policy configuration
    function encodeAllowlist(
        address account,
        address sessionKey,
        address[] memory targets,
        bytes4[] memory selectors
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "configureAllowlist(address,address,address[],bytes4[])", account, sessionKey, targets, selectors
        );
    }

    /// @notice Encode a rate limit policy configuration
    function encodeRateLimit(address account, address sessionKey, uint256 maxOps, uint256 windowSeconds)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSignature(
            "configureRate(address,address,uint256,uint256)", account, sessionKey, maxOps, windowSeconds
        );
    }

    /// @notice Encode a gas limit policy configuration
    function encodeGasLimit(address account, address sessionKey, uint256 maxGas)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSignature("configureGasLimit(address,address,uint256)", account, sessionKey, maxGas);
    }
}
