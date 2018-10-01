// adding necessary packages
const express = require('express')
const app = express()
const SHA256 = require('crypto-js/sha256');
const level = require('level');

const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')

//To store Chain data..
const chainDB = './chaindata';
const db = level(chainDB, {valueEncoding: 'json'});

//To store key values..
const keyDB = './keydata';
const db2 = level(keyDB);

// array that holds the blocks
let chain = []

// array to view the entire chain when request is made
let blockChain = []

// addr stores address
var addr = ""
// response is used to facilitate request validation
var response;
// check is a temporary variable to check if signature verified on time
var check = false


// for using json in http POST request
app.use(express.json())

// universal variable for better access
let b_height, b_body, b_time, b_previousBlockHash, b_hash;

// variable to hold endpoints
let endpoints = ("Welcome! Below are the endpoints that you can try."
+ "\n\n1. http://localhost:8000/requestValidation - allows users to submit their request using their wallet address.."
+"\n\n2. http://localhost:8000/message-signature/validate - allows users to validate their signature after submitting a request." 
+"\n\n3. http://localhost:8000/block - allows user to register a star."
+"\n\n4. http://localhost:8000/block/:height - returns the block corresponding to the height."
+"\n\n5. http://localhost:8000/stars/address:addr - returns all the blocks associated with the address."
+"\n\n6. http://localhost:8000/stars/hash:h - returns the block corresponding to the hash."
+ "\n\n7. http://localhost:8000/chain - To get the recent blocks in the chain.")

// block class for creating blocks
class Block{
    constructor(data){
           // get key from db2 
            db2.get('key', function(err, value){
                // checks if the chain has a genesis block or not
                if(!value){
                    b_height = 0,
                    b_body = "First block in the chain - Genesis block",
                    b_time = new Date().getTime().toString().slice(0,-3),
                    b_previousBlockHash = "";
                    b_hash = SHA256(JSON.stringify(b_body) + b_height + b_previousBlockHash + b_time).toString();
                    // putting key in db2
                    db2.put('key', b_height, function(err){
                        // putting block in db
                        db.put(b_height, {hash: b_hash, height: b_height, body: b_body, time:b_time, 
                            previousBlockHash: b_previousBlockHash}, function(err){
                        })
                    })
                    // calling addBlock function to add block to chain temporarily
                    addBlock(b_hash, b_height, b_body, b_time, b_previousBlockHash)
                }else{
                    // updating height based on recent block
                    b_height = parseInt(value)+1,
                    b_body = data,
                    b_time = new Date().getTime().toString().slice(0,-3),
                    // get last stored block from db
                    db.get(value, function(err, pHash){
                        b_previousBlockHash = pHash.hash;
                        b_hash = SHA256(JSON.stringify(b_body) + b_height + b_previousBlockHash + b_time).toString();
                        //putting key and block in db2, db respectively
                        db2.put('key', b_height, function(err){})
                        db.put(b_height, {hash: b_hash, height: b_height, body: b_body, time:b_time, 
                            previousBlockHash: b_previousBlockHash}, function(err){})
                        // calling addBlock function to add block to chain temporarily    
                        addBlock(b_hash, b_height, b_body, b_time, b_previousBlockHash)
                    })
                }
        })
    }
}  

// a function to add blocks to chain temporarily 
function addBlock(ha, he, b, t, pBlockHash){
        chain.push({"hash":ha, "height":he, "body":b, "time":t, "previousBlockhash":pBlockHash}) 
}

// a function to store entire chain/specific blocks
function Blockchain(value){
    blockChain.push(value)
}

// http GET request for knowing endpoints
app.get('/', (req, res) => {
    res.send(endpoints)
})

// http GET request to view recent blocks in the chain
app.get('/chain', (req, res) => {
    db2.get('key', function(err, key){
        if(!key){
            res.send("There is no data!")  
        }else{
            db.createKeyStream()
                .on('data', function (data) {
                    db.get(data, function(err, value){
                        Blockchain(value)
                    })
                })
            setTimeout(() => {
                res.send(blockChain)
                blockChain = []}, 2000)    
        }
    })
})

// http POST request for a validation of address
app.post('/requestValidation', (req, res) => {

    const addressInput = {
        address:req.body.address
    }

    if(!req.body.address){
        res.status(400).send("Please input a valid data!")
        return
    }

    addr = addressInput.address

    response = {
        "address":addr,
        "requestTimeStamp":new Date().getTime().toString().slice(0,-3),
        "message":`${addr}:${new Date().getTime().toString().slice(0,-3)}:starRegistery`,
        "validationWindow":"300"
     }

     res.send(response)

     setTimeout(() => {// validationWindow for 5 minutes
         if(!check)
            addr="null"}, 300000)
     
})

