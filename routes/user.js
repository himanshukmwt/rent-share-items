const express = require("express");
const { registerUser ,loginUser,getProfile } = require("../controllers/auth");
const {authMiddleware}=require("../middleware/auth");
const validate = require("../middleware/validate");
const  {signupSchema,loginSchema} = require("../validators/authValidator");
const router = express.Router();

router.post("/register",validate(signupSchema), registerUser);
router.post("/login",validate(loginSchema), loginUser);
router.get("/profile", authMiddleware, getProfile);


// router.get("/register/:userId",async(req,res)=>{
//     // const userId=req.params.userId;
//     const user= await User.find({});
//     return res.json(user);
// });
module.exports = router;
