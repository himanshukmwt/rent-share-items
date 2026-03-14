const express=require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");
const  {createCartSchema} = require("../validators/cartValidator");
const {
  addToCart,
  getMyCart,
  removeFromCart,
  clearCart
} = require("../controllers/cart");

router.post("/add",authMiddleware,validate(createCartSchema),addToCart);
router.get("/",authMiddleware,getMyCart);
router.delete("/remove",authMiddleware,removeFromCart);
router.delete("/clear",authMiddleware,clearCart);

module.exports = router;