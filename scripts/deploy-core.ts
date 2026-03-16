import hre from "hardhat";

const { ethers } = hre;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function deployContract(name: string, args: any[] = []) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`${name} deployed: ${address}`);
  return contract;
}

async function main() {
  const operator = env("OPERATOR");
  const cre = env("CRE");
  const router = env("FUNCTIONS_ROUTER");
  const subId = BigInt(env("FUNCTIONS_SUB_ID"));
  const donId = env("FUNCTIONS_DON_ID");

  const poolVariant = Number(process.env.POOL_VARIANT || "0");
  const poolAnimalCount = BigInt(process.env.POOL_ANIMAL_COUNT || "100");
  const poolMaxAnimalCount = BigInt(process.env.POOL_MAX_ANIMAL_COUNT || "250");
  const callbackGasLimit = Number(process.env.CALLBACK_GAS_LIMIT || "11111111");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Operator: ${operator}`);
  console.log(`CRE: ${cre}`);
  console.log(`Functions Router: ${router}`);
  console.log(`Functions Sub ID: ${subId.toString()}`);
  console.log(`Functions DON ID: ${donId}`);

  // 1. ValuationRegistry
  const valuationRegistry = await deployContract("ValuationRegistry", [operator]);

  // 2. MoolahVault (Vyper)
  const moolahVault = await deployContract("MoolahVault", [
    router,
    subId,
    donId
  ]);

  // 3. MortalityBuffer
  const mortalityBuffer = await deployContract("MortalityBuffer", [
    operator,
    await moolahVault.getAddress()
  ]);

  // 4. MasterController
  const masterController = await deployContract("MasterController", [
    operator,
    await valuationRegistry.getAddress(),
    await mortalityBuffer.getAddress()
  ]);

  // Post-deploy wiring
  console.log("Wiring MortalityBuffer -> MasterController");
  await (
    await mortalityBuffer.setMasterController(await masterController.getAddress())
  ).wait();

  console.log("Wiring ValuationRegistry -> MasterController");
  await (
    await valuationRegistry.setOperator(await masterController.getAddress())
  ).wait();

  // 5. SyntheticPoolFactory
  const syntheticPoolFactory = await deployContract("SyntheticPoolFactory", [
    await moolahVault.getAddress()
  ]);

  // 6. Create pool config in factory first, then deploy SyntheticLivestockPool
  console.log("Creating synthetic pool config...");
  const nextPoolIdBefore = await syntheticPoolFactory.nextPoolId();
  await (
    await syntheticPoolFactory.createPool(poolVariant, poolAnimalCount)
  ).wait();
  const poolId = nextPoolIdBefore;

  console.log(`Reserved poolId: ${poolId.toString()}`);

  const syntheticLivestockPool = await deployContract("SyntheticLivestockPool", [
    await moolahVault.getAddress(),
    await syntheticPoolFactory.getAddress(),
    poolId,
    poolAnimalCount,
    poolVariant,
    poolMaxAnimalCount
  ]);

  // Optional/likely needed authorization in vault
  if (typeof moolahVault.set_authorized_minter === "function") {
    console.log("Authorizing SyntheticLivestockPool as minter in MoolahVault...");
    await (
      await moolahVault.set_authorized_minter(
        await syntheticLivestockPool.getAddress(),
        true
      )
    ).wait();
  }

  // 7. PriceOracleConsumer
  const priceOracleConsumer = await deployContract("PriceOracleConsumer", [
    router,
    await moolahVault.getAddress()
  ]);

  // 8. PriceUpdateAutomation
  const priceUpdateAutomation = await deployContract("PriceUpdateAutomation", [
    await priceOracleConsumer.getAddress(),
    await masterController.getAddress(),
    subId,
    callbackGasLimit,
    donId
  ]);

  // Oracle wiring
  if (typeof moolahVault.set_oracle_consumer === "function") {
    console.log("Setting oracle consumer in MoolahVault...");
    await (
      await moolahVault.set_oracle_consumer(await priceOracleConsumer.getAddress())
    ).wait();
  }

  if (typeof priceOracleConsumer.setAutomationContract === "function") {
    console.log("Setting automation contract in PriceOracleConsumer...");
    await (
      await priceOracleConsumer.setAutomationContract(
        await priceUpdateAutomation.getAddress()
      )
    ).wait();
  }

  console.log("\n=== DEPLOY SUMMARY ===");
  console.log(`ValuationRegistry      ${await valuationRegistry.getAddress()}`);
  console.log(`MoolahVault            ${await moolahVault.getAddress()}`);
  console.log(`MortalityBuffer        ${await mortalityBuffer.getAddress()}`);
  console.log(`MasterController       ${await masterController.getAddress()}`);
  console.log(`SyntheticPoolFactory   ${await syntheticPoolFactory.getAddress()}`);
  console.log(`SyntheticLivestockPool ${await syntheticLivestockPool.getAddress()}`);
  console.log(`PriceOracleConsumer    ${await priceOracleConsumer.getAddress()}`);
  console.log(`PriceUpdateAutomation  ${await priceUpdateAutomation.getAddress()}`);
  console.log(`Pool ID                ${poolId.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
