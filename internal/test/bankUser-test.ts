import { expect } from "chai";
import { Contract, getRandomNonce, Signer, toNano, WalletTypes } from "locklift";
import { FactorySource } from "../build/factorySource";
import { Account } from "everscale-standalone-client";

let bank: Contract<FactorySource["Bank"]>;
// let bankAccount: Contract<FactorySource["BankAccount"]>;

let userAccount: Account;
let userAccount2: Account;
let userAccount3: Account;
let bankAccount3: Contract<FactorySource["BankAccount"]>;

let bankWallet: Account;
let signer1: Signer;

describe("BankUserTest", async function () {
  before(async () => {
    signer1 = (await locklift.keystore.getSigner("0"))!;
  });
  describe("Contracts", async function () {
    it("Deploy Bank and User Contract", async function () {
      userAccount = await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer1.publicKey,
        })
        .then(res => res.account);

      userAccount2 = await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer1.publicKey,
          nonce: getRandomNonce(),
        })
        .then(res => res.account);

      await locklift.factory.accounts
        .addNewAccount({
          type: WalletTypes.EverWallet,
          value: toNano(10),
          publicKey: signer1.publicKey,
        })
        .then(res => (bankWallet = res.account));
        // console.log("123123"+bankWallet.);
      const { code: userCode } = locklift.factory.getContractArtifacts("BankAccount");
      bank = await locklift.factory
        .deployContract({
          contract: "Bank",
          initParams: {
            userContractCode: userCode,
          },
          constructorParams: {
            _interestRate: 5,
            _owner: bankWallet.address,
          },
          value: toNano(10),
          publicKey: signer1.publicKey,
        })
        .then(res => res.contract);
      expect(await locklift.provider.getBalance(userAccount.address).then(balance => Number(balance))).to.be.above(0);
    });
    it("Interact with contract", async function () {
      const { traceTree: deployUser } = await locklift.tracing.trace(
        bank.methods
          .deployAccountForUser({
            _initBalance: 200,
            _freezer: false,
          })
          .send({
            from: userAccount.address,
            amount: toNano(2),
          }),
      );
      await deployUser?.beautyPrint();
      // const { traceTree: deployUser2 } = await locklift.tracing.trace(
      //   bank.methods
      //     .deployAccountForUser({
      //       _initBalance: 399,
      //       _freezer: false,
      //     })
      //     .send({
      //       from: userAccount2.address,
      //       amount: toNano(2),
      //     }),
      // );
      // await deployUser2?.beautyPrint();

      const { traceTree: getAdd } = await locklift.tracing.trace(
        bank.methods
          .getAddress({
            _accountAddress: userAccount2.address,
          })
          .sendExternal({
            publicKey: signer1.publicKey,
          }),
      );
      const event = deployUser?.findEventsForContract({
        contract: bank,
        name: "AccountDeployed" as const,
      })[0]!;
      let { accountAddress } = event;
      const bankAccount = locklift.factory.getDeployedContract("BankAccount", accountAddress);

      const event2 = getAdd?.findEventsForContract({
        contract: bank,
        name: "AddressReturn" as const,
      })[0]!;
      const { userAddress } = event2;
      // const bankAccount2 = locklift.factory.getDeployedContract("BankAccount", userAddress);
      const bankAccount2 = await bank.methods.getAddress({ _accountAddress: userAccount2.address }).call();
      const bankAccount2Contract = await locklift.factory.getDeployedContract("BankAccount", bankAccount2.value0);
      const { traceTree: borrowMoney } = await locklift.tracing.trace(
        bankAccount.methods
          .borrowMoney({
            _amount: 1000,
          })
          .send({
            from: userAccount.address,
            amount: toNano(1),
          }),
      );

      await borrowMoney?.beautyPrint();
      const totalrepayAmount = await bank.methods.calculating().call();

      const { traceTree: repaid } = await locklift.tracing.trace(
        bankAccount.methods
          .repayLoan({
            _repayAmount: Number(totalrepayAmount.value0),
          })
          .send({
            from: userAccount.address,
            amount: toNano(1),
          }),
      );
      await repaid?.beautyPrint();

      const { traceTree: MintMoney } = await locklift.tracing.trace(
        bank.methods
          .mintAccount({
            _accountAddress: userAccount2.address,
            _money: 200,
          })
          .send({
            from: bankWallet.address,
            amount: toNano(10),
          }),
        {
          allowedCodes: {
            compute: [null],
          },
        },
      );
      await MintMoney?.beautyPrint();
      const response4 = await bankAccount.methods.getMoney().call();
      const addr = await bankAccount.methods.getAddress({ _accountAddress: userAccount2.address }).call();
      const { traceTree: sendMoney } = await locklift.tracing.trace(
        bankAccount.methods
          .sendMoneyToUser({
            _money: 24,
            _destAddress: bankAccount2.value0,
          })
          .send({
            from: userAccount.address,
            amount: toNano(1),
          }),
        {
          allowedCodes: {
            compute: [1222],
          },
        },
      );
      await sendMoney?.beautyPrint();

      // const { traceTree: freeze } = await locklift.tracing.trace(
      //   bank.methods
      //     .freezeUserAccount({
      //       _userAddress: bankAccount2.address,
      //       _freezer: true,
      //     })
      //     .send({
      //       from: bankWallet.address,
      //       amount: toNano(1),
      //     }),
      // );
      // await freeze?.beautyPrint();

      const { traceTree: sendMoney2 } = await locklift.tracing.trace(
        bankAccount2Contract.methods
          .sendMoneyToUser({
            _money: 100,
            _destAddress: bankAccount.address,
          })
          .send({
            from: userAccount2.address,
            amount: toNano(1),
          }),
      );
      await sendMoney2?.beautyPrint();
      // const response = await bank.methods.getProfit({}).call();
      // console.log(response);
      // const response2 = await bankAccount.methods.getMoney().call();
      // console.log(response2);
      // const response3 = await bankAccount2.methods.getMoney().call();
      // console.log(response3);
      // // console.log(bankAccount3.address);
      //
      // console.log(response4);
    });
  });
});
