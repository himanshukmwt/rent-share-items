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
  reportMinorDamage,
  reportMajorDamage,
  getOwnerRentals,
  returnItem
} = require("../controllers/rental");

router.post("/direct", authMiddleware,validate(createRentalSchema), createRental);
router.get("/my", authMiddleware, getMyRentals);
router.get("/owner", authMiddleware, getOwnerRentals);
router.get("/:id", authMiddleware, getRentalById);
router.patch("/complete",authMiddleware,completeRental);
router.post("/damage/minor", authMiddleware,upload.array('damagePhotos', 3), reportMinorDamage);
router.post("/damage/major", authMiddleware,upload.array('damagePhotos', 3), reportMajorDamage);
router.patch("/return", authMiddleware, returnItem)


module.exports = router;