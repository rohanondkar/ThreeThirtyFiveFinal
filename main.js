const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { request } = require("express");
const path = require("path");
const axios = require("axios").default;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/templates'));

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

let portNumber = process.env.PORT;

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://rondkar:<password>@pokepoke335.ibg5lwu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 }); 

process.stdin.setEncoding("utf8");

app.get('/', function(request, response) {
    response.render("home", {});
})

app.get("/viewFavorite", function(request, response) {
    response.render("viewFavorite", {errorMsg: ""});
})

app.post("/viewFavorite", function(request, response) {
    let email = request.body.email;

    let filter = {Email: email};

    (async () => {
        try {
            await client.connect();
            const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter);
            await client.close();

            let url = `https://pokeapi.co/api/v2/pokemon/${result.Pokemon}/`;

            axios.get(url)
            .then(res => {result["Image"] = res.data.sprites.front_default; response.render("viewFavoritePost", result)})
            .catch(error => response.render("viewFavorite", {errorMsg: `${pokemon} is an invalid pokemon.`}))
        }
        catch (e) {
            response.render("viewFavorite", {errorMsg: `${email} is an invalid email... Try again :)`})
        }
    })();
})

app.get("/setFavorite", function(request, response) {
    response.render("setFavorite", {errorMsg: ""})
})

app.post("/setFavorite", function(request, response) {
    let name = String(request.body.name);
    let email = String(request.body.email);
    let pokemon = String(request.body.pokemon).toLowerCase();
    let why = String(request.body.why);

    let newEntry = {Name: name, Email: email, Pokemon: pokemon, Why: why};
    let url = `https://pokeapi.co/api/v2/pokemon/${pokemon}/`;

    axios.get(url)
        .then(result => process(result))
        .catch(error => response.render("setFavorite", {errorMsg: `${pokemon} is an invalid pokemon.`}))

    async function process(res) {
        let imgURL = res.data.sprites.front_default;

        try {
            await client.connect();
            await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newEntry);
        
            await client.close();

            newEntry["Image"] = imgURL;

            response.render("setFavoritePost", newEntry);
        }
        catch (e) {
            console.log(e)
        }
    }
})



app.listen(portNumber, () => {
    console.log(`Web server started and running at http://localhost:${portNumber}`);

    process.stdout.write("Stop to shutdown the server: ")

    process.stdin.on('readable', function() {
        let dataInput = process.stdin.read();
        if (dataInput !== null) {
            let command = dataInput.trim();
            if (command === "stop") {
                process.stdout.write("Shutting down the server\n");
                (async () => {
                await client.close();
                });
                process.exit(0);
            }
            else {
                process.stdout.write(`Invalid command: ${command}\n`);
            }

            process.stdout.write("Stop to shutdown the server: ")
            process.stdin.resume();
        }
    });
});