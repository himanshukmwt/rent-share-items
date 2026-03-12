const express=require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { submitKYC, verifyKYC,getMyKYC,getAllKYC } = require("../controllers/kyc");
const adminOnly = require("../middleware/admin");
router.post("/submit", authMiddleware, submitKYC);
router.get("/my",authMiddleware,getMyKYC);

// admin route
router.patch("/verify/:userId",authMiddleware,adminOnly, verifyKYC);
router.get("/all",authMiddleware,adminOnly,getAllKYC);

module.exports = router;