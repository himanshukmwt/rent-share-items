const prisma = require('../config/prisma')

const submitKYC = async (req, res) => {
  try {
    const { documentType, documentNumber } = req.body;

    // Cloudinary se URLs 
    const documentImageUrl = req.files?.document?.[0]?.path
    const selfieUrl        = req.files?.selfie?.[0]?.path

    if (!documentImageUrl) {
      return res.status(400).json({ message: "Document image required" })
    };
    
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



module.exports = {
  submitKYC,
  getMyKYC,
}