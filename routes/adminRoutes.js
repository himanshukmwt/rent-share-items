const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const  adminOnly  = require('../middleware/admin');
const razorpay = require('../config/razorpay');

// All Users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

// All Items
router.get('/items', authMiddleware, adminOnly, async (req, res) => {
  const items = await prisma.item.findMany({
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(items);
});

// All Rentals
router.get('/rentals', authMiddleware, adminOnly, async (req, res) => {
  const rentals = await prisma.rental.findMany({
    include: {
      user:  { select: { name: true } },
      item:  { include: { owner: { select: { name: true,  upiId: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(rentals);
});

// All Transactions
router.get('/transactions', authMiddleware, adminOnly, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: {
      user:   { select: { name: true } },
            rental: { select: {totalAmount: true ,
               item:
               { select:
                 { name: true } } }  }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(transactions);
});

// All KYC
router.get('/kyc', authMiddleware, adminOnly, async (req, res) => {
  try {
    const kycs = await prisma.kYC.findMany({
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(kycs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/verify/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { status } = req.body;
    const { id } = req.params;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const kyc = await prisma.kYC.findUnique({
      where: { id }
    });

    if (!kyc) {
      return res.status(404).json({ message: "KYC not found" });
    }

    const result = await prisma.$transaction(async (tx) => {

      const updatedKyc = await tx.kYC.update({
        where: { id },
        data: {
          verificationStatus: status,
          verifiedAt: status === "VERIFIED" ? new Date() : null
        }
      });

      await tx.user.update({
        where: { id: kyc.userId },
        data: {
          kycVerified: status === "VERIFIED" ? true : false
        }
      });

      return updatedKyc;
    });

    res.json(result);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Damage Reports
router.get('/damages', authMiddleware, adminOnly, async (req, res) => {
  try {
    const damages = await prisma.rental.findMany({
      where: { isDamaged: true },
      include: {
        item: { select: { name: true, images: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(damages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/damages/:id/resolve', authMiddleware, adminOnly, async (req, res) => {
  await prisma.rental.update({
    where: { id: req.params.id },
    data:  { damageResolved: true }
  });
  res.json({ message: "Damage resolved " });
});

//delete item
router.delete('/items/:id',authMiddleware,adminOnly, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const activeRental = await prisma.rental.findFirst({
      where: {
        itemId: req.params.id,
        status: { in: ["ACTIVE", "PENDING", "RETURNING"] }
      }
    });

    if (activeRental) {
      return res.status(400).json({ 
        message: "Item abhi rented/returning hai — delete nahi kar sakte" 
      });
    }

    await prisma.rental.deleteMany({ where: { itemId: req.params.id } });
    await prisma.review.deleteMany({ where: { itemId: req.params.id } });
    const carts = await prisma.cart.findMany({
  where: {
    items: { some: { id: req.params.id } }
  }
});

for (const cart of carts) {
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      items: { disconnect: { id: req.params.id } }
    }
  });
}

    await prisma.item.delete({ where: { id: req.params.id } });

    res.json({ message: "Item deleted successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


router.delete('/users/:id',authMiddleware,adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ message: "Admin ko delete nahi kar sakte" });
    }

    const userItems = await prisma.item.findMany({ 
  where: { ownerId: req.params.id }, 
  select: { id: true } 
});
const itemIds = userItems.map(i => i.id);

const userRentals = await prisma.rental.findMany({
  where: { 
    OR: [
      { userId: req.params.id },
      { itemId: { in: itemIds } }
    ]
  },
  select: { id: true }
});
const rentalIds = userRentals.map(r => r.id);

await prisma.transaction.deleteMany({ 
  where: { rentalId: { in: rentalIds } }
});
await prisma.rental.deleteMany({ 
  where: { id: { in: rentalIds } } 
});

await prisma.review.deleteMany({ where: { userId: req.params.id } });
await prisma.kYC.deleteMany({ where: { userId: req.params.id } });
await prisma.cart.deleteMany({ where: { userId: req.params.id } });
await prisma.item.deleteMany({ where: { ownerId: req.params.id } });
await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// Pending Reviews
router.get('/pending-reviews', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rentals = await prisma.rental.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        item: { select: { name: true, images: true } },
        user: { select: { name: true, email: true } },
        transaction: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Approve
router.post('/approve-rental', authMiddleware, adminOnly, async (req, res) => {
  try {
  const { rentalId } = req.body;
 

const rental = await prisma.rental.findUnique({
  where: { id: rentalId },
  include: { item: true }  // transaction include mat karo
});

const paymentTxn = await prisma.transaction.findFirst({
  where: { 
    rentalId: rentalId,
    type:     "PAYMENT"
  }
});

console.log("Query rentalId:", rentalId);
console.log("Found:", paymentTxn);



  if (!rental) {
    return res.status(404).json({ message: "Rental not found" });
  }


  console.log("Rental status:", rental.status);
  console.log("isDamaged:", rental.isDamaged);
  console.log("PaymentTxn:", paymentTxn);
  console.log("RazorpayId:", paymentTxn?.razorpayId);
  console.log("DepositAmount:", rental.depositAmount);

  await prisma.$transaction(async (tx) => {
    await tx.rental.update({
      where: { id: rentalId },
      data: {
        status:         "COMPLETED",
        damageResolved: true
      }
    });

    await tx.item.update({
      where: { id: rental.itemId },
      data:  { availability: true }
    });

    // Refund calculate
    if (paymentTxn?.razorpayId) {
      let refundAmount = 0;

      // if (!rental.isDamaged) {
      //   refundAmount = rental.depositAmount;          // Full refund
      // } else if (rental.damageAmount > 0) {
      //   refundAmount = rental.depositAmount - rental.damageAmount; // Partial
      // } else {
      //   refundAmount = 0;                             // No refund
      // }
      // adminApprove mein refund calculate karte waq

if (!rental.isDamaged) {

  const extraCharge = rental.extraCharge || 0;
  refundAmount = rental.depositAmount - extraCharge;
  
  // Refund negative nahi hona chahiye
  if (refundAmount < 0) refundAmount = 0;

} else if (rental.damageAmount > 0) {
  // Minor damage + extra charge dono kato
  const extraCharge = rental.extraCharge || 0;
  refundAmount = rental.depositAmount - rental.damageAmount - extraCharge;
  if (refundAmount < 0) refundAmount = 0;

} else {
  // Major damage - No refund
  refundAmount = 0;
}

      if (refundAmount > 0) {
        const refund = await razorpay.payments.refund(
          paymentTxn.razorpayId,  
          { amount: refundAmount * 100 }
  //          { 
  //   amount: refundAmount * 100,
  //   speed: "optimum"  //  Instant refund
  // }
        );

        await tx.transaction.create({
          data: {
            rentalId,
            userId:        rental.userId,
            paymentMethod: "razorpay",
            type:          "REFUND",
            status:        "SUCCESS",
            razorpayId:    refund.id,
            refundedAt:    new Date()
          }
        });
      }
    }
  });
  res.json({ message: "Rental approved" });

} catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;