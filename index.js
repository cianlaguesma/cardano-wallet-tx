import { Blockfrost, Lucid } from "lucid-cardano"; // NPM

//Create your blockfrost account and input api here, set to mainnet
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-mainnet.blockfrost.io/api/v0",
    "<BLOCKFFROST_API_KEY>"
  ),
  "Mainnet"
); // Assumes you are in a browser environment

//Main wallet is the wallet where you send all your tokens to or you use it to reload your farmer wallets
const main = "<main wallet>";

//These wallets are your farm wallets, its key should follow the format: 'farmer #'. e.g. farmer 1, farmer 2
const wallets = {
  "farmer 1": "<seed phrase>",
};

getAllAddresses(wallets, 0, 20);

//reload sends from your "sendingFrom" wallet to "sendingTo" wallet. from and to is the "sendingTo" wallet indexes. Usually it's 0 to 19 because your farm wallet has 20 wallets.
//amount is the amount of ada your are sending. it should be in lovelace format so just add 6 zeroes to the end.
//e.g. 6 ADA = 6000000
//e.g. function = reload(main,wallets['farmer 1'],0,19,6000000)
//account index is your MAIN wallet's index number. Count from 0
async function reload(sendingFrom, sendingTo, from, to, amount) {
  var addresses = [];
  for (var x = from; x < to + 1; x++) {
    lucid.selectWalletFromSeed(sendingTo, { accountIndex: x });
    const address = await lucid.wallet.address();
    addresses.push(address);
  }
  const tx = await lucid.newTx();
  for (var x = 0; x < addresses.length; x++) {
    console.log(addresses[x]);
    lucid.selectWalletFromSeed(sendingFrom, { accountIndex: '<account index> (Remove '' after)' });
    const address = await lucid.wallet.address();
    const utxos = await lucid.provider.getUtxos(address);
    var queryBuilder = {};
    queryBuilder["lovelace"] = BigInt(amount);
    tx.payToAddress(addresses[x], queryBuilder);
  }
  var final = await tx.complete();
  const signedTx = await final.sign().complete();

  const txHash = await signedTx.submit();

  console.log(txHash);
}

//Sends all tokens from your farming wallet to the wallet specified in makePayment
//e.g. getAllTheMoney(wallets,18000000,0,20)
async function getAllTheMoney(wallets, amount, from, to) {
  for (var count = 1; count < Object.keys(wallets).length + 1; count++) {
    console.log(`Sending from wallet # ${count}`);
    for (var x = from; x < to; x++) {
      lucid.selectWalletFromSeed(wallets[`farmer ${count}`], {
        accountIndex: x,
      });
      const address = await lucid.wallet.address();
      const utxos = await lucid.provider.getUtxos(address);
      var queryBuilder = buildQuery(utxos, amount);
      await delay(100).then(() => makePayment(queryBuilder, x));
    }
  }
}

//Sends all tokens from a specific seed phrase to the wallet specified in makePayment
//e.g. getTheMoney(wallets['farmer 1'], 3000000, 0, 20)
async function getTheMoney(seedphr, amount, from, to) {
  for (var x = from; x < to; x++) {
    lucid.selectWalletFromSeed(seedphr, { accountIndex: x });
    const address = await lucid.wallet.address();
    const utxos = await lucid.provider.getUtxos(address);
    var queryBuilder = buildQuery(utxos, amount);
    await delay(100).then(() => makePayment(queryBuilder, x));
  }
}

//INPUT your main wallet address, this will be the wallet the tokens will be sent to
//Don't mind the function tho
async function makePayment(queryBuilder, x) {
  const tx = await lucid
    .newTx()
    .payToAddress("<main wallet address>", queryBuilder)
    .complete();

  const signedTx = await tx.sign().complete();

  const txHash = await signedTx.submit();

  console.log(txHash + "Account #: " + x);
}
//Don't mind
function buildQuery(utxos, amount) {
  var totalLovelace = 0;
  var queryBuilder = {};
  utxos.forEach((utxo) => {
    Object.keys(utxo["assets"]).forEach((key) => {
      if (key == "lovelace") {
        totalLovelace += parseInt(utxo["assets"]["lovelace"].toString());
      } else {
        if (!queryBuilder.hasOwnProperty(key)) {
          queryBuilder[key] = BigInt(utxo["assets"][key]);
        } else {
          queryBuilder[key] += BigInt(utxo["assets"][key]);
        }
      }
    });
  });
  queryBuilder["lovelace"] = BigInt(amount);
  return queryBuilder;
}

//Registers stake
async function registerStake(seedphr, from, to, fromwallet, towallet) {
  for (var y = fromwallet; y < towallet + 1; y++) {
    var wallet = seedphr["farmer " + y];
    for (var x = from; x < to + 1; x++) {
      lucid.selectWalletFromSeed(wallet, { accountIndex: x });
      const rewardAddress = await lucid.wallet.rewardAddress();

      const tx = await lucid.newTx().registerStake(rewardAddress).complete();

      const signedTx = await tx.sign().complete();

      const txHash = await signedTx.submit();

      console.log(txHash);
    }
  }
}

//Delegates to pool
async function delegate(seedphr, from, to, fromwallet, towallet) {
  for (var y = fromwallet; y < towallet + 1; y++) {
    var wallet = seedphr["farmer " + y];
    for (var x = from; x < to; x++) {
      lucid.selectWalletFromSeed(wallet, { accountIndex: x });
      const rewardAddress = await lucid.wallet.rewardAddress();
      const tx = await lucid
        .newTx()
        .delegateTo(
          rewardAddress,
          "pool1newmccddazerzanrdeeelvzk6vzh9stxn5n8ravshqa05n0t83u"
        )
        .complete();
      const signedTx = await tx.sign().complete();

      const txHash = await signedTx.submit();
      console.log("Successfully delegated: " + txHash + " Account #: " + x);
    }
  }
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

//Gets addresses from a single wallet
//e.g. getAddresses(wallets['farmer 1'], 0, 20)
async function getAddresses(wallet, from, to) {
  for (var x = from; x < to + 1; x++) {
    lucid.selectWalletFromSeed(wallet, { accountIndex: x });
    console.log(await lucid.wallet.address());
    console.log(await lucid.wallet.getUtxos());
  }
}

//Gets all addresses in your farmer wallet
//e.g. getAllAddresses(wallets,0,20)
async function getAllAddresses(wallets, from, to) {
  for (var count = 1; count < Object.keys(wallets).length + 1; count++) {
    for (var x = from; x < to + 1; x++) {
      console.log(`Wallet #${count} | Account #${x}`);
      lucid.selectWalletFromSeed(wallets[`farmer ${count}`], {
        accountIndex: x,
      });
      var utxos = await lucid.wallet.getUtxos();
      console.log(await lucid.wallet.address());

      utxos.forEach((utxo) => {
        console.log(utxo["assets"]);
      });
    }
  }
}
