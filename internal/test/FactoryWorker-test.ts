import { expect } from "chai";
import { Contract, getRandomNonce, Signer, toNano, WalletTypes } from "locklift";
import { FactorySource } from "../build/factorySource";
import { Account } from "everscale-standalone-client";

let carFactory: Contract<FactorySource["CarFactory"]>;

let factoryAccount: Account;
let workerAccount: Account;
let factoryWallet: Account;
let signer: Signer;

describe("Car_Factory_Test", async function () {
    before(async () => {
        signer = (await locklift.keystore.getSigner("0"))!;
    });
    describe("Contracts", async function() {
        it("Deploy Contracts", async function() {
            workerAccount = await locklift.factory.accounts
            .addNewAccount({
                type: WalletTypes.EverWallet,
                value: toNano(1),
                publicKey: signer.publicKey,
            })
            .then(res => res.account);
            
            await locklift.factory.accounts
            .addNewAccount({
                type: WalletTypes.EverWallet,
                value: toNano(10),
                publicKey: signer.publicKey,
            })
            .then(res => (factoryWallet = res.account));

            const { code: workerCode } = locklift.factory.getContractArtifacts("Workers");
            carFactory = await locklift.factory
            .deployContract({
                contract: "CarFactory",
                initParams: {
                    workerContractCode: workerCode,
                },
                constructorParams: {
                    _owner: factoryWallet.address,
                },
                value: toNano(1),
                publicKey: signer.publicKey,
            })
            .then(res => res.contract);
            
            
        });
        // it("Interact with contract", async function () {
        //     const { traceTree: test} = await locklift.tracing.trace(
        //         carFactory.methods
        //         .getAddress({
        //             _accountAddress: factoryAccount.address,
        //         }).sendExternal({
        //             publicKey: signer.publicKey,
        //         }),
        //     );
        //     await test?.beautyPrint();
        // })
    })
});