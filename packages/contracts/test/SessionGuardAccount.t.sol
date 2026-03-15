// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {SessionGuardAccount} from "../src/core/SessionGuardAccount.sol";
import {SessionGuardFactory} from "../src/core/SessionGuardFactory.sol";

contract SessionGuardAccountTest is Test {
    SessionGuardFactory factory;
    address entryPoint;
    address owner;
    address attacker;

    function setUp() public {
        entryPoint = makeAddr("entryPoint");
        owner = makeAddr("owner");
        attacker = makeAddr("attacker");
        factory = new SessionGuardFactory(entryPoint);
    }

    function test_createAccount() public {
        address account = factory.createAccount(owner, 0);
        assertTrue(account != address(0), "account should be deployed");

        SessionGuardAccount sa = SessionGuardAccount(payable(account));
        assertEq(sa.owner(), owner, "owner should match");
    }

    function test_cannotReinitialize() public {
        address account = factory.createAccount(owner, 0);
        SessionGuardAccount sa = SessionGuardAccount(payable(account));

        vm.expectRevert();
        sa.initialize(attacker);
    }

    function test_onlyOwnerCanInstallValidator() public {
        address account = factory.createAccount(owner, 0);
        SessionGuardAccount sa = SessionGuardAccount(payable(account));
        address validator = makeAddr("validator");

        vm.prank(attacker);
        vm.expectRevert();
        sa.installValidator(validator);

        vm.prank(owner);
        sa.installValidator(validator);
        assertTrue(sa.isValidatorInstalled(validator));
    }

    function test_executeOnlyByEntryPointOrOwner() public {
        address account = factory.createAccount(owner, 0);
        SessionGuardAccount sa = SessionGuardAccount(payable(account));
        address target = makeAddr("target");

        vm.prank(attacker);
        vm.expectRevert();
        sa.execute(target, 0, "");

        // Owner can execute
        vm.deal(account, 1 ether);
        vm.prank(owner);
        sa.execute(target, 0, "");
    }

    function test_receiveEther() public {
        address account = factory.createAccount(owner, 0);
        vm.deal(address(this), 1 ether);
        (bool ok,) = account.call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(account.balance, 0.5 ether);
    }
}
