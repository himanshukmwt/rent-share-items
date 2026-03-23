const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");



const {
  createOrder,
  verifyPayment,
  getMyTransactions,
} = require('../controllers/transaction');

router.post("/order",authMiddleware, createOrder);
router.post("/verify",authMiddleware, verifyPayment);
router.get("/my",authMiddleware, getMyTransactions);

module.exports = router;