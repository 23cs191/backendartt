// index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Add this line to serve static files from uploads directory

// Multer setup (storing images locally in 'uploads' folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://vishnumohan:rootuser@projectart.cjfcw.mongodb.net/originalart", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Schema models
const artworkSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageUrl: String,
});

const userSchema = new mongoose.Schema({
  email: String,
  uname: String,
  password: String,
});

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  artworkId: { type: mongoose.Schema.Types.ObjectId, ref: "Artwork", required: true },
  quantity: { type: Number, default: 1 },
});

const Artwork = mongoose.model("Artwork", artworkSchema);
const User = mongoose.model("User", userSchema);
const CartItem = mongoose.model("CartItem", cartItemSchema);

// POST a new artwork
app.post("/api/artworks", upload.single("image"), async (req, res) => {
  const { title, description, price } = req.body;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : "";
  try {
    const newArtwork = new Artwork({ title, description, price, imageUrl });
    await newArtwork.save();
    res.status(201).json(newArtwork);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET all artworks
app.get("/api/artworks", async (req, res) => {
  try {
    const artworks = await Artwork.find();
    res.json(artworks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE artwork
app.delete("/api/artworks/:id", async (req, res) => {
  try {
    const deletedArtwork = await Artwork.findByIdAndDelete(req.params.id);
    if (!deletedArtwork) return res.status(404).json({ message: "Artwork not found" });
    res.status(200).json({ message: "Artwork deleted successfully", deletedArtwork });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User Registration
app.post("/register", async (req, res) => {
  const { email, uname, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, uname, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "New user created successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, "my_secret", { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token || !token.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Access denied, token is missing or invalid" });
  }
  
  try {
    const decoded = jwt.verify(token.split(" ")[1], "my_secret");
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

// Get user info (protected route)
app.get("/api/userinfo", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ id: user._id, email: user.email, uname: user.uname });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add item to cart
app.post("/api/cart", verifyToken, async (req, res) => {
  const { artworkId, quantity } = req.body;
  
try {
      const existingCartItem = await CartItem.findOne({
        userId:req.userId,
        artworkId 
      });

      if(existingCartItem){
        existingCartItem.quantity += quantity;
        await existingCartItem.save();
      }else{
        const newCartItem= new CartItem({
          userId:req.userId,
          artworkId,
          quantity 
        });

        await newCartItem.save();
      }

      res.status(201).json({
        message:"Item added to cart successfully"
      });

   }catch(error){
       res.status(500).json({
         message:error.message 
       })
   }

});

// Remove item from cart
app.delete("/api/cart/:artworkId", verifyToken, async (req, res) => {
try{
     await CartItem.findOneAndDelete({
       userId:req.userId,
       artworkId:req.params.artworkId 
     });

     res.status(200).json({
       message:"Item removed from cart successfully"
     });

}catch(error){
     res.status(500).json({
       message:error.message 
     })
}
});

// Get user's cart
app.get("/api/cart", verifyToken, async (req,res)=>{
   try{
      const cartItems= await CartItem.find({
         userId:req.userId 
      }).populate("artworkId");

      res.status(200).json(cartItems);

   }catch(error){
      res.status(500).json({
         message:error.message 
      })
   }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
