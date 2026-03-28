const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const prisma = require('../config/prisma');

//  Order Create
async function createOrder(req, res, next) {
  try {
    const { rentalId } = req.body;
    
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    try {
    const order = await razorpay.orders.create({
      amount:   rental.totalAmount * 100,
      currency: "INR",
      // receipt:  `rental_${rental.id}`,
     receipt: rental.id.substring(0, 40),
      notes: { rentalId: rental.id, userId: req.user.id }
    });

    res.json({
      orderId:  order.id,
      amount:   rental.totalAmount,
      currency: "INR",
      keyId:    process.env.RAZORPAY_KEY_ID
    });

     } catch (razorpayErr) {
      res.status(500).json({ message: razorpayErr.message });
    }
  } catch (err) {
    next(err);
  }
}

//  Payment Verify
async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rentalId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const rental = await prisma.rental.findUnique({
      where: { id: rentalId }
    });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          rentalId,
          userId:        req.user.id,
          paymentMethod: "razorpay",
          type:          "PAYMENT",
          status:        "SUCCESS",
          razorpayId:    razorpay_payment_id
        }
      });

      await tx.rental.update({
        where: { id: rentalId },
        data:  { status: "ACTIVE" }
      });
    });

    res.json({ message: "Payment successful" });

  } catch (err) {
    next(err);
  }
}

async function getMyTransactions(req,res,next){
     try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      include: {
        rental: {
          select : { 
             totalAmount: true,
             depositAmount: true,
             rentalAmount:true,
            item: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }  
    });

    res.json(transactions);

  }catch(err){
    next(err);
  }
};


 


module.exports={
    createOrder,
  verifyPayment,
  getMyTransactions,
}