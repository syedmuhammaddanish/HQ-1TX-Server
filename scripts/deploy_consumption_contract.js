async function main() {
  const ConsumptionStorage = await ethers.getContractFactory("ConsumptionStorage");

  // Start deployment, returning a promise that resolves to a contract object
  const ConsumptionStorage_ = await ConsumptionStorage.deploy();
  console.log("PlannedConsumptionStorage address:", ConsumptionStorage_.address);


}

main()
 .then(() => process.exit(0))
 .catch(error => {
   console.error(error);
   process.exit(1);
 });