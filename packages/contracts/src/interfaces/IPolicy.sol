// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPolicy — Interface for session key policy enforcement
/// @notice Policies define the rules that constrain what a session key can do.
///         Each policy is checked during UserOperation validation.
interface IPolicy {
    /// @notice Validate whether a UserOperation complies with this policy
    /// @param account     The smart account address
    /// @param sessionKey  The session key that signed the UserOp
    /// @param target      The call target address
    /// @param value       The ETH value being sent
    /// @param callData    The encoded function call
    /// @return valid      True if the operation is allowed under this policy
    function checkPolicy(
        address account,
        address sessionKey,
        address target,
        uint256 value,
        bytes calldata callData
    ) external returns (bool valid);

    /// @notice Called after successful execution to update policy state (e.g., decrement remaining spend)
    /// @param account     The smart account address
    /// @param sessionKey  The session key that signed the UserOp
    /// @param target      The call target address
    /// @param value       The ETH value sent
    /// @param callData    The encoded function call
    function updatePolicy(
        address account,
        address sessionKey,
        address target,
        uint256 value,
        bytes calldata callData
    ) external;
}
