const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hvhc0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
    }
});




async function run() {
    try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('FoodHutDB').collection('users');
    const menuCollection = client.db('FoodHutDB').collection('menus');
    const reviewCollection = client.db('FoodHutDB').collection('reviews');
    const cartsCollection = client.db('FoodHutDB').collection('carts');




    // users relataed API 
    app.post('/users', async(req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get('/users', async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.delete('/users/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })

    app.patch('/users/admin/:id', async(req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                role: 'admin'
            }
        }
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
    })

    // menu related API 
    app.get('/menus', async (req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
    })

    app.post('/menus', async(req, res) => {
        const menu = req.body;
        const result = await menuCollection.insertOne(menu);
        res.send(result);
    })

    app.delete('/menus/:id' , async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await menuCollection.deleteOne(query);
        res.send(result);
    })

    // cart related API 
    app.post('/carts', async(req, res) => {
        const item = req.body;
        const result = await cartsCollection.insertOne(item);
        res.send(result);
    })

    app.get('/carts', async(req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
    })

    app.delete('/carts/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await cartsCollection.deleteOne(query);
        res.send(result);
    })

    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('FoodHut Server is Running');
})


app.listen(port, () => {
    console.log(`FoodHut Server is running On Port: http://localhost:${port}`);
})