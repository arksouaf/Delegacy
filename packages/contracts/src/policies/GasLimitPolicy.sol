// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "../interfaces/IPolicy.sol";

/// @title GasLimitPolicy — Caps the total gas a session key can consume
/// @notice Prevents a compromised session key from draining gas credits/paymaster funds.
contract GasLimitPolicy is IPolicy {
    struct GasConfig {
        uint256 maxGas;
        uint256 gasUsed;
    }

    /// account => sessionKey => gas config
    mapping(address => mapping(address => GasConfig)) private _gasLimits;

    /// @notice Configure gas limit for a session key
    /// @param account    The smart account
    /// @param sessionKey The session key
    /// @param maxGas     Maximum total gas units the session key can consume
    function configureGasLimit(address account, address sessionKey, uint256 maxGas) external {
        _gasLimits[account][sessionKey] = GasConfig({maxGas: maxGas, gasUsed: 0});
    }

    /// @inheritdoc IPolicy
    function checkPolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256, /* value */
        bytes calldata /* callData */
    ) external view returns (bool) {
        GasConfig storage cfg = _gasLimits[account][sessionKey];
        if (cfg.maxGas == 0) return true;
        // Estimate gas for this op (use gasleft as rough check)
        return cfg.gasUsed < cfg.maxGas;
    }

    /// @inheritdoc IPolicy
    function updatePolicy(
        address account,
        address sessionKey,
        address, /* target */
        uint256, /* value */
        bytes calldata /* callData */
    ) external {
        GasConfig storage cfg = _gasLimits[account][sessionKey];
        if (cfg.maxGas == 0) return;
        // Track gas consumption (simplified — real implementation would use actual gas metering)
        cfg.gasUsed += 100_000; // placeholder per-op gas estimate
    }

    /// @notice Get remaining gas budget
    function remainingGas(address account, address sessionKey) external view returns (uint256) {
        GasConfig storage cfg = _gasLimits[account][sessionKey];
        if (cfg.maxGas == 0) return type(uint256).max;
        if (cfg.gasUsed >= cfg.maxGas) return 0;
        return cfg.maxGas - cfg.gasUsed;
    }
}
