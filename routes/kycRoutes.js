const express=require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const adminOnly=require("../middleware/admin");
const { submitKYC,getMyKYC } = require("../controllers/kyc");

const { uploadKYC } = require('../config/cloudinary')
const validate = require("../middleware/validate");
const  {KycSchema} = require("../validators/kycValidator");
router.post("/submit", authMiddleware,uploadKYC.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), submitKYC);
router.get("/my",authMiddleware,getMyKYC);

module.exports = router;