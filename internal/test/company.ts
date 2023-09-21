import { Contract, Signer, toNano, WalletTypes } from "locklift";
import { FactorySource } from "../build/factorySource";
import { Account } from "everscale-standalone-client";

let sample: Contract<FactorySource["Fibonacci"]>;

type Company = {
  signer: Signer;
  ownerAccount: Account;
  contract: Contract<FactorySource["Company"]>;
  workers: Array<Worker>;
};

// type Worker = {
//   workerAccount: Account;
//   workerContract: Contract<FactorySource["Worker"]>;
// };

const companies: Array<Company> = [];

describe("Test Sample contract", async function () {
  describe("Contracts", async function () {
    it("Deploy contract", async function () {
      //create companies
      for (let companyIdx of [1, 2]) {
        const signer = (await locklift.keystore.getSigner(`${companyIdx}`))!;
        const companyOwnerAccount = await locklift.factory.accounts
          .addNewAccount({
            type: WalletTypes.EverWallet,
            value: toNano(10),
            publicKey: signer.publicKey,
            nonce: locklift.utils.getRandomNonce(),
          })
          .then(res => res.account);
        console.log(`Company ${companyIdx} Owner account: ${companyOwnerAccount.address}`);
        const { code: workerCode } = locklift.factory.getContractArtifacts("Worker");
        const { contract: companyContract } = await locklift.factory.deployContract({
          contract: "Company",
          publicKey: signer.publicKey,
          initParams: {
            owner: companyOwnerAccount.address,
            workerCode,
          },
          constructorParams: {},
          value: toNano(1),
        });
        console.log(`Company ${companyIdx} address: ${companyContract.address}`);

        let workers: Array<Worker> = [];
        // create workers
        for (let workerIdx of [1, 2]) {
          let { account: workerOwnerAccount } = await locklift.factory.accounts.addNewAccount({
            type: WalletTypes.EverWallet,
            value: toNano(10),
            publicKey: signer.publicKey,
            nonce: locklift.utils.getRandomNonce(),
          });
          console.log(`Company ${companyIdx} Worker ${workerIdx} account: ${workerOwnerAccount.address}`);

          // const { contract: workerContract } = await locklift.factory.deployContract({
          //   contract: "Worker",
          //   constructorParams: {},
          //   initParams: {
          //     owner: workerOwnerAccount.address,
          //     company: companyContract.address,
          //   },
          //   value: toNano(1),
          //   publicKey: signer.publicKey,
          // });
          // console.log(`Company ${companyIdx} Worker ${workerIdx} contract: ${workerContract.address}`);

          // workers.push({
          //   workerAccount: workerOwnerAccount,
          //   workerContract,
          // });
        }

        const company: Company = {
          signer,
          ownerAccount: companyOwnerAccount,
          workers,
          contract: companyContract,
        };
        companies.push(company);
      }
    });

    it("Register workers", async function () {
      for (let company of companies) {
        for (let worker of company.workers) {
          const { traceTree } = await locklift.tracing.trace(
            company.contract.methods
              .registerWorker({
                _worker: worker.workerContract.address,
              })
              .send({
                from: company.ownerAccount.address,
                amount: toNano(1),
              }),
          );
          await traceTree?.beautyPrint();
        }
      }
    });
    it("Do work", async function () {
      for (let company of companies) {
        for (let worker of company.workers) {
          const { traceTree } = await locklift.tracing.trace(
            worker.workerContract.methods.startWork().send({
              from: worker.workerAccount.address,
              amount: toNano(1),
            }),
          );
          await traceTree?.beautyPrint();
        }
      }
    });
    it("Check details", async function () {
      for (let company of companies) {
        const companyDetails = await company.contract.methods.getDetails().call();
        console.log(`Company ${company.contract.address} details: ${JSON.stringify(companyDetails, null, 4)}`);
        for (let worker of company.workers) {
          const details = await worker.workerContract.methods.getDetails().call();
          console.log(
            `Company ${company.contract.address} Worker ${worker.workerContract.address} details: ${JSON.stringify(
              details,
              null,
              4,
            )}`,
          );
        }
      }
    });
  });
});
