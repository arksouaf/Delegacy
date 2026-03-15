// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {SpendingLimitPolicy} from "../../src/policies/SpendingLimitPolicy.sol";

contract SpendingLimitPolicyTest is Test {
    SpendingLimitPolicy policy;
    address account;
    address sessionKey;

    function setUp() public {
        policy = new SpendingLimitPolicy();
        account = makeAddr("account");
        sessionKey = makeAddr("sessionKey");
    }

    function test_configureAndCheckLimit() public {
        policy.configureLimit(account, sessionKey, 1 ether);

        // Should allow a 0.5 ETH spend
        bool allowed = policy.checkPolicy(account, sessionKey, address(0x1), 0.5 ether, "");
        assertTrue(allowed);

        // Should allow exactly 1 ETH
        allowed = policy.checkPolicy(account, sessionKey, address(0x1), 1 ether, "");
        assertTrue(allowed);

        // Should deny 1.5 ETH (over limit)
        allowed = policy.checkPolicy(account, sessionKey, address(0x1), 1.5 ether, "");
        assertFalse(allowed);
    }

    function test_cumulativeSpending() public {
        policy.configureLimit(account, sessionKey, 1 ether);

        // Spend 0.6 ETH
        policy.updatePolicy(account, sessionKey, address(0x1), 0.6 ether, "");

        // Should deny another 0.6 ETH (total would be 1.2)
        bool allowed = policy.checkPolicy(account, sessionKey, address(0x1), 0.6 ether, "");
        assertFalse(allowed);

        // Should allow 0.4 ETH (total would be exactly 1.0)
        allowed = policy.checkPolicy(account, sessionKey, address(0x1), 0.4 ether, "");
        assertTrue(allowed);
    }

    function test_remainingLimit() public {
        policy.configureLimit(account, sessionKey, 1 ether);
        assertEq(policy.remainingLimit(account, sessionKey), 1 ether);

        policy.updatePolicy(account, sessionKey, address(0x1), 0.3 ether, "");
        assertEq(policy.remainingLimit(account, sessionKey), 0.7 ether);
    }

    function test_unconfiguredMeansNoLimit() public {
        bool allowed = policy.checkPolicy(account, sessionKey, address(0x1), 100 ether, "");
        assertTrue(allowed);
        assertEq(policy.remainingLimit(account, sessionKey), type(uint256).max);
    }
}
