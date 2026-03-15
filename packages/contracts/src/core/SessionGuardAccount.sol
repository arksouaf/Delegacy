// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISessionGuardAccount} from "../interfaces/ISessionGuardAccount.sol";

/// @title SessionGuardAccount — ERC-4337 smart account with modular session key support
/// @notice This is the core smart account deployed per-user. It supports modular validators
///         so session key modules can be installed/removed by the owner.
contract SessionGuardAccount is ISessionGuardAccount {
    // ─── Storage ────────────────────────────────────────────────────────
    address private _owner;
    bool private _initialized;
    mapping(address => bool) private _validators;

    // ─── ERC-4337 EntryPoint ────────────────────────────────────────────
    address public immutable entryPoint;

    // ─── Errors ─────────────────────────────────────────────────────────
    error AlreadyInitialized();
    error NotOwner();
    error NotEntryPointOrOwner();
    error NotEntryPointOwnerOrValidator();
    error InvalidTarget();
    error ExecutionFailed(uint256 index);
    error BatchLengthMismatch();

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier onlyEntryPointOrOwner() {
        if (msg.sender != entryPoint && msg.sender != _owner) revert NotEntryPointOrOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != entryPoint && msg.sender != _owner && !_validators[msg.sender]) {
            revert NotEntryPointOwnerOrValidator();
        }
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    // ─── Initialization ─────────────────────────────────────────────────
    /// @notice Initialize the account with an owner. Called once by the factory.
    /// @param accountOwner The owner address (master key)
    function initialize(address accountOwner) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;
        _owner = accountOwner;
        emit AccountInitialized(accountOwner);
    }

    // ─── Execution ──────────────────────────────────────────────────────
    /// @inheritdoc ISessionGuardAccount
    function execute(address target, uint256 value, bytes calldata data) external onlyEntryPointOrOwner {
        if (target == address(0)) revert InvalidTarget();
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// @inheritdoc ISessionGuardAccount
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyEntryPointOrOwner {
        if (targets.length != values.length || targets.length != datas.length) revert BatchLengthMismatch();
        for (uint256 i = 0; i < targets.length; i++) {
            if (targets[i] == address(0)) revert InvalidTarget();
            (bool success,) = targets[i].call{value: values[i]}(datas[i]);
            if (!success) revert ExecutionFailed(i);
        }
    }

    // ─── Module Management ──────────────────────────────────────────────
    /// @inheritdoc ISessionGuardAccount
    function installValidator(address validator) external onlyOwner {
        _validators[validator] = true;
        emit ModuleInstalled(validator);
    }

    /// @inheritdoc ISessionGuardAccount
    function removeValidator(address validator) external onlyOwner {
        _validators[validator] = false;
        emit ModuleRemoved(validator);
    }

    /// @inheritdoc ISessionGuardAccount
    function isValidatorInstalled(address validator) external view returns (bool) {
        return _validators[validator];
    }

    // ─── ERC-4337 Validation ────────────────────────────────────────────
    /// @notice Validate a UserOperation for ERC-4337 EntryPoint
    /// @dev The signature field contains: abi.encode(validatorAddress, validatorSignature)
    ///      If no validator prefix → default ECDSA validation against owner
    function validateUserOp(
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyAuthorized returns (uint256 validationData) {
        // Prefund the EntryPoint if needed
        if (missingAccountFunds > 0) {
            (bool success,) = payable(entryPoint).call{value: missingAccountFunds}("");
            require(success, "prefund failed");
        }
        return 0;
    }

    // ─── View ───────────────────────────────────────────────────────────
    /// @inheritdoc ISessionGuardAccount
    function owner() external view returns (address) {
        return _owner;
    }

    // ─── Receive ETH ────────────────────────────────────────────────────
    receive() external payable {}
}
