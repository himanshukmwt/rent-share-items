const prisma = require('../config/prisma')

const submitKYC = async (req, res) => {
  try {
    const { documentType, documentNumber, documentImageUrl, selfieUrl } = req.body;

    const existing = await prisma.kYC.findUnique({
      where: { userId: req.user.id }
    });

    if (existing) {
      return res.status(400).json({ message: "KYC already submitted" });
    }

    const kyc = await prisma.kYC.create({
      data: {
        userId: req.user.id,
        documentType,
        documentNumber,
        documentImageUrl,
        selfieUrl,
        verificationStatus: "PENDING"
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { kycSubmitted: true }
    });

    res.status(201).json(kyc);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getMyKYC = async (req, res) => {
  try {
    const kyc = await prisma.kYC.findUnique({
      where: { userId: req.user.id }
    });

    if (!kyc) {
      return res.status(404).json({ message: "KYC not submitted" });
    }

    res.json(kyc);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyKYC = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { kycId, status } = req.body;

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const kyc = await prisma.kYC.findUnique({
      where: { id: kycId }
    });

    if (!kyc) {
      return res.status(404).json({ message: "KYC not found" });
    }

    const result = await prisma.$transaction(async (tx) => {

      const updatedKyc = await tx.kYC.update({
        where: { id: kycId },
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
};

const getAllKYC = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    const kycs = await prisma.kYC.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(kycs);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  submitKYC,
  getMyKYC,
  verifyKYC,
  getAllKYC
}