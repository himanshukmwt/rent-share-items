const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {setUser}=require("../service/auth");
const sendOTPEmail = require('../config/email');


const otpStore = {};

async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check existing user
    const existingUser =  await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered. Please login instead." });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
     

     const otp = Math.floor(100000 + Math.random() * 900000);

   //otpStore me otp save 
  otpStore[email] = {
    otp,
    userData: { name, email, password: hashedPassword },
    expiresAt: Date.now() + 10 * 60 * 1000
  };

   await sendOTPEmail(email, otp);

  res.status(200).json({ message: "OTP sent to your email" });

   
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};


async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

     const token=setUser(user);
     res.cookie("uid",token,{
       httpOnly: true,
       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
       secure: process.env.NODE_ENV === 'production',
       maxAge: 72 * 60 * 60 * 1000
     }); 

    // 5. Send response
    return res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong... Please try again later.",
    });
  }
}

async function getProfile(req, res) {
  try {

    const token = req.cookies.uid;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        kyc: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

async function updateProfile(req, res){
  try {
    const { upiId } = req.body  

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { upiId }  
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong... Please try again later." });
  }
}

async function updateLocation(req, res){
  try {
    const { city, area, latitude, longitude } = req.body;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { city, area, latitude, longitude }
    });

    res.json({ message: "Location updated " });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const stored = otpStore[email];
  // Check otp
  if (!stored) {
    return res.status(400).json({ message: 'OTP not found' });
  }
  if (Date.now() > stored.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired' });
  }
  if (stored.otp !== Number(otp)) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

   // OTP sahi — ab DB me save
  const user = await prisma.user.create({
    data: stored.userData
  });


  delete otpStore[email]; // Use hone ke baad delete   

  const token=setUser(user);
     res.cookie("uid",token,{
       httpOnly: true,
      //  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      sameSite:"lax",
      secure:false,
      //  secure: process.env.NODE_ENV === 'production',
       maxAge: 72 * 60 * 60 * 1000
     }); 

   return res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, name: user.name, email: user.email }
    });
  
};

async function logout(req, res){
  res.clearCookie('uid', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  updateLocation,
  verifyOTP,
  logout
};
