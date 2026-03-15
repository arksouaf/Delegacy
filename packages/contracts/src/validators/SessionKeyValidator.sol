// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISessionKeyValidator} from "../interfaces/ISessionKeyValidator.sol";
import {IPolicy} from "../interfaces/IPolicy.sol";
import {SessionLib} from "../libraries/SessionLib.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title SessionKeyValidator — Validates UserOps signed by scoped session keys
/// @notice This is the central validator module installed on SessionGuard accounts.
///         It stores session key registrations per-account and enforces all attached policies.
contract SessionKeyValidator is ISessionKeyValidator {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─── Storage ────────────────────────────────────────────────────────
    /// account => sessionKey => SessionKeyData
    mapping(address => mapping(address => SessionKeyData)) private _sessions;

    /// account => list of registered session key addresses (for enumeration)
    mapping(address => address[]) private _sessionKeyList;

    // ─── Errors ─────────────────────────────────────────────────────────
    error SessionKeyAlreadyRegistered();
    error SessionKeyNotFound();
    error SessionKeyExpired();
    error SessionKeyNotYetValid();
    error SessionKeyRevoked();
    error PolicyCheckFailed(address policy);
    error InvalidSignature();

    // ─── Registration ───────────────────────────────────────────────────
    /// @inheritdoc ISessionKeyValidator
    function registerSessionKey(
        address sessionKey,
        uint48 validAfter,
        uint48 validUntil,
        IPolicy[] calldata policies
    ) external {
        address account = msg.sender;
        if (_sessions[account][sessionKey].sessionKey != address(0)) {
            revert SessionKeyAlreadyRegistered();
        }

        _sessions[account][sessionKey] = SessionKeyData({
            sessionKey: sessionKey,
            validAfter: validAfter,
            validUntil: validUntil,
            revoked: false,
            policies: policies
        });

        _sessionKeyList[account].push(sessionKey);

        emit SessionKeyRegistered(account, sessionKey, validAfter, validUntil);
    }

    /// @inheritdoc ISessionKeyValidator
    function revokeSessionKey(address sessionKey) external {
        address account = msg.sender;
        if (_sessions[account][sessionKey].sessionKey == address(0)) {
            revert SessionKeyNotFound();
        }

        _sessions[account][sessionKey].revoked = true;

        emit SessionKeyRevoked(account, sessionKey);
    }

    // ─── Validation ─────────────────────────────────────────────────────
    /// @notice Validate a UserOperation signature and enforce all session key policies
    /// @param account     The smart account address
    /// @param userOpHash  The hash of the UserOperation
    /// @param signature   The session key's signature over userOpHash
    /// @param target      The call target
    /// @param value       The ETH value
    /// @param callData    The encoded call
    /// @return validationData Packed ERC-4337 validation data (sigFail, validUntil, validAfter)
    function validateSessionKeyOp(
        address account,
        bytes32 userOpHash,
        bytes calldata signature,
        address target,
        uint256 value,
        bytes calldata callData
    ) external returns (uint256 validationData) {
        // 1. Recover signer from signature
        address recovered = userOpHash.toEthSignedMessageHash().recover(signature);

        // 2. Look up session key data
        SessionKeyData storage sk = _sessions[account][recovered];
        if (sk.sessionKey == address(0)) revert SessionKeyNotFound();
        if (sk.revoked) revert SessionKeyRevoked();

        // 3. Time checks
        if (block.timestamp < sk.validAfter) revert SessionKeyNotYetValid();
        if (block.timestamp > sk.validUntil) revert SessionKeyExpired();

        // 4. Check all attached policies
        IPolicy[] storage policies = sk.policies;
        for (uint256 i = 0; i < policies.length; i++) {
            bool allowed = policies[i].checkPolicy(account, recovered, target, value, callData);
            if (!allowed) revert PolicyCheckFailed(address(policies[i]));
        }

        // 5. Update policy state post-validation
        for (uint256 i = 0; i < policies.length; i++) {
            policies[i].updatePolicy(account, recovered, target, value, callData);
        }

        // 6. Return packed validation data
        return SessionLib.packValidationData(false, sk.validUntil, sk.validAfter);
    }

    // ─── View ───────────────────────────────────────────────────────────
    /// @inheritdoc ISessionKeyValidator
    function isSessionKeyValid(address account, address sessionKey) external view returns (bool) {
        SessionKeyData storage sk = _sessions[account][sessionKey];
        if (sk.sessionKey == address(0)) return false;
        if (sk.revoked) return false;
        if (block.timestamp < sk.validAfter) return false;
        if (block.timestamp > sk.validUntil) return false;
        return true;
    }

    /// @inheritdoc ISessionKeyValidator
    function getSessionKeyData(address account, address sessionKey)
        external
        view
        returns (SessionKeyData memory)
    {
        return _sessions[account][sessionKey];
    }

    /// @notice Get all session keys for an account
    /// @param account The smart account address
    /// @return keys Array of session key addresses
    function getSessionKeys(address account) external view returns (address[] memory keys) {
        return _sessionKeyList[account];
    }
}
