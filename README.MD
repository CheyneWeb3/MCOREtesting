
# Moolaah Core Deploy Fix

This package is a cleaned Hardhat deployment setup for compiling and deploying the Moolaah core contracts, including both **Solidity** and **Vyper** contracts.

It is intended to help get the project compiling and deploying correctly on **Avalanche Fuji** with the correct **Cancun EVM target**.

---

## What this package includes

This deploy package is set up to support:

- Solidity contracts
- Vyper contracts
- Hardhat deployment scripts
- Avalanche Fuji deployment
- Chainlink Functions router configuration
- mixed `.sol` + `.vy` compilation

---

## Important notes before installing

This project uses:

- **Hardhat 2**
- **TypeScript**
- **@nomicfoundation/hardhat-toolbox@hh2**
- **@nomiclabs/hardhat-vyper@hh2**
- **Solidity 0.8.30**
- **Vyper 0.3.10**
- **EVM target = Cancun**

### Why Cancun is required

The installed OpenZeppelin version uses newer memory utilities that rely on Cancun-compatible opcodes such as `mcopy`.

If `evmVersion` is left as the default older target like `paris`, compilation will fail.

---

## Recommended folder structure

Make sure the project looks like this:

```text
project-root/
├─ contracts/
│  ├─ core/
│  ├─ features/
│  ├─ interfaces/
│  ├─ oracles/
│  └─ shadow/
├─ scripts/
│  └─ deploy-core.ts
├─ test/
├─ .env
├─ hardhat.config.ts
├─ tsconfig.json
└─ package.json
````

---

## Install steps

Open a terminal in the project root and run:

```bash
npm install
```

If dependencies are not yet installed correctly, use this exact stack:

```bash
npm uninstall hardhat @nomicfoundation/hardhat-toolbox @nomiclabs/hardhat-vyper
npm install --save-dev hardhat@^2.26.3 @nomicfoundation/hardhat-toolbox@hh2 @nomiclabs/hardhat-vyper@hh2 typescript ts-node @types/node dotenv @openzeppelin/contracts @chainlink/contracts
```

---

## package.json requirements

Make sure `package.json` does **not** contain:

```json
"type": "module"
```

This setup is using the Hardhat 2 TypeScript flow, not the Hardhat 3 ESM-only flow.

Suggested scripts:

```json
"scripts": {
  "clean": "npx hardhat clean",
  "compile": "npx hardhat compile",
  "deploy:fuji": "npx hardhat run scripts/deploy-core.ts --network avalancheFuji"
}
```

---

## .env setup

Create a `.env` file in the project root.

Example:

```bash
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

OPERATOR=0xYourOperatorAddress
CRE=0x44583593a8326B4cA58CF14d6d1B9f8aA4C22014

FUNCTIONS_ROUTER=0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0
FUNCTIONS_SUB_ID=15761
FUNCTIONS_DON_ID=0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000

POOL_VARIANT=0
POOL_ANIMAL_COUNT=100
POOL_MAX_ANIMAL_COUNT=250
CALLBACK_GAS_LIMIT=11111111
```

### Important

`PRIVATE_KEY` must be a valid 32-byte hex private key.

Correct format:

```text
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

Do **not** use:

* wallet address
* seed phrase
* shortened key
* quoted key with spaces

---

## hardhat.config.ts requirements

The Solidity config must explicitly target **Cancun**.

Example key section:

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

Without `evmVersion: "cancun"`, compilation may fail because newer OpenZeppelin code uses Cancun-era instructions.

---

## Compile

Run:

```bash
npm run clean
npm run compile
```

If successful, Hardhat will generate the artifacts and cache folders automatically.

---

## Deploy

To deploy to Avalanche Fuji:

```bash
npm run deploy:fuji
```

This uses:

```text
scripts/deploy-core.ts
```

---

## Core deployment order used

The deployment flow is:

1. `ValuationRegistry`
2. `MoolahVault`
3. `MortalityBuffer`
4. `MasterController`
5. wire `MortalityBuffer` to `MasterController`
6. wire `ValuationRegistry` to `MasterController`
7. `SyntheticPoolFactory`
8. create synthetic pool config
9. `SyntheticLivestockPool`
10. authorize pool in vault if required
11. `PriceOracleConsumer`
12. `PriceUpdateAutomation`
13. wire oracle consumer + automation into vault/oracle layer

---

## Router clarification

The `router` used by this repo is **not** a Uniswap-style swap router.

It refers to the **Chainlink Functions Router**.

For Avalanche Fuji, this is set in `.env` as:

```text
FUNCTIONS_ROUTER=0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0
```

---

## Known notes

* This setup is for **Avalanche Fuji**
* Solidity compiles with **0.8.30**
* Vyper compiles with **0.3.10**
* The repo includes both Solidity and Vyper contracts
* Some repo files may still produce warnings for missing SPDX or missing pragma lines, but those warnings do not necessarily block compilation
* Some older contracts originally written for older OpenZeppelin versions were patched for current compatibility

---

## If compile fails

Check these first:

### 1. Wrong Hardhat/plugin versions

Use:

* `hardhat@^2.26.3`
* `@nomicfoundation/hardhat-toolbox@hh2`
* `@nomiclabs/hardhat-vyper@hh2`

### 2. Missing Cancun target

Make sure:

```ts
evmVersion: "cancun"
```

### 3. Bad private key

Make sure `.env` contains a real 32-byte key.

### 4. Wrong file placement

Make sure contracts are inside `contracts/` and deploy script is inside `scripts/`.

---

## Final note

This deploy package was prepared specifically to get the Moolaah core contracts compiling and deployable in a clean Hardhat environment.

If additional repo-specific contract logic still needs patching after compile, those fixes should be handled contract-by-contract after the base toolchain is confirmed working.

```
