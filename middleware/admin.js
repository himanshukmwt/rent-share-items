function adminOnly(req,res,next){
  if(req.user.role !== "ADMIN"){
    return res.status(403).json({
      message:"Admin Only"
    });
  }

  next();
}

module.exports = adminOnly;