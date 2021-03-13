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

app.get("/statement", verifyIfAccountWithGivenCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer);
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

app.listen(3333);
