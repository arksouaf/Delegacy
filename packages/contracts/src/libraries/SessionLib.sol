// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SessionLib — Data structures and helpers for session keys
library SessionLib {
    /// @notice Packs validation data in the ERC-4337 format
    /// @param sigFailed   True if signature validation failed
    /// @param validUntil  Timestamp the UserOp is valid until (0 = no expiry)
    /// @param validAfter  Timestamp the UserOp is valid after
    /// @return packed     The packed uint256 validation data
    function packValidationData(bool sigFailed, uint48 validUntil, uint48 validAfter)
        internal
        pure
        returns (uint256 packed)
    {
        packed = (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << 208);
    }

    /// @notice Decode a target + calldata into (selector, remaining calldata)
    /// @param callData The full calldata
    /// @return selector  The 4-byte function selector
    /// @return params    The remaining calldata after the selector
    function decodeCallData(bytes calldata callData)
        internal
        pure
        returns (bytes4 selector, bytes calldata params)
    {
        require(callData.length >= 4, "SessionLib: calldata too short");
        selector = bytes4(callData[:4]);
        params = callData[4:];
    }
}
