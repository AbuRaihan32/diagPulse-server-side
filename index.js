const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// ! middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fxbdhbr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("diagPulseDB").collection("users");
    const bannerCollection = client.db("diagPulseDB").collection("banners");
    const promotionCollection = client
      .db("diagPulseDB")
      .collection("promotions");
    const recommendationCollection = client
      .db("diagPulseDB")
      .collection("recommendation");

    // ! user Related API
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // for profile
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // update User info by User
    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;

      const filter = { _id: new ObjectId(id) };

      const updatedUser = {
        $set: {
          blood: user.blood,
          district: user.district,
          image: user.image,
          name: user.name,
          upazila: user.upazila,
        },
      };

      const result = await userCollection.updateOne(filter, updatedUser);

      res.send(result);
    });

    // update User role and status and role by admin
    app.patch("/updateUser/:id", async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: info.role,
          status: info.status,
        },
      };

      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // by Admin
    app.delete("/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // ! Banner Related API
    app.get("/banners", async (req, res) => {
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });

    app.get("/activeBanner", async (req, res) => {
      const status = req.query.status;
      const query = { status: status };
      const result = await bannerCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/updateBanner/:id", async (req, res) => {
      const id = req.params.id;
      const newBanner = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          title: newBanner.title,
          image: newBanner.image,
          bgImage: newBanner.bgImage,
          text: newBanner.text,
          couponCode: newBanner.couponCode,
          discountRat: newBanner.discountRat,
          expireDate: newBanner.expireDate,
          status: newBanner.status,
        },
      };

      const result = await bannerCollection.updateOne(filter, updatedDoc);
      res.send(result)
    });

    app.delete("/deleteBanner/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("DiagPulse Server is Running");
});

app.listen(port, () => {
  console.log(`DiagPulse Server Running In port ${port}`);
});
