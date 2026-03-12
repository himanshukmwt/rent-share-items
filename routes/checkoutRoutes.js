const router = require("express").Router();
const { authMiddleware } = require("../middleware/auth");
const checkout = require("../controllers/checkout");

router.post("/",authMiddleware,checkout);

module.exports = router;