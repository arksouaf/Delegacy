// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {SessionKeyValidator} from "../src/validators/SessionKeyValidator.sol";
import {SpendingLimitPolicy} from "../src/policies/SpendingLimitPolicy.sol";
import {AllowlistPolicy} from "../src/policies/AllowlistPolicy.sol";
import {IPolicy} from "../src/interfaces/IPolicy.sol";

contract SessionKeyValidatorTest is Test {
    SessionKeyValidator validator;
    SpendingLimitPolicy spendPolicy;
    AllowlistPolicy allowlistPolicy;

    address account;
    uint256 sessionKeyPrivateKey;
    address sessionKey;

    function setUp() public {
        validator = new SessionKeyValidator();
        spendPolicy = new SpendingLimitPolicy();
        allowlistPolicy = new AllowlistPolicy();

        account = makeAddr("account");
        sessionKeyPrivateKey = 0xABCD;
        sessionKey = vm.addr(sessionKeyPrivateKey);
    }

    function test_registerSessionKey() public {
        IPolicy[] memory policies = new IPolicy[](1);
        policies[0] = IPolicy(address(spendPolicy));

        vm.prank(account);
        validator.registerSessionKey(
            sessionKey,
            uint48(block.timestamp),
            uint48(block.timestamp + 1 hours),
            policies
        );

        assertTrue(validator.isSessionKeyValid(account, sessionKey));
    }

    function test_cannotRegisterDuplicate() public {
        IPolicy[] memory policies = new IPolicy[](0);

        vm.prank(account);
        validator.registerSessionKey(sessionKey, uint48(block.timestamp), uint48(block.timestamp + 1 hours), policies);

        vm.prank(account);
        vm.expectRevert();
        validator.registerSessionKey(sessionKey, uint48(block.timestamp), uint48(block.timestamp + 1 hours), policies);
    }

    function test_revokeSessionKey() public {
        IPolicy[] memory policies = new IPolicy[](0);

        vm.prank(account);
        validator.registerSessionKey(sessionKey, uint48(block.timestamp), uint48(block.timestamp + 1 hours), policies);

        assertTrue(validator.isSessionKeyValid(account, sessionKey));

        vm.prank(account);
        validator.revokeSessionKey(sessionKey);

        assertFalse(validator.isSessionKeyValid(account, sessionKey));
    }

    function test_expiredSessionKeyInvalid() public {
        IPolicy[] memory policies = new IPolicy[](0);

        vm.prank(account);
        validator.registerSessionKey(
            sessionKey,
            uint48(block.timestamp),
            uint48(block.timestamp + 1 hours),
            policies
        );

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);
        assertFalse(validator.isSessionKeyValid(account, sessionKey));
    }

    function test_notYetValidSessionKey() public {
        IPolicy[] memory policies = new IPolicy[](0);
        uint48 futureStart = uint48(block.timestamp + 1 hours);

        vm.prank(account);
        validator.registerSessionKey(sessionKey, futureStart, uint48(block.timestamp + 2 hours), policies);

        assertFalse(validator.isSessionKeyValid(account, sessionKey));
    }

    function test_getSessionKeys() public {
        IPolicy[] memory policies = new IPolicy[](0);

        vm.startPrank(account);
        validator.registerSessionKey(sessionKey, uint48(block.timestamp), uint48(block.timestamp + 1 hours), policies);
        address sk2 = makeAddr("sk2");
        validator.registerSessionKey(sk2, uint48(block.timestamp), uint48(block.timestamp + 1 hours), policies);
        vm.stopPrank();

        address[] memory keys = validator.getSessionKeys(account);
        assertEq(keys.length, 2);
        assertEq(keys[0], sessionKey);
        assertEq(keys[1], sk2);
    }
}
