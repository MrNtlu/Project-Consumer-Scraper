const { StartGameRequests, GetGameDetails, InsertGame, GetMissingScreenshotsGamesFromDB } = require("./apis/game");
const { GetTVSeries, GetMovies } = require("./apis/tmdb");
const { TVSeriesModel, MovieModel, ConnectToMongoDB, DisconnectFromMongoDB, GameModel } = require("./mongodb");
const { InsertTVSeries, InsertMovies } = require("./scrapers/tmdb");

async function getMissingTrailerImageMoviesFromDB() {
    const movieList = [];

    try {
        const movies = await MovieModel.find({
            $or: [
                {videos: { $exists: false }},
                {images: { $exists: false }}
            ]
        }).select('tmdb_id');

        const movieIDList = movies.map(movie => movie.tmdb_id);
        console.log(`Missing trailer image movie db Ended. ${movieIDList.length} number of movie details will be fetched.`);

        for (let index = 0; index < movieIDList.length; index++) {
            const movieModel = await GetMovies(movieIDList[index]);

            if (movieModel != null) {
                movieList.push(movieModel);
            }
        }
        console.log("Missing movie trailer image fetch Ended");

        await InsertMovies(movieList, false);
    } catch (error) {
        console.log("Get missing movie trailer image from db error", error);
    }
}

async function getMissingTrailerImageTVSeriesFromDB() {
    const tvList = [];

    try {
        const tvSeries = await TVSeriesModel.find({
            $or: [
                {videos: { $exists: false }},
                {images: { $exists: false }}
            ],
        }).select('tmdb_id');

        const tvIDList = tvSeries.map(tv => tv.tmdb_id);
        console.log(`Missing trailer image tv series db Ended. ${tvIDList.length} number of tv details will be fetched.`);

        for (let index = 0; index < tvIDList.length; index++) {
            const tvModel = await GetTVSeries(tvIDList[index]);

            if (tvModel != null) {
                tvList.push(tvModel);
            }
        }
        console.log("Missing tv trailer image fetch Ended");

        await InsertTVSeries(tvList, false);
    } catch (error) {
        console.log("Get missing tv trailer image from db error", error);
    }
}


async function getRecommendations() {
    try {
        await ConnectToMongoDB();

        await getMissingTrailerImageMoviesFromDB();
        await getMissingTrailerImageTVSeriesFromDB();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Trailer image error occured', err);
        return;
    }
}

async function getScreenshots() {
    try {
        await ConnectToMongoDB();

        await GetMissingScreenshotsGamesFromDB();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Screenshot image error occured', err);
        return;
    }
}

async function getGames() {
    try{
        console.log(Date());
        await ConnectToMongoDB();
        await StartGameRequests();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

getScreenshots();