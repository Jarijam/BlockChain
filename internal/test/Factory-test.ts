import { expect } from "chai";
import { Contract, Signer, toNano, WalletTypes } from "locklift";
import { FactoryAccountAbi, FactorySource } from "../build/factorySource";
import { Account } from "everscale-standalone-client";

let accountFactory: Contract<FactorySource["Factory"]>;
let signer: Signer;
let user: Account;
describe("Test Sample contract", async function () {
  before(async () => {
    signer = (await locklift.keystore.getSigner("0"))!;
  });
  describe("Contracts", async function () {
    it("Deploy contract", async function () {
      const INIT_STATE = 0;
      const { code: factoryAccountCode } = locklift.factory.getContractArtifacts("FactoryAccount");
      const { contract } = await locklift.factory.deployContract({
        contract: "Factory",
        publicKey: signer.publicKey,
        initParams: {
          accountCode: factoryAccountCode,
        },
        constructorParams: {},
        value: locklift.utils.toNano(2),
      });
      accountFactory = contract;
      user = await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer.publicKey,
        })
        .then(res => res.account);
      expect(await locklift.provider.getBalance(accountFactory.address).then(balance => Number(balance))).to.be.above(
        0,
      );
    });

    it("Interact with contract", async function () {
      const { traceTree } = await locklift.tracing.trace(
        accountFactory.methods.deployAccountForUser().send({
          from: user.address,
          amount: toNano(2),
        }),
      );
      await traceTree?.beautyPrint();

      const event = traceTree?.findEventsForContract({
        contract: accountFactory,
        name: "AccountDeployed" as const,
      })[0]!;
      const { accountAddress } = event;
      const factoryAccount = locklift.factory.getDeployedContract("FactoryAccount", accountAddress);
      const details = await factoryAccount.methods.getDetails().call();
      console.log(`Caller address ${user.address.toString()}`);
      console.log(`Deployed account address ${details.value0.toString()}`);
    });
  });
});
