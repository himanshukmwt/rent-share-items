require("dotenv").config();
const userRoute=require("./routes/user");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
// const rateLimit = require("express-rate-limit");
// const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");


const itemRoutes = require("./routes/itemRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const kycRoutes=require("./routes/kycRoutes");

const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");





const app = express();
const PORT = Number(process.env.PORT) || 8007 ;

app.use(express.json());
app.use(express.urlencoded({extended :false}));

app.use(helmet());
app.use(cors({
  origin: "http://127.0.0.1:5500", // later replace with frontend domain
  methods: ["GET","POST","PUT","DELETE","PATCH"],
  credentials: true
}));
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests, please try again later"
// });
// app.use("/api", limiter);
// // app.use(mongoSanitize());
// // app.use(xss());

app.use("/api",userRoute);
app.use("/api/items", itemRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/checkout",checkoutRoutes);
app.use("/kyc",kycRoutes);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
