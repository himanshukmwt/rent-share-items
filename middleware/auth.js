const {getUser}=require("../service/auth");
async function authMiddleware(req, res, next) {
  let token = null;

  // 1. Header se (mobile)
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Cookie se (web)
  if (!token && req.cookies?.uid) {
    token = req.cookies.uid; 
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = getUser(token);
  if (!user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.user = user;

  next();
}

module.exports={
    authMiddleware,
}
