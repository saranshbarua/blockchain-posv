const sha256 = require("sha256");
const uuid = require("uuid/v1");
// Get current nodes
const nodeUrl = process.argv[3];

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.nodeUrl = nodeUrl;
  this.networkNodes = [];
  this.lastTransactionStamp = null;
  this.createBlock(100, "0", "0");
}

Blockchain.prototype.createBlock = function(nonce, previousBlockHash, Hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce: nonce,
    hash: Hash,
    previousBlockHash: previousBlockHash
  };

  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

Blockchain.prototype.getLastBlock = function() {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function(
  amount,
  sender,
  recepeint
) {
  const newTransaction = {
    amount: amount,
    sender: sender,
    recepeint: recepeint,
    transactionId: uuid()
      .split("-")
      .join("")
  };

  this.lastTransactionStamp = Date.now();

  return newTransaction;
};

Blockchain.prototype.addTransactionToPendingTransactions = function(
  transactionObj
) {
  this.pendingTransactions.push(transactionObj);
  return this.getLastBlock()["index"] + 1;
};

Blockchain.prototype.hashBlock = function(
  previousBlockHash,
  currentBlockData,
  nonce
) {
  const singleDataString = `${previousBlockHash}${JSON.stringify(
    currentBlockData
  )}${nonce.toString()}`;
  const hash = sha256(singleDataString);

  return hash;
};

Blockchain.prototype.proofOfStakeVelocity = function(
  previousBlockHash,
  currentBlockData
) {
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

  console.log(
    `Transaction velocity stamp: ${Date.now() - this.lastTransactionStamp}`
  );

  let stampTrim = Date.now() - this.lastTransactionStamp - 1;

  console.log(stampTrim);

  let substringLastIndex = stampTrim.toString().length;

  console.log(substringLastIndex);

  let zeroes = "";

  for (let i = 0; i < substringLastIndex - 1; i++) {
    zeroes = zeroes + "0";
  }

  while (hash.substring(0, substringLastIndex - 1) !== zeroes) {
    nonce++;
    hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    // console.log(hash);
  }

  return nonce;
};

module.exports = Blockchain;
