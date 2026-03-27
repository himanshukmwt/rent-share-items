const express = require("express");
const { registerUser ,loginUser,getProfile,updateProfile,updateLocation,verifyOTP,logout,forgotPassword,resetPassword} = require("../controllers/auth");
const {authMiddleware}=require("../middleware/auth");
const validate = require("../middleware/validate");
const  {signupSchema,loginSchema} = require("../validators/authValidator");
const router = express.Router();

router.post("/register",validate(signupSchema), registerUser);
router.post("/login",validate(loginSchema), loginUser);
router.get("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/location", authMiddleware, updateLocation);
router.post('/verify-otp', verifyOTP);
router.post('/logout', logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

module.exports = router;
