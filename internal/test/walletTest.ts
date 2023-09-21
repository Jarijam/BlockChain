import { Contract, fromNano, Signer, toNano } from "locklift";
import { FactorySource } from "../build/factorySource";

let sample: Contract<FactorySource["Fibonacci"]>;
let signer1: Signer;
let signer2: Signer;

let user1: Contract<FactorySource["SimpleWallet"]>;
let user2: Contract<FactorySource["SimpleWallet"]>;

describe("Test", async function () {
  before(async () => {
    signer1 = (await locklift.keystore.getSigner("0"))!;
    signer2 = (await locklift.keystore.getSigner("1"))!;
  });
  describe("Contracts", async function () {
    it("Deploy users", async function () {
      user1 = await locklift.factory
        .deployContract({
          contract: "SimpleWallet",
          initParams: {},
          constructorParams: {
            _pubKey: `0x${signer1.publicKey}`,
          },
          value: locklift.utils.toNano(20),
          publicKey: signer1.publicKey,
        })
        .then(res => res.contract);

      user2 = await locklift.factory
        .deployContract({
          contract: "SimpleWallet",
          initParams: {},
          constructorParams: {
            _pubKey: `0x${signer2.publicKey}`,
          },
          value: locklift.utils.toNano(20),
          publicKey: signer2.publicKey,
        })
        .then(res => res.contract);
    });

    it("Interact with contract", async function () {
      const [balance1, balance2] = await Promise.all(
        [user1, user2].map(user =>
          user.methods
            .balance()
            .call()
            .then(res => Number(res.balance)),
        ),
      );

      console.log(`Previous balances: user1 ${fromNano(balance1)} and user2 ${fromNano(balance2)}`);

      const { traceTree } = await locklift.tracing.trace(
        user1.methods
          .sendToMyFriend({
            value: toNano(1.1),
            dest: user2.address,
          })
          .sendExternal({
            publicKey: signer1.publicKey,
          }),
      );

      await traceTree?.beautyPrint();
      {
        const [balance1, balance2] = await Promise.all(
          [user1, user2].map(user =>
            user.methods
              .balance()
              .call()
              .then(res => Number(res.balance)),
          ),
        );
        console.log(`Current balances: user1 ${fromNano(balance1)} and user2 ${fromNano(balance2)}`);
      }
    });
  });
});
