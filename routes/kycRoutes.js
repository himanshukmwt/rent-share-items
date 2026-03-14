const express=require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { submitKYC, verifyKYC,getMyKYC,getAllKYC } = require("../controllers/kyc");
const adminOnly = require("../middleware/admin");
const { uploadKYC } = require('../config/cloudinary')
const validate = require("../middleware/validate");
const  {createKYCSchema} = require("../validators/kycValidator");
router.post("/submit", authMiddleware,uploadKYC.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]),validate(createKYCSchema), submitKYC);
router.get("/my",authMiddleware,getMyKYC);

// admin route
router.patch("/verify/:userId",authMiddleware,adminOnly, verifyKYC);
router.get("/all",authMiddleware,adminOnly,getAllKYC);

module.exports = router;