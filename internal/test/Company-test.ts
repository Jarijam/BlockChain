import { expect } from "chai";
import { Contract, Signer, toNano, WalletTypes } from "locklift";
import { FactorySource } from "../build/factorySource";
import { Account } from "everscale-standalone-client";

let company: Contract<FactorySource["Company"]>;
let signer: Signer;
let workerAccount: Account;
let companyAccount: Account;

type Worker = {
  workerAccount: Account;
  workerContract: Contract<FactorySource["Worker"]>;
};
const workers: Array<Worker> = [];

describe("Company Sample contract", async function () {
  before(async () => {
    signer = (await locklift.keystore.getSigner("0"))!;
  });
  describe("Contracts", async function () {
    it("Deploy contract", async function () {
      const { code: workerCode } = locklift.factory.getContractArtifacts("Worker");
      companyAccount = await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer.publicKey,
        })
        .then(res => res.account);
      const { contract } = await locklift.factory.deployContract({
        contract: "Company",
        publicKey: signer.publicKey,
        initParams: {
          owner: companyAccount.address,
          workerCode: workerCode,
        },
        constructorParams: {},
        value: locklift.utils.toNano(2),
      });
      company = contract;

      for (let workerIndex of [1, 4]) {
        let { account: workerOwnerAccount } = await locklift.factory.accounts.addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer.publicKey,
          nonce: locklift.utils.getRandomNonce(),
        });
      }
      workerAccount = await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer.publicKey,
        })
        .then(res => res.account);
      expect(await locklift.provider.getBalance(workerAccount.address).then(balance => Number(balance))).to.be.above(0);
    });

    it("Interact with contract", async function () {
      const { traceTree } = await locklift.tracing.trace(
        company.methods.deployAccountForWorker().send({
          from: workerAccount.address,
          amount: toNano(2),
        }),
        // company.methods.deployAccountForWorker().sendExternal({
        //   publicKey: signer.publicKey,
        // }),
      );
      await traceTree?.beautyPrint();

      const event = traceTree?.findEventsForContract({
        contract: company,
        name: "AccountDeployed" as const,
      })[0]!;
      const { workerAddress } = event;
      const worker = locklift.factory.getDeployedContract("Worker", workerAddress);
      const details = await worker.methods.getDetails().call();
      console.log(`Caller address ${workerAccount.address.toString()}`);
      console.log(`Deplyed account address ${details._owner.toString()}`);

      const { traceTree: workerDoWork } = await locklift.tracing.trace(
        worker.methods.startWork().send({
          from: workerAccount.address,
          amount: toNano(2),
        }),
      );
      await workerDoWork?.beautyPrint();
      const { traceTree: workerDoWork2 } = await locklift.tracing.trace(
        worker.methods.startWork().send({
          from: workerAccount.address,
          amount: toNano(2),
        }),
      );
      await workerDoWork2?.beautyPrint();

      const detail = await company.methods.getDetails().call();
      console.log(`${detail._salary.toString()}, ${detail._totalSalaryPayed.toString()}`);
    });
  });
});
