const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");

const {
  createRental,
  getMyRentals,
  getAllRentals
} = require("../controllers/rental");

router.post("/", authMiddleware, createRental);
router.get("/my", authMiddleware, getMyRentals);
router.get("/", getAllRentals);

module.exports = router;