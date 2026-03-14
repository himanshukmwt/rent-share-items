const router = require("express").Router();
const { authMiddleware } = require("../middleware/auth");
const checkout = require("../controllers/checkout");
const validate = require("../middleware/validate");
const  {createCheckoutSchema} = require("../validators/rentalValidator");

router.post("/",authMiddleware,validate(createCheckoutSchema),checkout);

module.exports = router;