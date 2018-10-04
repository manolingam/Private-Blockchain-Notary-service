// adding necessary packages
const express = require('express')
const app = express()
const SHA256 = require('crypto-js/sha256');
const level = require('level');

const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')

// used to convert hex to ASCII
const hex2ascii = require('hex2ascii')

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

// response is used to facilitate request validation
var response;

// temporary variables to check window timeout
var check = []
var messageSignature
var duplicate = false
var i = 0
var timer = []

// holder stores address and it's corresponding data
var holder = []
// verifiedHolder stores the verified address and it's corresponding data
var verifiedHolder = []
// a temp variable
var reqBlock

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

    for(var j=0; j<holder.length; j++){
        if(holder[j].address == req.body.address){// checks a duplicate request    
            duplicate = true
            console.log(duplicate)
            break
        }
    }

    if(!duplicate){

        response = {
            "address":addressInput.address,
            "requestTimeStamp":new Date().getTime().toString().slice(0,-3),
            "message":`${addressInput.address}:${new Date().getTime().toString().slice(0,-3)}:starRegistery`,
            "validationWindow":"300"
        }

        holder.push(response)
        duplicate = false

        check[i] = false
        timer[i] = setTimeout(() => { if(check[i] == false){ // check if address already verified
                                        holder.splice(i,1)} }, 300000)   
        i = i+1     
        
        res.send(response)
        return

    }else if(duplicate){

        var repeatResponse = {
            "address":holder[j].address,
            "requestTimeStamp":holder[j].requestTimeStamp,
            "message":holder[j].message,
            "validationWindow":300 - (new Date().getTime().toString().slice(0,-3)-holder[j].requestTimeStamp)
        }
        duplicate=false
        res.send(repeatResponse)
        return
    }     
})

// http POST request for signature validation
app.post('/message-signature/validate', (req,res) => {
    const payload = {
        address:req.body.address,
        signature:req.body.signature
    }

    if(holder.length == 0){// check whether request sent
        res.send("Send a request first!")
        return
    }
    if(!req.body.address || !req.body.signature){// check if there is a input
        res.send("Please input both address & signature to verify!")
        return
    }

    for(var z = 0; z<holder.length; z++){
        if(req.body.address == holder[z].address){// check whether time expired
            var status = bitcoinMessage.verify(holder[z].message,payload.address,payload.signature)// verification process
            if(status){
                messageSignature = 'valid'
                verifiedHolder.push(holder[z])
            }else{
                messageSignature = 'Invalid'
            }

            var verify = {
                "registerStar": status,
                "status": {
                            "address": holder[z].address,
                            "requestTimeStamp": holder[z].requestTimeStamp,
                            "message": holder[z].message,
                            "validationWindow": 300 - (new Date().getTime().toString().slice(0,-3) - holder[z].requestTimeStamp),
                            "messageSignature": messageSignature
                            }
                        }
            
            holder.splice(z,1) //remove address from mempool
            res.send(verify)
            return
        }else if(z == holder.length-1 && req.body.address!=holder[z].address){
            console.log(holder)
            res.send("Address not registered/time is expired! Restart the process.")
            return 

        }
    }
})

// http POST request to register a star
app.post('/block', (req, res) => {
    
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
    }else if(starData.star.story.includes('!') || starData.star.story.includes('@') || starData.star.story.includes('#') || starData.star.story.includes('$')){
        res.send("Do not include special characters!")
        return
    }else if(req.body.star.story.length > 500){
        res.send("Input limit exceeded for Story! Input less than 250 words/500 characters.")
        return
    }else if(verifiedHolder.length == 0){// check if there are verified addresses in the mempool
        res.send("Signature not yet verified!")
        return
    }

    for(var y=0; y<verifiedHolder.length; y++){

        if(req.body.address == verifiedHolder[y].address){ // check if address is in verified mempool
            var storyEncode = new Buffer(req.body.star.story).toString('hex')
            var starRegister = {
                address:starData.address,
                star:{
                    dec:starData.star.dec,
                    ra:starData.star.ra,
                    story:storyEncode,
                    }
                }
                // get key from db2 
            db2.get('key', function(err, value){
                // check if there is a genesis block
                if(!value){
                    new Block(starRegister)
                    setTimeout(() => {new Block(starRegister)}, 1000)
                                
                    setTimeout(() => {
                        res.send(chain[chain.length-1])
                        return}, 2000)
                        
                    check[y] = true
                    verifiedHolder.splice(y,1) // remove address from verified mempool
                    }else{
                        // adding new block if there is a genesis block already present in the chain
                        new Block(starRegister)
                        // simple timeout to manage asynchronous activity
                        setTimeout(() => {
                            res.send(chain[chain.length-1])
                            return}, 1000)
                            
                        check[y] = true
                        verifiedHolder.splice(y,1) // remove address from verified mempool
                    }
            })
            break
        }else if(y == verifiedHolder.length-1 && req.body.address != verifiedHolder[y].address){
            res.send("Either there is no request sent/submitted signature is invalid!")
            return
        }
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
                if(req.params.height == 0){
                    res.send(value) // check if height is the height of genesis block
                    return
                }else{
                    reqBlock = {
                        "hash": value.hash,
                        "height": value.height,
                        "body": {
                            "address": value.body.address,
                            "star": {
                                "dec": value.body.star.dec,
                                "ra": value.body.star.ra,
                                "story": value.body.star.story,
                                "storyDecoded":hex2ascii(value.body.star.story)
                            }
                        },
                        "time": value.time,
                        "previousBlockHash": value.previousBlockHash
                    }
                    res.send(reqBlock)
                }
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
                        if(value.body['address'] == str.substring(1)){// substring(1) removes the : from string 
                            reqBlock = {
                                "hash": value.hash,
                                "height": value.height,
                                "body": {
                                    "address": value.body.address,
                                    "star": {
                                        "dec": value.body.star.dec,
                                        "ra": value.body.star.ra,
                                        "story": value.body.star.story,
                                        "storyDecoded":hex2ascii(value.body.star.story)// decoded back to ASCII
                                    }
                                },
                                "time": value.time,
                                "previousBlockHash": value.previousBlockHash
                            }
                            Blockchain(reqBlock) 
                        }
                    })
                })
            setTimeout(() => {
                if(blockChain.length!=0){
                    res.send(blockChain)
                    blockChain = []
                    return
                }else{
                    res.send("No data associated with that address!")
                }}, 2000)    
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
                       
                        if(value.hash == str.substring(1)){ // check if hash matches

                            reqBlock = {
                                "hash": value.hash,
                                "height": value.height,
                                "body": {
                                    "address": value.body.address,
                                    "star": {
                                        "dec": value.body.star.dec,
                                        "ra": value.body.star.ra,
                                        "story": value.body.star.story,
                                        "storyDecoded":hex2ascii(value.body.star.story)// decoded back to ASCII
                                    }
                                },
                                "time": value.time,
                                "previousBlockHash": value.previousBlockHash
                            }

                            Blockchain(reqBlock)
                        }
                    })
                })

            setTimeout(() => {
                if(blockChain.length != 0){
                    res.send(blockChain)
                    blockChain = []
                    return
                }else{
                    res.send("No data associated with that hash!")
                    return
                }}, 2000)    
        }
    })
})

// listening on PORT 8000
app.listen(8000, () => {
    console.log('Listening on port 8000!')
})