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
      rental: { include: { item: { select: { name: true } } } }
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

module.exports = router;