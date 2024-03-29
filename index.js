const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)

///middleware


app.use(express.json())
app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
  }));


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bxqusfm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'Unathorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
  
        next()

    })
}

async function run() {
    try {
        await client.connect()

        const productCollection = client.db('Assignment-12').collection('tools')
        const orderCollection = client.db('Assignment-12').collection('orders')
        const paymentsCollection = client.db('Assignment-12').collection('payments')
        const updateproCollection = client.db('Assignment-12').collection('updatepro')
        const userCollection = client.db('Assignment-12').collection('user')
        const reviewsCollection = client.db('Assignment-12').collection('reviews')

        //post review 
        app.post('/postreview',async(req,res)=>{
            const review = req.body
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })
        //get review  sf 
        app.get('/getreview',async(req,res)=>{
          
            const page=parseInt(req.query.page)
            const size=parseInt(req.query.size)

            const query={}
            const cursor=reviewsCollection.find(query).sort({$natural:-1})
            let product
            if(page||size){
                product=await cursor.skip(page*size).limit(size).toArray()
            }
            else{
                product=await cursor.toArray()
            }
        
            res.send(product)
        })
        //review user base profile 
        app.get('/pro', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const pro = await userCollection.find(query).toArray()
            res.send(pro)
        })
        //paginate review 
        app.get('/count',async(req,res)=>{
        
           
            const count=await reviewsCollection.estimatedDocumentCount()
            res.send({count})
            
        })
        //payment 
        app.post('/create-payment-intent',verifyJWT,async(req,res)=>{
            const {price}=req.body;
            const amount=price*100 
            const paymentIntent = await stripe.paymentIntents.create({
                amount:amount,
                currency: "usd",
                payment_method_types:['card']
               
              });
              res.send({
                clientSecret:paymentIntent.client_secret
              })

        })
        //payment update 
        app.patch('/payment/:id',verifyJWT,async(req,res)=>{
            const id=req.params.id
            const payment=req.body
            const filter={_id:ObjectId(id)} 
            const updatedDoc={
                $set:{
                    paid:true,
                    tid:payment.tid

                }
            }
            const result =await paymentsCollection.insertOne(payment)
            const updatedPayment= await orderCollection.updateOne(filter,updatedDoc)
            res.send(updatedDoc)

        })
        //order shipped 
        app.put('/shipped/:id',verifyJWT,async(req,res)=>{
            const id=req.params.id
            const options = { upsert: true }
            const filter={_id:ObjectId(id)} 
            const updatedDoc={
                $set:{
                    shipped:true

                }
            }
          
            const updatedPayment= await orderCollection.updateOne(filter, updatedDoc, options)
            res.send(updatedDoc)

        })
        
           
        //get all tools
        app.get('/tools', async (req, res) => {
            cursor=productCollection.find().sort({$natural:-1})
            const product=await cursor.toArray()
            res.send(product)
        })
        //post tools 
        app.post('/addproduct',async(req,res)=>{

            const product = req.body
            const result = await productCollection.insertOne(product)
            res.send(result)
        })

        //get last 6 upload tools 
        app.get('/updatetools',async(req,res)=>{
            const query={}
            const cursor=productCollection.find().limit(6).sort({$natural:-1})
            const product=await cursor.toArray()
            res.send(product)
        })

        //tools for purchase
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const product = await productCollection.findOne(query)
            res.send(product)
        })

        //tools delete 
        app.delete('/product/:id',async(req,res)=>{
            const id=req.params.id 
            const query={_id:ObjectId(id)}
            const result=await productCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        //user base order 
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email
            const decodedEmail = req.decoded.email
        
            if (email == decodedEmail) {
                const query = { email: email }
                const pro = await orderCollection.find(query).toArray()
                return res.send(pro)
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }


        })

        app.get('/orders',verifyJWT,async(req,res)=>{

            const result=await orderCollection.find().toArray()
            res.send(result)

        })
        app.delete('/order/:id',async(req,res)=>{
            const id=req.params.id 
            const query={_id:ObjectId(id)}
            const result=await orderCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/payment/:id', verifyJWT,async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(query)
            res.send(result)
        })

        app.put('/updatepro', async (req, res) => {
            const update = req.body
       
            const filter = { email: update.email }
            const options = { upsert: true }
            const updateDoc = {
                $set: update
            }
            const img={
                $set:{photo:update.img,email:update.email}
            }
            const user= await userCollection.updateOne(filter,img,options)
            const review= await reviewsCollection.updateOne(filter,img,options)
            const result = await updateproCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.get('/userpro', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const pro = await updateproCollection.find(query).toArray()
            res.send(pro)
        })

        // all users get
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })
        //delete user 
        app.delete('/duser/:id',async(req,res)=>{
            const id=req.params.id 
            const query={_id:ObjectId(id)}
            const result=await userCollection.deleteOne(query)
            res.send(result)
        })
        //user save and update
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
            res.send({ result, token })
        })

        //role admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const requester = req.decoded.email
            const requestAccout = await userCollection.findOne({ email: requester })
            if (requestAccout.role === 'admin') {

                const filter = { email: email }
                const updateDoc = {
                    $set: { role: 'admin' },
                }
                const result = await userCollection.updateOne(filter, updateDoc)
                res.send(result)
            }
            else{
                res.status(403).send({message:'Forbidden'})
            }

        })
        //checek admin for useAdmin
        app.get('/admin/:email',async(req,res)=>{
            const email=req.params.email 
            const user=await userCollection.findOne({email:email})
            const isAdmin=user?.role==='admin'
            res.send({admin:isAdmin})
        })




    }
    finally {

    }

}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Running Server !!!')
})
app.listen(port, () => {
    console.log('Listening to port', port)
})