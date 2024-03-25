const mongoose = require("mongoose");
require('dotenv').config()

async function connectToMongoDB() {
    console.log("\nConnection to db started...");
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

const actorSchema = mongoose.Schema({
    name: String,
    image: String,
    character: String,
    tmdb_id: String,
},{ _id : false });

const recommendationSchema = mongoose.Schema({
    tmdb_id: String,
    title_en: String,
    title_original: String,
    image_url: String,
    description: String,
    release_date: String,
},{ _id : false });

const videoSchema = mongoose.Schema({
    name: String,
    key: String,
    type: String
},{ _id : false })

const MovieModel = mongoose.model(
    "movies",
    mongoose.Schema({
        title_original: String,
        title_en: String,
        description: String,
        image_url: String,
        thumb_image_url: String,
        backdrop: String,
        status: String,
        length: Number,
        imdb_id: String,
        tmdb_id: String,
        tmdb_popularity: Number,
        tmdb_vote: Number,
        tmdb_vote_count: Number,
        production_companies: [productionAndCompanySchema],
        release_date: String,
        genres: [String],
        images: [String],
        videos: [videoSchema],
        recommendations: [recommendationSchema],
        streaming: [streamingSchema],
        actors: [actorSchema],
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
        thumb_image_url: String,
        backdrop: String,
        status: String,
        tmdb_id: String,
        tmdb_popularity: Number,
        tmdb_vote: Number,
        tmdb_vote_count: Number,
        total_seasons: Number,
        total_episodes: Number,
        production_companies: [productionAndCompanySchema],
        first_air_date: String,
        genres: [String],
        images: [String],
        videos: [videoSchema],
        recommendations: [recommendationSchema],
        streaming: [streamingSchema],
        networks: [productionAndCompanySchema],
        seasons: [
            mongoose.Schema({
                air_date: String,
                episode_count: Number,
                name: String,
                season_num: Number,
                image_url: String,
            },{ _id : false })
        ],
        actors: [actorSchema],
        created_at: Date,
    }, {
        versionKey: false
    }
));

const PersonModel = mongoose.model(
    "people",
    mongoose.Schema({
        name: String,
        biography: String,
        birthday: String,
        deathday: String,
        tmdb_id: String,
        tmdb_popularity: Number,
        place_of_birth: String,
        image_url: String,
        thumb_image_url: String,
        images: [String],
        created_at: Date,
    }, {
        versionKey: false
    }
));

const animeNameURLSchema = mongoose.Schema({
    name: String,
    url: String,
}, { _id : false })

const animeGenreSchema = mongoose.Schema({
    name: String,
    url: String,
}, { _id : false })

const animeRelationSchema = mongoose.Schema({
    mal_id: Number,
    type: String,
    name: String,
    redirect_url: String,
}, { _id : false })

const animeCharacterSchema = mongoose.Schema({
    mal_id: Number,
    name: String,
    image: String,
    role: String,
}, { _id: false })

const animeRecommendationSchema = mongoose.Schema({
    mal_id: Number,
    title: String,
    image_url: String,
}, { _id: false })

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
        mal_members: Number,
        mal_favorites: Number,
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
        recommendations: [animeRecommendationSchema],
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
        characters: [animeCharacterSchema],
        created_at: Date,
    }, {
        versionKey: false
    }
));

const MangaModel = mongoose.model(
    "mangas",
    mongoose.Schema({
        title_original: String,
        title_en: String,
        title_jp: String,
        description: String,
        description_extra: String,
        image_url: String,
        small_image_url: String,
        mal_id: Number,
        mal_score: Number,
        mal_scored_by: Number,
        mal_members: Number,
        mal_favorites: Number,
        type: String,
        chapters: Number,
        volumes: Number,
        status: String,
        serializations: [animeNameURLSchema],
        is_publishing: Boolean,
        published: mongoose.Schema({
            from: String,
            to: String,
            from_day: Number,
            from_month: Number,
            from_year: Number,
            to_day: Number,
            to_month: Number,
            to_year: Number,
        }),
        recommendations: [animeRecommendationSchema],
        genres: [animeGenreSchema],
        themes: [animeGenreSchema],
        demographics: [animeGenreSchema],
        relations: [
            mongoose.Schema({
                relation: String,
                source: [animeRelationSchema],
            },{ _id : false })
        ],
        characters: [animeCharacterSchema],
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
        image_url: String,
        age_rating: String,
        related_games: [
            mongoose.Schema({
                name: String,
                release_date: String,
                rawg_id: Number,
            },{ _id : false })
        ],
        genres: [String],
        screenshots: [String],
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

const ComicModel = mongoose.model(
    "comic-books",
    mongoose.Schema({
        title_en: String,
        image_url: String,
        thumb_image_url: String,
        count_of_issues: Number,
        description: String,
        comic_id: Number,
        start_year: String,
        publisher: mongoose.Schema({
            comic_id: Number,
            name: String,
        },{ _id : false }),
        characters: [
            mongoose.Schema({
                comic_id: Number,
                name: String,
                count: String,
            },{ _id : false })
        ],
        created_at: Date,
    }, {
        versionKey: false
    }
));

module.exports.MovieModel = MovieModel;
module.exports.TVSeriesModel = TVSeriesModel;
module.exports.PersonModel = PersonModel;
module.exports.AnimeModel = AnimeModel;
module.exports.MangaModel = MangaModel;
module.exports.GameModel = GameModel;
module.exports.ComicModel = ComicModel;
module.exports.ConnectToMongoDB = connectToMongoDB;
module.exports.DisconnectFromMongoDB = disconnectFromMongoDB;