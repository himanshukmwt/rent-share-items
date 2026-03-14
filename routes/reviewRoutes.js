const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");
const  {createReviewSchema} = require("../validators/reviewValidator");
const {
  createReview,
  getItemReviews,
  deleteReview
} = require("../controllers/review");

router.post("/", authMiddleware,validate(createReviewSchema), createReview);

router.get("/:itemId", getItemReviews);

router.delete("/:id", authMiddleware, deleteReview);

module.exports = router;