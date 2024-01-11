# tether-auction
# The Tether Challenge

Thanks for the opportunity to solve the Challenge

This project is to create a simplified P2P auction solution based on Hyperswarm RPC and Hypercores.

Dependencies:

    const RPC = require('@hyperswarm/rpc')
    const DHT = require('hyperdht')
    const Hypercore = require('hypercore')
    const Hyperbee = require('hyperbee')
    const crypto = require('crypto')

Source files:
    src/client.js => It contains the source code for the RPC Client which will receive the commands to open/close auction and bid for the product
                    => also contains source code for the RPC Server to handle the notifications received from other clients i.e newaction and closeaction
    package.json
    readme.txt

Setting up the project:
    npm install

Running the project:
    npm start <PORT> => To start the client#1 in the given PORT, run the project in multiple terminal with different PORT to support multiple clients.

Executing the scenarios:
    To sell the new product: [New auction will be nofified to all the clients running]
        sell car 1000 => To sell the new product from the client, Syntax is: sell <productname> <price>
        sell phone 200
        sell house 50000

    To close the auction: [Closed auction will be nofified to all the clients with its winning bid]
        close car
        close phone
        close house

    To bid the product:
        bid car 1050 => To bid the product from the client, Syntax is: bid <productname> <newprice>
        bid phone 210
        bid house 40000 => Will return error as bidding to lesser price is not allowed, current price is 50000
        bid laptop 5000 => Will return error as the product laptop doesn't exist or its auction is closed

Actions to do:
    - I faced challenges to create multiple nodes as I am very new to hyperdht and hyperswarm and couldn't complete it in limited time.
        I would love to explore more into hyperdht and hyperswarm to understand how multiple peers can communicate to each other and solve the problem.
        Currently only server and client within the single node is communicating between each other - which is not valid.
    - Support multiple products in the same name by introducting unique product id for each product.
    - Prevent client bidding for a product which is created by itself
        - I would like to explore hyperbee or another suitable database to store more information of the product.
    - Allow only the client created the product can close the auction.
        - I would like to explore hyperbee or another suitable database to store more information of the product. So this issue can be fixed.
    - Add unit test
        - To test all the scenarios and combinations

Thanks again for the opportunity provided, It was incredibly good learning.

Regards
Kanagavel


