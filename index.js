const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors())
app.use(express.json())



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
        const updateproCollection = client.db('Assignment-12').collection('updatepro')
        const userCollection = client.db('Assignment-12').collection('user')

        app.get('/tools', async (req, res) => {
            const tools = await productCollection.find().toArray()
            res.send(tools)
        })

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const product = await productCollection.findOne(query)
            res.send(product)
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

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(query)
            res.send(result)
        })

        app.put('/updatepro', async (req, res) => {
            const update = req.body
            // console.log(update)
            const filter = { email: update.email }
            const options = { upsert: true }
            const updateDoc = {
                $set: update
            }
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
            const isAdmin=user.role==='admin'
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