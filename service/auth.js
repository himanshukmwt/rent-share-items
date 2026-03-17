const jwt=require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

function setUser(user){
    return jwt.sign({
        id:user.id,
        role: user.role, 
    },
    secret,
        {
             expiresIn: '30d' ,
        }  
);
}
function getUser(token){
    if(!token) return null;
    try{
        return jwt.verify(token,secret);
    }
    catch(err){
        return null;
    }
}

module.exports={
    setUser,
    getUser,
}