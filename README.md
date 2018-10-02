# Private-Blockchain-Notary-service
This project is built on private blockchain that is used as a star notary service using Express.js RESTful Web API.

## Tech/Framework used
* [Node.js](https://nodejs.org/en/) - Backend services.
* [Express.js](https://expressjs.com/) - Web application framework.
* [crypto-js](https://www.npmjs.com/package/crypto-js) - SHA256 Algorithm.
* [Postman](https://www.getpostman.com/) - API development environment.
* [levelDb](http://leveldb.org/) - Database to persist data.
* [bitcoinjs-lib](https://www.npmjs.com/package/bitcoinjs-lib) - A javascript Bitcoin library for node.js and browsers.
* [bitcoinjs-message](https://www.npmjs.com/package/bitcoinjs-message) - To sign and verify messages.

## Installation
Install the required dependencies using [npm](https://www.npmjs.com/) package manager.
```
npm init --yes
npm install express --save
npm install crypto-js --save
npm install level --save
npm install bitcoinjs-lib --save
npm install bitcoinjs-message --save
```
## How to use?
* Run the code using node.js.
`node index.js`
- `http://localhost:8000/requestValidation` - allows users to submit their request using their wallet address.
- `http://localhost:8000/message-signature/validate` - allows users to validate their signature after submitting a request.
- `http://localhost:8000/block` - allows user to register a star.
- `http://localhost:8000/block/:height` - returns the block corresponding to the height.
- `http://localhost:8000/stars/address:addr` - returns all the blocks associated with the address.
- `http://localhost:8000/stars/hash:h` - returns the block corresponding to the hash.
- `http://localhost:8000/chain` - To get the recent blocks in the chain.
* Using postman, make the GET and POST http requests.

## Endpoint documentation
[RESTful-Web-API](https://documenter.getpostman.com/view/5369196/RWgm2LP5) - Refer for endpoint documentation.

## LICENSE
MIT @ [Manolingam](./LICENSE)
