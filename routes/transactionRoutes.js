const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");

const {
  createInitialPayment,
  refundDeposit,
  extendRentalPayment,
  getMyTransactions,
  completeRental,
  getTransactionById
} = require("../controllers/transaction");

router.post("/pay", authMiddleware, createInitialPayment);

router.post("/extend", authMiddleware, extendRentalPayment);
router.post("/refund",authMiddleware,refundDeposit);
router.post("/complete",authMiddleware,completeRental);
router.get("/my", authMiddleware, getMyTransactions);
// router.get("/m/:id", authMiddleware, getMyTransactions);

module.exports = router;