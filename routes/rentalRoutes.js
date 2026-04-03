const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const validate = require("../middleware/validate");
const  {createRentalSchema} = require("../validators/rentalValidator");
const { upload } = require('../config/cloudinary');
const {
  createRental,
  getMyRentals,
  getRentalById,
  completeRental,
  getOwnerRentals,
  ownerRequest,
  returnItem,
  verifyPickupOTP
} = require("../controllers/rental");

router.post("/direct", authMiddleware,validate(createRentalSchema), createRental);
router.get("/my", authMiddleware, getMyRentals);
router.get("/owner", authMiddleware, getOwnerRentals);
router.get("/:id", authMiddleware, getRentalById);
router.patch("/complete",authMiddleware,completeRental);
router.patch("/return", authMiddleware, returnItem);
router.post("/owner-request", authMiddleware,upload.array('damagePhotos', 3),ownerRequest);
router.post("/verify-pickup", authMiddleware, verifyPickupOTP);


module.exports = router;