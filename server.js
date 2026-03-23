require("dotenv").config();
const prisma=require("./config/prisma");
const cron = require('node-cron')
const cookieParser = require("cookie-parser");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
// const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");

const userRoute=require("./routes/user");
const itemRoutes = require("./routes/itemRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const kycRoutes=require("./routes/kycRoutes");

const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require("./routes/categoryRoutes");



const app = express();
const PORT = Number(process.env.PORT) || 8007 ;
app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({extended :false}));

app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173", // replace with frontend domain
  // origin: "*",
  methods: ["GET","POST","PUT","DELETE","PATCH"],
  // origin: "http://10.10.11.175:5173",
  credentials: true
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later"
});
app.use("/api", limiter);
// // app.use(mongoSanitize());
// // app.use(xss());

app.use("/api/users",userRoute);
app.use("/api/items", itemRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/checkout",checkoutRoutes);
app.use("/api/kyc",kycRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api", categoryRoutes);

// Har 10 min mein expired rentals clean 
cron.schedule('*/10 * * * *', async () => {
  try {
        await prisma.rental.updateMany({
      where: { 
        status: "ACTIVE", 
        endDate: { lt: new Date() }
      },
      data: { status: "RETURNING" }
    });

    const expired = await prisma.rental.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() }
      },
      data: { status: "EXPIRED" }
    });

    
    if (expired.count > 0) {
      // console.log(`${expired.count} rentals expired `);
    }
    
  } catch (error) {
    console.log("Cron error:", error.message);
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
