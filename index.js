const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_API_KEY);


// middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));




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
    // await client.connect();

    const userCollection = client.db('FoodHutDB').collection('users');
    const menuCollection = client.db('FoodHutDB').collection('menus');
    const reviewCollection = client.db('FoodHutDB').collection('reviews');
    const cartsCollection = client.db('FoodHutDB').collection('carts');
    const paymentsCollection = client.db('FoodHutDB').collection('payments');

    // jwt related API 
    app.post('/jwt', async(req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1h'
        });
        res.send({token});
    })

    const verifyToken = (req, res, next) => {
        const authHeader = req.headers.authorization;
    
        if (!authHeader) {
            return res.status(401).send({ message: 'Unauthorized access: no token provided' });
        }
    
        const token = authHeader.split(' ')[1];
    
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).send({ message: 'Token expired' });
                }
                return res.status(401).send({ message: 'Invalid token' });
            }
    
            req.decoded = decoded;
            next();
        });
    };
    

    const verifyAdmin = async(req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
            return res.status(403).send({message: 'forbidden access'});
        }
        next();
    }

    // users relataed API 
    app.post('/users', async(req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get('/users', async(req, res) => {
        // console.log(req.headers);
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        
        const query = { email: email };
        const user = await userCollection.findOne(query);
    
        const isAdmin = user?.role === 'admin';
        res.send({ admin: isAdmin });
    });

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

    app.delete('/menus/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const result = await menuCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);  // Send the result to the front-end (including deletedCount)
        } catch (err) {
            console.error("Delete failed:", err);
            res.status(500).json({ message: 'Internal server error' });
        }
    });
    

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

    app.post('/reviews', async(req, res) => {
        const item = req.body;
        const result = await reviewCollection.insertOne(item);
        res.send(result);
    })


    // payment related API

    // payment internt 
    app.post('/create-payment-intent', async (req, res) => {
        const { price } = req.body;
        const amount =Math.round(price * 100); // Convert to cents
        // console.log(amount);
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method_types: ['card'],
        });
        res.send({clientSecret: paymentIntent.client_secret,});
    });

    app.post('/payments', async(req, res) => {
        const payment = req.body;
        const paymentResult = await paymentsCollection.insertOne(payment);
        // delete is item 
        const query = { _id: {
            $in: payment.cartItems.map(id => new ObjectId(id))
        }}
        const deleteResult = await cartsCollection.deleteMany(query);
        res.send({paymentResult, deleteResult});
    })

    app.get('/payments/:email', async(req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await paymentsCollection.find(query).toArray();
        res.send(result);
    })

    app.get('/payments', async(req, res) => {
        const result = await paymentsCollection.find().toArray();
        res.send(result);
    })


    // home 
    app.get('/admin-stats', async(req, res) => {
        const users = await userCollection.estimatedDocumentCount();
        const products = await menuCollection.estimatedDocumentCount();
        const orders = await paymentsCollection.estimatedDocumentCount();
        // const revenue = await paymentsCollection.find().toArray();
        // const totalRevenue = revenue.reduce((sum, payment) => sum + payment.price, 0);

        const Revenue = await paymentsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: '$price'
                    }
                }
            }
        ]).toArray();
        const totalRevenueValue = Revenue.length > 0 ? Revenue[0].totalRevenue : 0;

        res.send({ users, products, orders, totalRevenueValue });
    })

    // using aggregate pipeline to get the revenue
    app.get('/order-stats', async(req, res) => {
        const result = await paymentsCollection.aggregate([
            {
                $unwind: '$foodItemId'
            },
            {
                $lookup: {
                    from: 'menus',
                    localField: 'foodItemId',
                    foreignField: '_id',
                    as: 'foodItem'
                }
            },
            {
                $unwind: '$foodItem'
            },
            {
                $group: {
                    _id: '$foodItem.category',
                    quantity: { $sum: 1 },
                    revenue: { $sum: '$foodItem.price' }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    quantity: '$quantity',
                    revenue: '$revenue'
                }
            }
        ]).toArray();
        res.send(result);
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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