async function main() {
  const FinancialCom = await ethers.getContractFactory("FinancialCom");

  // Start deployment, returning a promise that resolves to a contract object
  const FinancialCom_ = await FinancialCom.deploy();
  console.log("FinancialCom address:", FinancialCom_.address);

}

main()
 .then(() => process.exit(0))
 .catch(error => {
   console.error(error);
   process.exit(1);
 });

