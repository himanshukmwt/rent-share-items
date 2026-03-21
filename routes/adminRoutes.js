const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const  adminOnly  = require('../middleware/admin');

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
      item:  { include: { owner: { select: { name: true } } } }
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

// ✅ User ki rentals find karo
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

// ✅ Transactions delete karo — rentalId se
await prisma.transaction.deleteMany({ 
  where: { rentalId: { in: rentalIds } }
});

// ✅ Ab rentals delete karo
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

module.exports = router;