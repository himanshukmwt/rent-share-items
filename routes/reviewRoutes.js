const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");

const {
  createReview,
  getItemReviews,
  deleteReview
} = require("../controllers/review");

router.post("/", authMiddleware, createReview);

router.get("/:itemId", getItemReviews);

router.delete("/:id", authMiddleware, deleteReview);

module.exports = router;