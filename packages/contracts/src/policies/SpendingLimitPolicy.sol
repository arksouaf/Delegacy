// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "../interfaces/IPolicy.sol";

/// @title SpendingLimitPolicy — Enforces per-session-key ETH/token spending caps
/// @notice Tracks cumulative spend per (account, sessionKey) pair against a configured limit.
contract SpendingLimitPolicy is IPolicy {
    struct SpendConfig {
        uint256 maxAmount;
        uint256 spent;
    }

    /// account => sessionKey => spending config
    mapping(address => mapping(address => SpendConfig)) private _limits;

    error SpendingLimitExceeded(uint256 attempted, uint256 remaining);
    error LimitAlreadySet();

    /// @notice Configure a spending limit for a session key
    /// @param account    The smart account
    /// @param sessionKey The session key
    /// @param maxAmount  Maximum cumulative spend in wei
    function configureLimit(address account, address sessionKey, uint256 maxAmount) external {
        if (_limits[account][sessionKey].maxAmount > 0) revert LimitAlreadySet();
        _limits[account][sessionKey] = SpendConfig({maxAmount: maxAmount, spent: 0});
    }

    /// @inheritdoc IPolicy
    function checkPolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256 value,
        bytes calldata /* callData */
    ) external view returns (bool) {
        SpendConfig storage cfg = _limits[account][sessionKey];
        if (cfg.maxAmount == 0) return true; // no limit configured = allow
        return (cfg.spent + value) <= cfg.maxAmount;
    }

    /// @inheritdoc IPolicy
    function updatePolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256 value,
        bytes calldata /* callData */
    ) external {
        SpendConfig storage cfg = _limits[account][sessionKey];
        if (cfg.maxAmount > 0) {
            cfg.spent += value;
        }
    }

    /// @notice Get remaining spend for a session key
    function remainingLimit(address account, address sessionKey) external view returns (uint256) {
        SpendConfig storage cfg = _limits[account][sessionKey];
        if (cfg.maxAmount == 0) return type(uint256).max;
        if (cfg.spent >= cfg.maxAmount) return 0;
        return cfg.maxAmount - cfg.spent;
    }
}
