// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "../interfaces/IPolicy.sol";

/// @title RateLimitPolicy — Limits the number of operations per time window
/// @notice Enforces a max number of UserOps a session key can submit within a rolling window.
///         Ideal for gaming (max 10 moves/min) or DeFi (max 5 trades/hour).
contract RateLimitPolicy is IPolicy {
    struct RateConfig {
        uint256 maxOps;
        uint256 windowSeconds;
        uint256 opsInWindow;
        uint256 windowStart;
    }

    /// account => sessionKey => rate config
    mapping(address => mapping(address => RateConfig)) private _rates;

    error RateLimitExceeded();

    /// @notice Configure rate limit for a session key
    /// @param account       The smart account
    /// @param sessionKey    The session key
    /// @param maxOps        Maximum operations per window
    /// @param windowSeconds Window duration in seconds
    function configureRate(address account, address sessionKey, uint256 maxOps, uint256 windowSeconds) external {
        _rates[account][sessionKey] = RateConfig({
            maxOps: maxOps,
            windowSeconds: windowSeconds,
            opsInWindow: 0,
            windowStart: block.timestamp
        });
    }

    /// @inheritdoc IPolicy
    function checkPolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256, /* value */
        bytes calldata /* callData */
    ) external view returns (bool) {
        RateConfig storage cfg = _rates[account][sessionKey];
        if (cfg.maxOps == 0) return true; // not configured = allow

        // Check if we're in a new window
        if (block.timestamp >= cfg.windowStart + cfg.windowSeconds) {
            return true; // new window, ops would reset
        }

        return cfg.opsInWindow < cfg.maxOps;
    }

    /// @inheritdoc IPolicy
    function updatePolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256, /* value */
        bytes calldata /* callData */
    ) external {
        RateConfig storage cfg = _rates[account][sessionKey];
        if (cfg.maxOps == 0) return;

        // Reset window if expired
        if (block.timestamp >= cfg.windowStart + cfg.windowSeconds) {
            cfg.windowStart = block.timestamp;
            cfg.opsInWindow = 1;
        } else {
            cfg.opsInWindow++;
        }
    }
}
