
# Contract Verification Guide

This package includes a Hardhat deployment setup for deploying and verifying the Moolaah contracts on **Avalanche Fuji**.

Verification makes the source code public on the explorer and proves that the deployed bytecode matches the compiled source and settings. Hardhat supports verification through the `hardhat-verify` plugin, and Snowtrace supports Etherscan-compatible verification flows for Avalanche C-Chain and Fuji. :contentReference[oaicite:0]{index=0}

---

## What is supported in this package

This setup is intended for:

- **Solidity contract verification through Hardhat**
- **Snowtrace / Etherscan-compatible explorer verification**
- **Manual verification fallback for Vyper contracts if needed**

Because this repo mixes **Solidity** and **Vyper**, the Solidity contracts are the easiest to verify through Hardhat, while the Vyper contracts may still require manual verification on the explorer depending on explorer support and artifact handling. :contentReference[oaicite:1]{index=1}

---

## Prerequisites

Before verifying, make sure:

- contracts were compiled with the **same compiler versions and settings** used for deployment
- your `hardhat.config.ts` includes the verification plugin
- your `.env` includes a valid explorer API key
- the deployed contracts have had enough time to index on the explorer

Verification depends on matching the original source, compiler version, constructor args, and compiler settings. :contentReference[oaicite:2]{index=2}

---

## 1) Install the verification plugin

If it is not already installed, add it to the project:

```bash
npm install --save-dev @nomicfoundation/hardhat-verify@hh2
````

Then import it in `hardhat.config.ts`:

```ts
import "@nomicfoundation/hardhat-verify";
```

Hardhat’s verification docs describe using the `hardhat-verify` plugin for explorer verification. ([Hardhat][1])

---

## 2) Add the explorer API key

In `.env`, add:

```bash
SNOWTRACE_API_KEY=your_api_key_here
```

Then in `hardhat.config.ts`, include:

```ts
etherscan: {
  apiKey: {
    avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
  },
},
```

Snowtrace supports Etherscan-compatible verification, and Hardhat verification uses explorer API configuration from the project config. ([Snowtrace Blockchain Explorer][2])

---

## 3) Verify a Solidity contract manually

General command:

```bash
npx hardhat verify --network avalancheFuji DEPLOYED_ADDRESS "arg1" "arg2" "arg3"
```

Example:

```bash
npx hardhat verify --network avalancheFuji 0xYourContractAddress 0xYourOperatorAddress
```

Hardhat’s standard verification flow is to run the `verify` task with the deployment network, contract address, and constructor arguments. ([Hardhat][1])

---

## 4) Auto-verify during deployment

This package can also verify contracts inside the deploy script.

The normal pattern is:

1. deploy contract
2. wait for deployment
3. wait a short time for explorer indexing
4. call Hardhat verification task with the same constructor args

Example helper:

```ts
async function verifyOnExplorer(address: string, constructorArguments: any[] = []) {
  if (network.name === "hardhat" || network.name === "localhost") return;

  try {
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await run("verify:verify", {
      address,
      constructorArguments,
    });

    console.log(`Verified: ${address}`);
  } catch (err: any) {
    const msg = String(err?.message || err);

    if (
      msg.toLowerCase().includes("already verified") ||
      msg.toLowerCase().includes("contract source code already verified")
    ) {
      console.log(`Already verified: ${address}`);
      return;
    }

    console.error(`Verification failed for ${address}`);
    console.error(msg);
  }
}
```

Hardhat supports programmatic verification as part of deployment workflows. ([Hardhat][1])

---

## 5) Vyper contracts

This repository includes Vyper contracts.

For Vyper contracts, verification may need to be done manually on the explorer if Hardhat verification does not handle the artifact path cleanly in the current setup. Snowtrace provides a contract verification interface for Avalanche C-Chain and Fuji. ([Avalanche Builder Hub][3])

When manually verifying a Vyper contract, you will typically need:

* the deployed contract address
* the exact source file
* compiler version
* constructor arguments
* optimizer/compiler settings matching deployment

---

## 6) Common verification failures

### Constructor args mismatch

This means the deployed contract address is correct, but the constructor parameters given during verification do not exactly match the deployment values.

### Wrong compiler settings

If compiler version, optimizer settings, or EVM target differ from the deploy build, verification will fail. Hardhat’s verification flow depends on reproducing the original build settings. ([Hardhat][1])

### Explorer not indexed yet

If verification is attempted too quickly after deployment, explorers may not yet have the bytecode indexed. Waiting briefly and retrying often fixes this.

### Already verified

This is safe to ignore.

---

## 7) Current compile settings for this package

This package is configured to compile with:

* **Solidity 0.8.30**
* **Vyper 0.3.10**
* **EVM target: Cancun**

Cancun targeting is required here because the installed OpenZeppelin version uses newer memory instructions such as `mcopy`, which are not available when compiling for older EVM targets like `paris`. ([Hardhat][1])

Example config section:

```ts
solidity: {
  compilers: [
    {
      version: "0.8.30",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "cancun",
        viaIR: false,
      },
    },
  ],
},
vyper: {
  compilers: [
    {
      version: "0.3.10",
    },
  ],
},
```

---

## 8) Avalanche / Snowtrace note

This setup is intended for **Avalanche Fuji**.

Snowtrace is the explorer used here for verification on Avalanche’s C-Chain environment, and Avalanche’s developer docs point builders to Snowtrace verification for contract verification on C-Chain and Fuji. ([Avalanche Builder Hub][3])

---

## 9) Best practice

For this repo:

* verify **Solidity contracts** with Hardhat
* verify **Vyper contracts** manually if the automated flow does not support them cleanly
* store constructor arguments during deployment
* keep deploy and verify using the exact same compiler settings

That will save time and avoid most verification failures.

```


[1]: https://hardhat.org/docs/guides/smart-contract-verification?utm_source=chatgpt.com "Verifying smart contracts"
[2]: https://snowtrace.io/documentation/recipes/hardhat-verification?utm_source=chatgpt.com "Hardhat Verification - Snowtrace Multichain Blockchain Explorer"
[3]: https://build.avax.network/docs/primary-network/verify-contract/snowtrace?utm_source=chatgpt.com "Using Snowtrace | Avalanche Builder Hub"
