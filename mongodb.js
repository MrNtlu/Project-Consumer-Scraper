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

const genreSchema = mongoose.Schema({
    name: String,
    tmdbID: Number,
});

const streamingPlatformSchema = mongoose.Schema({
    logo: String,
    name: String,
});

const streamingSchema = mongoose.Schema({
    countryCode: String,
    streamingPlatforms: [streamingPlatformSchema],
    buyOptions: [streamingPlatformSchema],
    rentOptions: [streamingPlatformSchema],
});

const productionAndCompanySchema = mongoose.Schema({
    logo: { type: String, required: false },
    name: String,
    originCountry: String,
});

const MovieModel = mongoose.model(
    "movies",
    mongoose.Schema({
        titleOriginal: String,
        titleEn: String,
        description: String,
        imageURL: String,
        smallImageURL: String,
        status: String,
        length: Number,
        imdbID: String,
        tmdbID: String,
        tmdbPopularity: Number,
        tmdbVote: Number,
        tmdbVoteCount: Number,
        productionCompanies: [productionAndCompanySchema],
        releaseDate: String,
        genres: genreSchema,
        streaming: [streamingSchema],
        createdAt: Date,
    }, {
        versionKey: false
    }
));

const TVSeriesModel = mongoose.model(
    "tv-series",
    mongoose.Schema({
        titleOriginal: String,
        titleEn: String,
        description: String,
        imageURL: String,
        smallImageURL: String,
        status: String,
        tmdbID: Number,
        tmdbPopularity: Number,
        tmdbVote: Number,
        tmdbVoteCount: Number,
        totalSeasons: Number,
        totalEpisodes: Number,
        productionCompanies: [productionAndCompanySchema],
        firstAirDate: String,
        genres: genreSchema,
        streaming: [streamingSchema],
        networks: [productionAndCompanySchema],
        seasons: [
            mongoose.Schema({
                airDate: String,
                episodeCount: Number,
                name: String,
                description: String,
                seasonNum: Number,
                imageURL: String,
            })
        ],
        createdAt: Date,
    }, {
        versionKey: false
    }
));

module.exports.MovieModel = MovieModel;
module.exports.TVSeriesModel = TVSeriesModel;
module.exports.ConnectToMongoDB = connectToMongoDB;
module.exports.DisconnectFromMongoDB = disconnectFromMongoDB;