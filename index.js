const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// ! middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://diagpulse.web.app",
      "https://diagpulse.firebaseapp.com",
    ],
  })
);

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
    // await client.connect();

    const userCollection = client.db("diagPulseDB").collection("users");
    const bannerCollection = client.db("diagPulseDB").collection("banners");
    const paymentCollection = client.db("diagPulseDB").collection("payments");
    const appointmentCollection = client
      .db("diagPulseDB")
      .collection("appointments");
    const promotionCollection = client
      .db("diagPulseDB")
      .collection("promotions");
    const recommendationCollection = client
      .db("diagPulseDB")
      .collection("recommendation");
    const testCollection = client.db("diagPulseDB").collection("tests");

    // ! jwt related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ! Custom Middleware
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers?.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const token = req.headers?.authorization.split(" ")[1];

      if (!token) {
        return res.status(401).send({ message: "token nai" });
      }
      jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "wrong token" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // ! verify Admin middleware must use after verify token

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // ! user Related API
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // ! check Is Admin
    app.get("/users/admin", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);

      let admin = false;
      if (user) {
        admin = user.role === "Admin";
      }

      res.send(admin);
    });

    // for profile
    app.get("/user", verifyToken, async (req, res) => {
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
    app.patch("/user/:id", verifyToken, async (req, res) => {
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
    app.patch("/updateUser/:id", verifyToken, verifyAdmin, async (req, res) => {
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
    app.delete(
      "/deleteUser/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      }
    );

    // ! Banner Related API
    app.get("/banners", verifyToken, verifyAdmin, async (req, res) => {
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
      res.send(result);
    });

    app.delete("/deleteBanner/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/addBanner", verifyToken, async (req, res) => {
      const user = req.body;
      const result = await bannerCollection.insertOne(user);
      res.send(result);
    });

    // ! test related API
    app.get("/tests", async (req, res) => {
      const result = await testCollection.find().toArray();
      res.send(result);
    });

    app.get("/allTests", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await testCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/testCount", async (req, res) => {
      const count = await testCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/test/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.findOne(query);
      res.send(result);
    });

    app.post("/addTest", verifyToken, verifyAdmin, async (req, res) => {
      const test = req.body;
      const result = await testCollection.insertOne(test);
      res.send(result);
    });

    app.delete("/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const newTest = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: newTest.name,
          description: newTest.description,
          category: newTest.category,
          image: newTest.image,
          sample_type: newTest.sample_type,
          purpose: newTest.purpose,
          price: newTest.price,
          slot: newTest.slot,
          date: newTest.date,
        },
      };

      const result = await testCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.patch("/testsSlotUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const newTest = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: newTest.name,
          description: newTest.description,
          category: newTest.category,
          image: newTest.image,
          sample_type: newTest.sample_type,
          purpose: newTest.purpose,
          price: newTest.price,
          slot: newTest.slot,
          date: newTest.date,
          bookedCount: newTest.bookedCount,
        },
      };

      const result = await testCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // ! appointments

    app.get("/appointments", verifyToken, verifyAdmin, async (req, res) => {
      const result = await appointmentCollection.find().toArray();
      res.send(result);
    });

    app.get("/appointments/delivered", verifyToken, async (req, res) => {
      const status = req.query.status;
      const email = req.query.email;
      const query = { email, status };
      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/appointments/search", verifyToken, async (req, res) => {
      const email = req.query.email;
      const user = await userCollection.findOne({ email });
      if (user) {
        const result = await appointmentCollection.find({ email }).toArray();
        res.send(result);
      } else {
        res.status(404).send({ message: "user not found" });
      }
    });

    app.get("/reservation/search", async (req, res) => {
      const name = req.query.name;
      const result = await appointmentCollection.find({ name }).toArray();
      res.send(result);
    });

    app.post("/appointments", async (req, res) => {
      const appoint = req.body;
      const result = await appointmentCollection.insertOne(appoint);
      res.send(result);
    });

    app.patch("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "canceled",
        },
      };

      const result = await appointmentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch(
      "/appointments/delivery/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const up = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            status: "delivered",
            resultUrl: up.resultUrl,
          },
        };

        const result = await appointmentCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      }
    );

    app.delete(
      "/reservation/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await appointmentCollection.deleteOne(query);
        res.send(result);
      }
    );

    // ! payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment History
    app.post("/paymentHistory", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    // ! recommendations
    app.get("/recommendations", async (req, res) => {
      const result = await recommendationCollection.find().toArray();
      res.send(result);
    });
    // ! promotions
    app.get("/promotions", async (req, res) => {
      const result = await promotionCollection.find().toArray();
      res.send(result);
    });

    //! Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
