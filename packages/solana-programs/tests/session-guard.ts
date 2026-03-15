import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SessionGuard } from "../target/types/session_guard";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("session-guard", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SessionGuard as Program<SessionGuard>;
  const owner = provider.wallet;

  let guardAccountPda: PublicKey;
  let guardBump: number;
  let sessionKeypair: Keypair;
  let sessionKeyDataPda: PublicKey;
  let sessionKeyBump: number;

  before(async () => {
    sessionKeypair = Keypair.generate();

    [guardAccountPda, guardBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("session_guard"), owner.publicKey.toBuffer()],
      program.programId
    );

    [sessionKeyDataPda, sessionKeyBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session_key"),
        guardAccountPda.toBuffer(),
        sessionKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  // ─── Account Initialization ──────────────────────────────────────

  it("initializes a SessionGuard account", async () => {
    await program.methods
      .initializeAccount()
      .accounts({
        guardAccount: guardAccountPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.sessionGuardAccount.fetch(guardAccountPda);
    expect(account.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(account.sessionCount.toNumber()).to.equal(0);
  });

  // ─── Session Key Registration ────────────────────────────────────

  it("registers a session key", async () => {
    const now = Math.floor(Date.now() / 1000);
    const validAfter = new anchor.BN(now);
    const validUntil = new anchor.BN(now + 86400); // 24h

    await program.methods
      .registerSessionKey(validAfter, validUntil)
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: sessionKeyDataPda,
        sessionPubkey: sessionKeypair.publicKey,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const session = await program.account.sessionKeyData.fetch(sessionKeyDataPda);
    expect(session.sessionKey.toBase58()).to.equal(sessionKeypair.publicKey.toBase58());
    expect(session.revoked).to.be.false;
    expect(session.policyCount).to.equal(0);

    const guard = await program.account.sessionGuardAccount.fetch(guardAccountPda);
    expect(guard.sessionCount.toNumber()).to.equal(1);
  });

  it("rejects invalid validity window", async () => {
    const invalidKeypair = Keypair.generate();
    const [invalidPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session_key"),
        guardAccountPda.toBuffer(),
        invalidKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .registerSessionKey(new anchor.BN(1000), new anchor.BN(500)) // after > until
        .accounts({
          guardAccount: guardAccountPda,
          sessionKeyData: invalidPda,
          sessionPubkey: invalidKeypair.publicKey,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.toString()).to.include("InvalidValidityWindow");
    }
  });

  // ─── Policy Configuration ────────────────────────────────────────

  it("configures a spending limit policy", async () => {
    const [spendingLimitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("spending_limit"), sessionKeyDataPda.toBuffer()],
      program.programId
    );

    await program.methods
      .configureSpendingLimit(new anchor.BN(1_000_000_000), null) // 1 SOL
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: sessionKeyDataPda,
        spendingLimit: spendingLimitPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.spendingLimitPolicy.fetch(spendingLimitPda);
    expect(policy.maxAmount.toNumber()).to.equal(1_000_000_000);
    expect(policy.amountSpent.toNumber()).to.equal(0);
  });

  it("configures an allowlist policy", async () => {
    const [allowlistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("allowlist"), sessionKeyDataPda.toBuffer()],
      program.programId
    );

    const allowedPrograms = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ];

    await program.methods
      .configureAllowlist(allowedPrograms)
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: sessionKeyDataPda,
        allowlist: allowlistPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.allowlistPolicy.fetch(allowlistPda);
    expect(policy.allowedPrograms.length).to.equal(2);
  });

  it("configures a rate limit policy", async () => {
    const [rateLimitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rate_limit"), sessionKeyDataPda.toBuffer()],
      program.programId
    );

    await program.methods
      .configureRateLimit(100, new anchor.BN(3600))
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: sessionKeyDataPda,
        rateLimit: rateLimitPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.rateLimitPolicy.fetch(rateLimitPda);
    expect(policy.maxOps).to.equal(100);
    expect(policy.windowSeconds.toNumber()).to.equal(3600);
    expect(policy.opsInWindow).to.equal(0);
  });

  it("configures a compute limit policy", async () => {
    const [computeLimitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("compute_limit"), sessionKeyDataPda.toBuffer()],
      program.programId
    );

    await program.methods
      .configureComputeLimit(new anchor.BN(50_000_000))
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: sessionKeyDataPda,
        computeLimit: computeLimitPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.computeLimitPolicy.fetch(computeLimitPda);
    expect(policy.maxComputeUnits.toNumber()).to.equal(50_000_000);
    expect(policy.computeUsed.toNumber()).to.equal(0);
  });

  // ─── Session Key Revocation ──────────────────────────────────────

  it("revokes a session key", async () => {
    // First register a new session to revoke
    const revokeKeypair = Keypair.generate();
    const [revokePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session_key"),
        guardAccountPda.toBuffer(),
        revokeKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .registerSessionKey(new anchor.BN(now), new anchor.BN(now + 86400))
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: revokePda,
        sessionPubkey: revokeKeypair.publicKey,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Revoke it
    await program.methods
      .revokeSessionKey()
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: revokePda,
        owner: owner.publicKey,
      })
      .rpc();

    const session = await program.account.sessionKeyData.fetch(revokePda);
    expect(session.revoked).to.be.true;
  });

  it("rejects double revocation", async () => {
    const revokeKeypair = Keypair.generate();
    const [revokePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("session_key"),
        guardAccountPda.toBuffer(),
        revokeKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .registerSessionKey(new anchor.BN(now), new anchor.BN(now + 86400))
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: revokePda,
        sessionPubkey: revokeKeypair.publicKey,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .revokeSessionKey()
      .accounts({
        guardAccount: guardAccountPda,
        sessionKeyData: revokePda,
        owner: owner.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .revokeSessionKey()
        .accounts({
          guardAccount: guardAccountPda,
          sessionKeyData: revokePda,
          owner: owner.publicKey,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.toString()).to.include("AlreadyRevoked");
    }
  });
});
