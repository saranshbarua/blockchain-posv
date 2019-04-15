var express = require("express");
const cors = require("cors");
const reqPromise = require("request-promise");

var app = express();
app.use(cors());

const bodyparser = require("body-parser");
const Blockchain = require("./index");
const reddcoin = new Blockchain();
const uuid = require("uuid/v1");
const port = process.argv[2];
const nodeAddr = uuid()
  .split("-")
  .join("");

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Blockchain App");
});

app.get("/blockchain", (req, res) => {
  res.send(reddcoin);
});

app.post("/transaction", function(req, res) {
  const newTransaction = req.body;
  const blockIndex = reddcoin.addTransactionToPendingTransactions(
    newTransaction
  );
  res.json({ note: `transaction will be added in block ${blockIndex}.` });
});

app.post("/transaction/broadcast", function(req, res) {
  const transaction = reddcoin.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recepeint
  );
  reddcoin.addTransactionToPendingTransactions(transaction);

  const requests = [];
  reddcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      uri: networkNode + "/transaction",
      method: "POST",
      body: transaction,
      json: true
    };

    requests.push(reqPromise(requestOptions));
  });

  Promise.all(requests).then(data => {
    res.json({
      message: `Creating and broadcasting Transaction successfully!`
    });
  });
});

app.get("/mine", function(req, res) {
  const latestBlock = reddcoin.getLastBlock();
  const prevBlockHash = latestBlock.hash;
  const currentBlockData = {
    transactions: reddcoin.pendingTransactions,
    index: latestBlock.index + 1
  };
  const nonce = reddcoin.proofOfStakeVelocity(prevBlockHash, currentBlockData);
  const blockHash = reddcoin.hashBlock(prevBlockHash, currentBlockData, nonce);

  const newBlock = reddcoin.createBlock(nonce, prevBlockHash, blockHash);

  const requests = [];
  reddcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      uri: networkNode + "/add-block",
      method: "POST",
      body: { newBlock: newBlock },
      json: true
    };

    requests.push(reqPromise(requestOptions));
  });

  Promise.all(requests)
    .then(data => {
      // reward for mining
      const requestOptions = {
        uri: reddcoin.nodeUrl + "/transaction/broadcast",
        method: "POST",
        body: {
          amount: 1,
          sender: "00000",
          recipient: nodeAddr
        },
        json: true
      };

      return reqPromise(requestOptions);
    })
    .then(data => {
      res.json({
        message: "Mining & broadcasting new Block successfully!",
        newBlock: newBlock
      });
    });
});

app.post("/add-block", function(req, res) {
  const block = req.body.newBlock;
  const latestBlock = reddcoin.getLastBlock();

  if (
    latestBlock.hash === block.prevBlockHash &&
    block.index === latestBlock.index + 1
  ) {
    reddcoin.chain.push(block);
    reddcoin.pendingTransactions = [];

    res.json({
      message: "Add new Block successfully!",
      newBlock: block
    });
  } else {
    res.json({
      message: "Cannot add new Block!",
      newBlock: block
    });
  }
});

app.post("/register-and-broadcast-node", function(req, res) {
  const nodeUrl = req.body.nodeUrl;

  if (reddcoin.networkNodes.indexOf(nodeUrl) == -1) {
    reddcoin.networkNodes.push(nodeUrl);
  }

  const registerNodes = [];
  reddcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      uri: networkNode + "/register-node",
      method: "POST",
      body: { nodeUrl: nodeUrl },
      json: true
    };

    registerNodes.push(reqPromise(requestOptions));
  });

  Promise.all(registerNodes)
    .then(data => {
      const bulkRegisterOptions = {
        uri: nodeUrl + "/register-bulk-nodes",
        method: "POST",
        body: { networkNodes: [...reddcoin.networkNodes, reddcoin.nodeUrl] },
        json: true
      };

      return reqPromise(bulkRegisterOptions);
    })
    .then(data => {
      res.json({
        message: "A node registers with network successfully!"
      });
    });
});

app.post("/register-node", function(req, res) {
  const nodeUrl = req.body.nodeUrl;

  if (
    reddcoin.networkNodes.indexOf(nodeUrl) == -1 &&
    reddcoin.nodeUrl !== nodeUrl
  ) {
    reddcoin.networkNodes.push(nodeUrl);

    res.json({
      message: "A node registers successfully!"
    });
  } else {
    res.json({
      message: "This node cannot register!"
    });
  }
});

app.post("/register-bulk-nodes", function(req, res) {
  const networkNodes = req.body.networkNodes;

  networkNodes.forEach(nodeUrl => {
    if (
      reddcoin.networkNodes.indexOf(nodeUrl) == -1 &&
      reddcoin.nodeUrl !== nodeUrl
    ) {
      reddcoin.networkNodes.push(nodeUrl);
    }
  });

  res.json({
    message: "Registering bulk successfully!"
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
