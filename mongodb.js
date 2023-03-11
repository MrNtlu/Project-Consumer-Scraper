const mongoose = require("mongoose");
require('dotenv').config()

async function connectToMongoDB() {
    console.log("Connection to db started...");
    await mongoose.connect(
        process.env.MONGO_URI,
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
},{ _id : false });

const streamingPlatformSchema = mongoose.Schema({
    logo: String,
    name: String,
},{ _id : false });

const streamingSchema = mongoose.Schema({
    countryCode: String,
    streamingPlatforms: [streamingPlatformSchema],
    buyOptions: [streamingPlatformSchema],
    rentOptions: [streamingPlatformSchema],
},{ _id : false });

const productionAndCompanySchema = mongoose.Schema({
    logo: { type: String, required: false },
    name: String,
    originCountry: String,
},{ _id : false });

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
        genres: [genreSchema],
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
        genres: [genreSchema],
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
            },{ _id : false })
        ],
        createdAt: Date,
    }, {
        versionKey: false
    }
));

const animeNameURLSchema = mongoose.Schema({
    name: String,
    url: String,
},{ _id : false })

const animeGenreSchema = mongoose.Schema({
    name: String,
    url: String,
    malID: Number,
},{ _id : false })

const animeRelationSchema = mongoose.Schema({
    malID: Number,
    type: String,
    name: String,
    redirectURL: String,
},{ _id : false })

const AnimeModel = mongoose.model(
    "animes",
    mongoose.Schema({
        titleOriginal: String,
        titleEn: String,
        titleJP: String,
        description: String,
        imageURL: String,
        smallImageURL: String,
        malID: Number,
        malScore: Number,
        malScoredBy: Number,
        trailer: {
            type: String,
            required: false,
            default: null
        },
        type: String,
        source: String,
        episodes: Number,
        season: {
            type: String,
            required: false,
        },
        year: {
            type: Number,
            required: false,
        },
        status: String,
        isCurrentlyAiring: Boolean,
        streaming: [animeNameURLSchema],
        aired: mongoose.Schema({
            from: String,
            to: String,
            fromDay: Number,
            fromMonth: Number,
            fromYear: Number,
            toDay: Number,
            toMonth: Number,
            toYear: Number,
        }),
        ageRating: String,
        producers: [animeNameURLSchema],
        studios: [animeNameURLSchema],
        genres: [animeGenreSchema],
        themes: [animeGenreSchema],
        demographics: [animeGenreSchema],
        relations: [
            mongoose.Schema({
                relation: String,
                source: [animeRelationSchema],
            },{ _id : false })
        ],
    })
)

const GameModel = mongoose.model(
    "games",
    mongoose.Schema({
        title: String,
        titleOriginal: String,
        description: String,
        tba: Boolean,
        rawgID: Number,
        rawgRating: Number,
        rawgRatingCount: Number,
        metacriticScore: Number,
        metacriticScoreByPlatform: [
            mongoose.Schema({
                score: Number,
                platform: String,
            },{ _id : false })
        ],
        releaseDate: String,
        backgroundImage: String,
        subReddit: { type: String, required: false },
        ageRating: String,
        relatedGames: [
            mongoose.Schema({
                name: String,
                releaseDate: String,
                rawgID: Number,
            },{ _id : false })
        ],
        genres: [
            mongoose.Schema({
                rawgID: String,
                name: String,
            },{ _id : false })
        ],
        tags: [String],
        platforms: [String],
        developers: [String],
        publishers: [String],
        stores: [
            mongoose.Schema({
                storeID: Number,
                url: String,
            },{ _id : false })
        ],
    })
)

module.exports.MovieModel = MovieModel;
module.exports.TVSeriesModel = TVSeriesModel;
module.exports.AnimeModel = AnimeModel;
module.exports.GameModel = GameModel;
module.exports.ConnectToMongoDB = connectToMongoDB;
module.exports.DisconnectFromMongoDB = disconnectFromMongoDB;