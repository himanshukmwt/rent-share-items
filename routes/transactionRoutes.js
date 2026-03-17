const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");

const {
  createInitialPayment,
  refundDeposit,
  extendRentalPayment,
  getMyTransactions,
} = require("../controllers/transaction");

router.post("/pay", authMiddleware, createInitialPayment);

// router.post("/extend", authMiddleware, extendRentalPayment);
router.post("/refund",authMiddleware,refundDeposit);
router.get("/my", authMiddleware, getMyTransactions);

module.exports = router;