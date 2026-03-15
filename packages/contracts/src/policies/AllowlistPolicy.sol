// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "../interfaces/IPolicy.sol";

/// @title AllowlistPolicy — Restricts which contracts and functions a session key can call
/// @notice Maintains a per-session-key allowlist of (target, selector) pairs.
///         If the allowlist is empty, all calls are denied.
contract AllowlistPolicy is IPolicy {
    struct AllowEntry {
        bool allowed;
    }

    /// account => sessionKey => target => selector => allowed
    mapping(address => mapping(address => mapping(address => mapping(bytes4 => bool)))) private _allowlist;

    /// account => sessionKey => whether an allowlist has been configured
    mapping(address => mapping(address => bool)) private _configured;

    event AllowlistConfigured(address indexed account, address indexed sessionKey, uint256 entryCount);

    /// @notice Configure the allowlist for a session key
    /// @param account    The smart account
    /// @param sessionKey The session key
    /// @param targets    Array of allowed target contracts
    /// @param selectors  Array of allowed function selectors (parallel with targets)
    function configureAllowlist(
        address account,
        address sessionKey,
        address[] calldata targets,
        bytes4[] calldata selectors
    ) external {
        require(targets.length == selectors.length, "AllowlistPolicy: length mismatch");
        _configured[account][sessionKey] = true;

        for (uint256 i = 0; i < targets.length; i++) {
            _allowlist[account][sessionKey][targets[i]][selectors[i]] = true;
        }

        emit AllowlistConfigured(account, sessionKey, targets.length);
    }

    /// @inheritdoc IPolicy
    function checkPolicy(
        address account,
        address sessionKey,
        address target,
        uint256, /* value */
        bytes calldata callData
    ) external view returns (bool) {
        if (!_configured[account][sessionKey]) return false; // no allowlist = deny all

        bytes4 selector;
        if (callData.length >= 4) {
            selector = bytes4(callData[:4]);
        }

        return _allowlist[account][sessionKey][target][selector];
    }

    /// @inheritdoc IPolicy
    function updatePolicy(address, address, address, uint256, bytes calldata) external {
        // Allowlist is stateless — nothing to update
    }
}
