const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

function verifyIfAccountWithGivenCPFExists(req, res, next) {
  const { cpf } = req.headers;

  const customerFound = customers.find((customer) => customer.cpf === cpf);

  if (!customerFound) {
    return res
      .status(404)
      .json({ error: `Customer with CPF ${cpf} do not exists.` });
  }

  req.customer = customerFound;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acumulator, operation) => {
    if (operation.type === "credit") {
      return acumulator + operation.amount;
    } else if (operation.type === "debit") {
      return acumulator - operation.amount;
    }
  }, 0);

  return balance;
}

app.post("/account", (req, res) => {
  const { name, cpf } = req.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({
      error: "CPF already registered.",
    });
  }

  customers.push({
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  });

  return res.status(201).json(customers);
});

app.put("/account", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name;

  return res.status(201).send();
});

app.delete("/account", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(200).json(customers);
});

app.get("/account", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer);
});

app.get("/statement", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer.statement);
});

app.get("/statement/date", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00").toDateString();

  const statement = customer.statement.filter((statement) => {
    const statementDate = statement.created_at.toDateString();

    return statementDate === dateFormat;
  });

  if (statement.length === 0) {
    return res
      .status(404)
      .json({ error: `Could not find any statements for date ${dateFormat}` });
  }

  return res.status(200).json(statement);
});

app.post("/deposit", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;

  const statementOperation = {
    type: "credit",
    description,
    amount,
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post("/withdraw", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;
  const { amount } = req.body;

  const balance = getBalance(customer.statement);

  if (amount > balance) {
    return res
      .status(401)
      .json({ error: `You don't have enougth money to withdraw ${amount}.` });
  }

  const statementOperation = {
    type: "debit",
    amount,
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.get("/balance", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.status(200).json(balance);
});

app.listen(3333);
