const mongoose = require("mongoose");
require('dotenv').config()

async function connectToMongoDB() {
    console.log("Connection to db started...");
    await mongoose.connect(
        process.env.MONGO_LOCAL_URI,
        {
            useNewUrlParser: true
        }
    ).then(
        () => console.log("Connection established.")
    );
}

function disconnectFromMongoDB() {
    mongoose.disconnect();
    console.log("Disconnected from db.");
}

module.exports.ConnectToMongoDB = connectToMongoDB;
module.exports.DisconnectFromMongoDB = disconnectFromMongoDB;