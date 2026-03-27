const express = require("express");
const router = express.Router();
 const prisma = require('../config/prisma')

const { authMiddleware } = require("../middleware/auth");
const  adminOnly  = require('../middleware/admin');


router.post('/reports', authMiddleware, async (req, res) => {
  try {
    const { type, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const report = await prisma.report.create({
      data: {
        userId: req.user.id,
        type,
        description
      }
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/reports', authMiddleware, adminOnly, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/reports/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.report.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED' }
    });
    res.json({ message: 'Report resolved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports=router;


