const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const main = async () => {

    console.log("Client#" + process.argv[2] + " running...")

    // hyperbee db
    const hcore = new Hypercore('./db/rpc-client')
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()

    // resolved distributed hash table seed for key pair
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
        // not found, generate and store in db
        dhtSeed = crypto.randomBytes(32)
        await hbee.put('dht-seed', dhtSeed)
    }

    // start distributed hash table, it is used for rpc service discovery
    const dht = new DHT({
        port: process.argv[2], // PORT
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
    })
    await dht.ready()

    // resolve rpc server seed for key pair
    let rpcSeed = (await hbee.get('rpc-seed'))?.value
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32)
        await hbee.put('rpc-seed', rpcSeed)
    }

    // setup rpc server
    const rpc = new RPC({ seed: rpcSeed, dht })
    const rpcServer = rpc.createServer()
    await rpcServer.listen()
    console.log("Client#" + process.argv[2] + ' rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))

    // Handler for New auction from other clients
    rpcServer.respond('openauction', openAuctionHandler)

    // Handler for close auction from other clients
    rpcServer.respond('closeauction', closeAuctionHandler)

    const rpcClient = new RPC({ dht })

    // public key of rpc server, used instead of address, the address is discovered via dht
    const serverPubKey = Buffer.from('dc554896585e6abf3b40bc0c796dead69d45cab0304a807fdd196cb2a25f6537', 'hex')

    // Read command line and do the action accordingly
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.on("line", (input) => {
        if (true === input.startsWith("sell")) {
            const productDetailsArray = input.split(" ")
            RPCCLIENT_openAuction(productDetailsArray[1], productDetailsArray[2], rpcClient, serverPubKey, hbee)
        }
        else if (true === input.startsWith("close")) {
            const productDetailsArray = input.split(" ")
            RPCCLIENT_closeAuction(productDetailsArray[1], rpcClient, serverPubKey, hbee)
        }
        else if (true === input.startsWith("bid")) {
            console.log("Bidding...")
            const productDetailsArray = input.split(" ")
            RPCCLIENT_bidProduct(productDetailsArray[1], productDetailsArray[2], hbee)
        }
        else {
            console.log("Invalid command")
        }
    })

    // closing connection
    //   await rpc.destroy()
    //   await dht.destroy()
}

main().catch(console.error)


// RPCCLIENT_openAuction
// 1. Store the new product details in the DB
// 2. Notify other clients about the new auction opened
const RPCCLIENT_openAuction = async (productname, price, rpc, serverPubKey, db) => {

    // Store the new product details (name, price, status:OPEN) in the DB
    await db.put(productname, price)

    // console.log(await db.get(productname))

    // payload for sending information about the new auction
    const payload = { name: productname, price: price }
    const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')

    // sending other clients information about the new auction opened
    const respRaw = await rpc.request(serverPubKey, 'openauction', payloadRaw)
    const resp = JSON.parse(respRaw.toString('utf-8'))
    // console.log(resp)
}


// RPCCLIENT_closeAuction
// 1. Mark the product state as CLOSED in the DB
// 2. Notify other clients about the new auction closed with it's highest bidder if any
const RPCCLIENT_closeAuction = async (productname, rpc, serverPubKey, db) => {

    // Retrieve the product details from the DB
    await db.get(productname)
    const productEntry = await db.get(productname)

    console.log("Winning price is: $" + parseInt(productEntry.value));

    // Delete the product from DB as auction is closed
    await db.del(productname)

    // payload for sending information about the closed auction
    const payload = { name: productname, price: parseInt(productEntry.value) }
    const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')

    // sending other clients information about the auction closed
    const respRaw = await rpc.request(serverPubKey, 'closeauction', payloadRaw)
    const resp = JSON.parse(respRaw.toString('utf-8'))
}

// RPCCLIENT_bidProductAuction
// 1. Retrieve the product details from the DB
// 2. Store the new bid price in the DB
const RPCCLIENT_bidProduct = async (productname, newPrice, db) => {

    // Retrieve the product details from the DB
    await db.get(productname)
    const productEntry = await db.get(productname)

    if (productEntry) {
        console.log("Current price is: $" + parseInt(productEntry.value));
        // if Product exists and newPrice is higher than the current then update the DB for new bid
        if (productEntry.value < newPrice) {
            await db.put(productname, newPrice)
            const newEntry = await db.get(productname)

            console.log("Bidding success, new price is: $" + parseInt(newEntry.value));
        }
        else {
            console.log("Bidding for less price is not allowed, price is: $" + parseInt(productEntry.value));
        }
    }
    else {
        console.log("Bidding failed, product doesn't exist...")
    }
}

// openAuctionHandler
// 1. Display the new product details
const openAuctionHandler = async (reqRaw) => {
    // reqRaw is Buffer, we need to parse it
    const req = JSON.parse(reqRaw.toString('utf-8'))

    console.log("There is a new auction: " + req.name + ' for price $' + req.price)

    const resp = { status: "received" }

    // we also need to return buffer response
    const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
    return respRaw
}

// closeAuctionHandler
// 1. Retrieve the product details from the DB
// 2. Print the product details and its highest bidder
const closeAuctionHandler = async (reqRaw) => {
    // reqRaw is Buffer, we need to parse it
    const req = JSON.parse(reqRaw.toString('utf-8'))

    console.log("Auction closed: " + req.name)

    // Log the product details from the DB

    const resp = { status: "received" }

    // we also need to return buffer response
    const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
    return respRaw
}