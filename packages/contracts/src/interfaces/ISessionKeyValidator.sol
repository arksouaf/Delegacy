// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicy} from "./IPolicy.sol";

/// @title ISessionKeyValidator — Interface for session key validation module
/// @notice Validates UserOperations signed by session keys against registered policies.
interface ISessionKeyValidator {
    /// @notice Emitted when a session key is registered
    event SessionKeyRegistered(
        address indexed account,
        address indexed sessionKey,
        uint48 validAfter,
        uint48 validUntil
    );

    /// @notice Emitted when a session key is revoked
    event SessionKeyRevoked(address indexed account, address indexed sessionKey);

    /// @notice Session key configuration
    struct SessionKeyData {
        address sessionKey;
        uint48 validAfter;
        uint48 validUntil;
        bool revoked;
        IPolicy[] policies;
    }

    /// @notice Register a new session key with policies
    /// @param sessionKey  The session key address
    /// @param validAfter  Timestamp after which the key is valid
    /// @param validUntil  Timestamp after which the key expires
    /// @param policies    Array of policy contracts to enforce
    function registerSessionKey(
        address sessionKey,
        uint48 validAfter,
        uint48 validUntil,
        IPolicy[] calldata policies
    ) external;

    /// @notice Revoke a session key immediately
    /// @param sessionKey The session key to revoke
    function revokeSessionKey(address sessionKey) external;

    /// @notice Check if a session key is currently valid
    /// @param account    The smart account address
    /// @param sessionKey The session key to check
    /// @return valid     True if the session key is valid and not revoked
    function isSessionKeyValid(address account, address sessionKey) external view returns (bool valid);

    /// @notice Get the full session key data
    /// @param account    The smart account address
    /// @param sessionKey The session key address
    /// @return data      The session key configuration
    function getSessionKeyData(address account, address sessionKey)
        external
        view
        returns (SessionKeyData memory data);
}
