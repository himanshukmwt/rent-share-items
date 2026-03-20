const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {setUser}=require("../service/auth");

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

    // 4. Create user
    const user = await prisma.user.create({
      data:{
        name,
        email,
        password: hashedPassword,
      }
    });

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
       sameSite: "lax",
       maxAge: 24 * 60 * 60 * 1000
     }); 

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong... Please try again later." });
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
       sameSite: "lax",
       maxAge: 24 * 60 * 60 * 1000
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
    return res.status(500).json({ message: "Something went wrong... Please try again later." });
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


module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  updateLocation
};
