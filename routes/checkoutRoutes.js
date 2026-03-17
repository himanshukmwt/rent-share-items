const router = require("express").Router();
const { authMiddleware } = require("../middleware/auth");
const checkout = require("../controllers/checkout");
const validate = require("../middleware/validate");
const  {createRentalSchema} = require("../validators/rentalValidator");

router.post("/",authMiddleware,validate(createRentalSchema),checkout);

module.exports = router;