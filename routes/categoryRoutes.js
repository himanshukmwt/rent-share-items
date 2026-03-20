
const express = require("express");
const router = express.Router();

const depositRules = require("../config/depositRules"); 

router.get('/categories', (req, res) => {
  const categories = Object.keys(depositRules);
  res.json(categories);
});

module.exports = router;