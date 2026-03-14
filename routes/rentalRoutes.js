const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");
const  {createRentalSchema} = require("../validators/rentalValidator");
const {
  createRental,
  getMyRentals,
  getAllRentals,
  getRentalById
} = require("../controllers/rental");

router.post("/direct", authMiddleware,validate(createRentalSchema), createRental);
router.get("/my", authMiddleware, getMyRentals);
router.get("/", getAllRentals);
router.get("/:id", authMiddleware, getRentalById)

module.exports = router;