// http POST request for signature validation
app.post('/message-signature/validate', (req,res) => {
    const payload = {
        address:req.body.address,
        signature:req.body.signature
    }

    if(addr == ""){// check whether request sent
        res.send("Send a request first!")
        return
    }else if(addr == "null"){// check whether time expired
        res.send("Timeout! Restart the process.")
        return
    }else if(!req.body.address || !req.body.signature){// check if there is a input
        res.send("Please input both address & signature to verify!")
        return
    }else if(payload.address == addr){// check if address matches with the request placed
        var status = bitcoinMessage.verify(response['message'],addr,payload.signature)// verification process
        if(status){
            var messageSignature = 'valid'
            check = true 
        }else{
            var messageSignature = 'Invalid'
        }

        var verify = {
            "registerStar": status,
            "status": {
                        "address": addr,
                        "requestTimeStamp": response['requestTimeStamp'],
                        "message": response['message'],
                        "validationWindow": new Date().getTime().toString().slice(0,-3) - response['requestTimeStamp'],
                        "messageSignature": messageSignature
                        }
                    }
        res.send(verify)
        return
    }else{
        res.send("Address does not match with the address provided during request!")
    }
})

// http POST request to register a star
app.post('/block', (req, res) => {
    
    // asusual check
    if(addr == ""){
        res.send("Send a request first!")
        return
    }else if(addr == "null"){
        res.send("Timeout! Restart the process.")
        return
    }
    
    const starData = {
        address:req.body.address,
        star:{
            dec:req.body.star.dec,
            ra:req.body.star.ra,
            story:req.body.star.story
            }
        }
    
    if(!req.body.address || !req.body.star.dec || !req.body.star.ra || !req.body.star.story){
        res.status(400).send("Please input a valid data!")
        return
    }else if(req.body.star.story.length > 500){
        res.send("Input limit exceeded for Story! Input less than 250 words/500 characters.")
    }

    // Hex encoded Ascii string for story
    starData.star.story = new Buffer(req.body.star.story).toString('hex')

    if(req.body.address == addr){
        // get key from db2 
        db2.get('key', function(err, value){
        // check if there is a genesis block
            if(!value){
                new Block(starData)
                setTimeout(() => {new Block(starData)}, 1000)
                        
                setTimeout(() => {res.send(chain[chain.length-1])}, 2000)

                addr = "" // reset address after star is registered
                }else{
                    // adding new block if there is a genesis block already present in the chain
                    new Block(starData)
                    // simple timeout to manage asynchronous activity
                    setTimeout(() => res.send(chain[chain.length-1]), 1000)

                    addr = "" // reset address after star is registered
                }
        })
    }else{
        res.send("Address is not verified! Check again.")
    }        
})

// http GET request for getting blocks
app.get('/block/:height', (req,res) => {
    // checks if the block is present in the chain
    db2.get('key', function(err, key){
        if(!key || req.params.height>parseInt(key)){
            res.status(400).send(`Block with height ${req.params.height} does not exist!`)
            return
        }else{
            db.get(req.params.height, function(err, value){
                res.send(value)
            })
        }
    })
})

// http GET request for getting blocks based on address
app.get('/stars/address:address', (req, res) => {
    var str = req.params.address
    db2.get('key', function(err, key){
        if(!key){
            res.send("There is no data!")  
        }else{
            db.createKeyStream()
                .on('data', function (data) {
                    db.get(data, function(err, value){
                        if(value.body['address'] == str.substring(1))// substring(1) removes the : from string 
                            Blockchain(value)
                    })
                })
            setTimeout(() => {
                res.send(blockChain)
                blockChain = []}, 2000)    
        }
    })
})

// http GET request for getting block based on hash value
app.get('/stars/hash:h', (req, res) => {
    var str = req.params.h
    db2.get('key', function(err, key){
        if(!key){
            res.send("There is no data!")  
        }else{
            db.createKeyStream()
                .on('data', function (data) {
                    db.get(data, function(err, value){
                        console.log(str)
                        if(value.hash == str.substring(1)) 
                            Blockchain(value)
                    })
                })
            setTimeout(() => {
                res.send(blockChain)
                blockChain = []}, 2000)    
        }
    })
})

// listening on PORT 8000
app.listen(8000, () => {
    console.log('Listening on port 8000!')
})
