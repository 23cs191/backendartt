const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization"?.split(" ")[1]);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "Access denied. No token " });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "my_secret");
        req.user = decoded;
        
    } catch (error) {
        return res.status(400).send({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;
