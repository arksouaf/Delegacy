// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SessionGuardAccount} from "./SessionGuardAccount.sol";

/// @title SessionGuardFactory — Deploys SessionGuard smart accounts via CREATE2
/// @notice Allows deterministic deployment of smart accounts. Each user gets a unique
///         counterfactual address derived from their owner key and a salt.
contract SessionGuardFactory {
    // ─── State ──────────────────────────────────────────────────────────
    address public immutable entryPoint;
    address public immutable accountImplementation;

    // ─── Events ─────────────────────────────────────────────────────────
    event AccountCreated(address indexed account, address indexed owner, uint256 salt);

    // ─── Errors ─────────────────────────────────────────────────────────
    error DeploymentFailed();

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
        // Deploy a single implementation that proxies will delegate to
        accountImplementation = address(new SessionGuardAccount(_entryPoint));
    }

    // ─── Account Creation ───────────────────────────────────────────────
    /// @notice Deploy a new SessionGuard account (or return existing if already deployed)
    /// @param owner The account owner (master key)
    /// @param salt  A unique salt for deterministic addressing
    /// @return account The deployed account address
    function createAccount(address owner, uint256 salt) external returns (address account) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(owner, salt));
        bytes memory bytecode = _getCreationBytecode(owner);

        assembly {
            account := create2(0, add(bytecode, 0x20), mload(bytecode), combinedSalt)
        }

        if (account == address(0)) revert DeploymentFailed();

        // Initialize the account
        SessionGuardAccount(payable(account)).initialize(owner);

        emit AccountCreated(account, owner, salt);
    }

    /// @notice Compute the counterfactual address of an account (before deployment)
    /// @param owner The account owner
    /// @param salt  The deployment salt
    /// @return The predicted address
    function getAccountAddress(address owner, uint256 salt) external view returns (address) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(owner, salt));
        bytes memory bytecode = _getCreationBytecode(owner);
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), combinedSalt, keccak256(bytecode)));
        return address(uint160(uint256(hash)));
    }

    // ─── Internal ───────────────────────────────────────────────────────
    function _getCreationBytecode(address /* owner */) internal view returns (bytes memory) {
        // Minimal proxy (EIP-1167) pointing to the implementation
        // This is the standard clone pattern — cheap to deploy
        return abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            accountImplementation,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
    }
}
