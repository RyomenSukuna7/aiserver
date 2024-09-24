const express = require('express');
const cluster = require("cluster");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require('dotenv').config();
const os=require("os").cpus().length;
// const { sendMessage } = require('./chatbot'); 
const compression=require("compression")
const NodeCache = require( "node-cache" );

const app = express();
const port = process.env.PORT || 4000;

const myCache = new NodeCache()

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(compression(
    { 
        level:6,
        filter: (req,res)=>{
            if (req.headers['x-no-compression']) {
                return false
              }
              return compression.filter(req, res)
            }

    }))

app.use((err, req, res, next) => {
        console.error(err.stack);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
        }
    });



(async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Failed to connect to MongoDB", error.message);
    }
})();
const schema = new mongoose.Schema({
    name: String,
    lastName: String,
    email: String
});
const Product = mongoose.models.userinfo || mongoose.model("userinfo", schema);
// let chatHistory = [];

    app.post("/login", async (req, res) => {
        try { 
            const data = req.body;
            const existingUser = await Product.findOne({ email: data.email });
    
             if (existingUser) {
                return res.json({ "erroremail": true });
            } else {
                const token = jwt.sign({ data },process.env.KEY);
                const newProduct = new Product(data);
                await newProduct.save();
                myCache.del("productss");
                return res.json({ "success": true, "token": token });
            }
        } catch (error) {
            res.status(500).json({ error: "Failed to save data", details: error.message });
        }
    });
    
    app.get("/apiDB", async (req, res) => {
        let datas;
        try {
            if(myCache.has("productss")){
                datas=JSON.parse(myCache.get("productss"));
            }else{

                datas = await Product.aggregate([ 
                    { $project: { email: 1, _id: 0 }},
                    { $sort: { email: 1 }}
                ]);

                myCache.set("productss",JSON.stringify(datas));

            }
            res.json(datas);
        } catch (error) {
            res.status(500).json({ error: "Failed to retrieve data", details: error.message });
        }
    });
    // app.post('/ask', async (req, res) => {
    //     const prompt = req.body.prompt;
    //     try {
    //         const response = await sendMessage(prompt);  
    //         chatHistory.push({ prompt, response });
    //         res.json({ response });
    //     } catch (error) {
    //         console.error('Error during the conversation:', error);
    //         res.status(500).json({ error: 'Something went wrong with OpenAI API' });
    //     }
    // });
    
    // app.get('/chat-history', (req, res) => {
    //     res.json(chatHistory);
    // });





app.listen(port ,() => {
    console.log("Server running with custom domain on AWS Amplify");
});


