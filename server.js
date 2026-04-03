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
const ReportRoutes=require("./routes/reportRoutes");
const errorHandler = require('./middleware/errorHandler');





const app = express();
const PORT = Number(process.env.PORT) || 8007 ;
app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({extended :false}));

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({
  // origin: "http://localhost:5173", // replace with frontend domain
   origin: "https://rent-share-frontend.vercel.app",
  methods: ["GET","POST","PUT","DELETE","PATCH"],
  credentials: true
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
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
app.use("/api", ReportRoutes);

app.use(errorHandler);

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

    // Extra charge calculate karo
  const returningRentals = await prisma.rental.findMany({
    where: { 
      status: "RETURNING",
      extraDays: null  
    },
    include: { item: true }
  });

  for (const rental of returningRentals) {
    const today = new Date();
    const endDate = new Date(rental.endDate);
    
    if (today > endDate) {
      const extraDays = Math.ceil(
        (today - endDate+1) / (1000 * 60 * 60 * 24)
      );
      const extraCharge = extraDays * rental.item.pricePerDay;

      await prisma.rental.update({
        where: { id: rental.id },
        data: {
          extraDays,
          extraCharge
        }
      });

      console.log(`Extra charge: ₹${extraCharge} for rental ${rental.id}`);
    }
  }

    
    if (expired.count > 0) {
      // console.log(`${expired.count} rentals expired `);
    }
    
  } catch (error) {
    console.log("Cron error:", error.message);
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
