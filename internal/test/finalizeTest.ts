import {
    Address,
    ProviderRpcClient,
  } from 'everscale-inpage-provider';
  import { testContract, toNano } from './../../helpers';
  
  const provider = new ProviderRpcClient();
  
  async function fetchStates() {
    const ContractA = new provider.Contract(
      testContract.ABI,
      new Address(testContract.address)
    );
    const ContractB = new provider.Contract(
      testContract.ABI,
      new Address(testContract.dublicateAddress)
    );
  
    const { _state: prevState_A } = await ContractA.methods
      .getDetails()
      .call();
    const { _state: prevState_B } = await ContractB.methods
      .getDetails()
      .call();
  
    console.log(`prevState_A: ${prevState_A}`);
    console.log(`prevState_B: ${prevState_B}`);
  }
  
  async function executeTransaction() {
    try {
      await provider.ensureInitialized();
      const { accountInteraction } = await provider.requestPermissions({
        permissions: ['basic', 'accountInteraction'],
      });
  
      const ContractA = new provider.Contract(
        testContract.ABI,
        new Address(testContract.address)
      );
  
      const senderAddress = accountInteraction?.address!;
  
      await fetchStates();
  
      const { _state: prevState_A } = await ContractA.methods
        .getDetails()
        .call();
  
      const payload = {
        abi: JSON.stringify(testContract.ABI),
        method: 'setOtherState',
        params: {
          other: new Address(testContract.dublicateAddress),
          _state: Number(prevState_A) + 1,
          count: 256,
        },
      };
      const { transaction: tx } = await provider.sendMessage({
        sender: senderAddress,
        recipient: new Address(testContract.address),
        amount: toNano(0.3),
        bounce: true,
        payload: payload,
      });
  
      console.log(`Transaction: ${JSON.stringify(tx, null, 2)}`);
  
      const subscriber = new provider.Subscriber();
      const traceStream = subscriber.trace(tx);
  
      traceStream.on(async data => {
        if (data.aborted) {
          await fetchStates();
          traceStream.stopProducer();
        }
      });
    } catch (err: any) {
      console.log(`Error: ${err.message || 'Unknown Error'}`);
    }
  }
  
  executeTransaction();