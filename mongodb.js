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
    tmdb_id: Number,
},{ _id : false });

const streamingPlatformSchema = mongoose.Schema({
    logo: String,
    name: String,
},{ _id : false });

const streamingSchema = mongoose.Schema({
    country_code: String,
    streaming_platforms: [streamingPlatformSchema],
    buy_options: [streamingPlatformSchema],
    rent_options: [streamingPlatformSchema],
},{ _id : false });

const productionAndCompanySchema = mongoose.Schema({
    logo: { type: String, required: false },
    name: String,
    origin_country: String,
},{ _id : false });

const MovieModel = mongoose.model(
    "movies",
    mongoose.Schema({
        title_original: String,
        title_en: String,
        description: String,
        image_url: String,
        small_image_url: String,
        status: String,
        length: Number,
        imdb_id: String,
        tmdb_id: String,
        tmdb_popularity: Number,
        tmdb_vote: Number,
        tmdb_vote_count: Number,
        production_companies: [productionAndCompanySchema],
        release_date: String,
        genres: [genreSchema],
        streaming: [streamingSchema],
        created_at: Date,
    }, {
        versionKey: false
    }
));

const TVSeriesModel = mongoose.model(
    "tv-series",
    mongoose.Schema({
        title_original: String,
        title_en: String,
        description: String,
        image_url: String,
        small_image_url: String,
        status: String,
        tmdb_id: Number,
        tmdb_popularity: Number,
        tmdb_vote: Number,
        tmdb_vote_count: Number,
        total_seasons: Number,
        total_episodes: Number,
        production_companies: [productionAndCompanySchema],
        first_air_date: String,
        genres: [genreSchema],
        streaming: [streamingSchema],
        networks: [productionAndCompanySchema],
        seasons: [
            mongoose.Schema({
                air_date: String,
                episode_count: Number,
                name: String,
                description: String,
                season_num: Number,
                image_url: String,
            },{ _id : false })
        ],
        created_at: Date,
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
    mal_id: Number,
},{ _id : false })

const animeRelationSchema = mongoose.Schema({
    mal_id: Number,
    type: String,
    name: String,
    redirect_url: String,
},{ _id : false })

const AnimeModel = mongoose.model(
    "animes",
    mongoose.Schema({
        title_original: String,
        title_en: String,
        title_jp: String,
        description: String,
        image_url: String,
        small_image_url: String,
        mal_id: Number,
        mal_score: Number,
        mal_scored_by: Number,
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
        is_airing: Boolean,
        streaming: [animeNameURLSchema],
        aired: mongoose.Schema({
            from: String,
            to: String,
            from_day: Number,
            from_month: Number,
            from_year: Number,
            to_day: Number,
            to_month: Number,
            to_year: Number,
        }),
        age_rating: String,
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
        created_at: Date,
    }, {
        versionKey: false
    }
));

const GameModel = mongoose.model(
    "games",
    mongoose.Schema({
        title: String,
        title_original: String,
        description: String,
        tba: Boolean,
        rawg_id: Number,
        rawg_rating: Number,
        rawg_rating_count: Number,
        metacritic_score: Number,
        metacritic_score_by_platform: [
            mongoose.Schema({
                score: Number,
                platform: String,
            },{ _id : false })
        ],
        release_date: String,
        background_image: String,
        subreddit: { type: String, required: false },
        age_rating: String,
        related_games: [
            mongoose.Schema({
                name: String,
                release_date: String,
                rawg_id: Number,
            },{ _id : false })
        ],
        genres: [
            mongoose.Schema({
                rawg_id: String,
                name: String,
            },{ _id : false })
        ],
        tags: [String],
        platforms: [String],
        developers: [String],
        publishers: [String],
        stores: [
            mongoose.Schema({
                store_id: Number,
                url: String,
            },{ _id : false })
        ],
        created_at: Date,
    }, {
        versionKey: false
    }
));

module.exports.MovieModel = MovieModel;
module.exports.TVSeriesModel = TVSeriesModel;
module.exports.AnimeModel = AnimeModel;
module.exports.GameModel = GameModel;
module.exports.ConnectToMongoDB = connectToMongoDB;
module.exports.DisconnectFromMongoDB = disconnectFromMongoDB;