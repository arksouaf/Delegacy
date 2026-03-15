// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISessionGuardAccount — Interface for the SessionGuard smart account
/// @notice An ERC-4337 compatible smart account with modular session key support.
interface ISessionGuardAccount {
    /// @notice Emitted when account is initialized
    event AccountInitialized(address indexed owner);

    /// @notice Emitted when a module (validator) is installed
    event ModuleInstalled(address indexed module);

    /// @notice Emitted when a module (validator) is removed
    event ModuleRemoved(address indexed module);

    /// @notice Execute a single call from this account
    /// @param target  The target contract address
    /// @param value   The ETH value to send
    /// @param data    The calldata to execute
    function execute(address target, uint256 value, bytes calldata data) external;

    /// @notice Execute a batch of calls from this account
    /// @param targets  Array of target contract addresses
    /// @param values   Array of ETH values
    /// @param datas    Array of calldatas
    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external;

    /// @notice Install a validator module
    /// @param validator The validator contract address
    function installValidator(address validator) external;

    /// @notice Remove a validator module
    /// @param validator The validator contract address
    function removeValidator(address validator) external;

    /// @notice Check if a validator module is installed
    /// @param validator The validator contract address
    /// @return True if installed
    function isValidatorInstalled(address validator) external view returns (bool);

    /// @notice Get the account owner
    /// @return The owner address (master key holder)
    function owner() external view returns (address);
}
