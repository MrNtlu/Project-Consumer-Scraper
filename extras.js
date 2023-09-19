const { GetTVSeries, GetMovies } = require("./apis/tmdb");
const { TVSeriesModel, MovieModel, ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { InsertTVSeries, InsertMovies } = require("./scrapers/tmdb");

async function getMissingRecommendationMoviesFromDB() {
    const movieList = [];

    try {
        const movies = await MovieModel.find({
            recommendations: {
                $exists: false,
            },
        }).select('tmdb_id');

        const movieIDList = movies.map(movie => movie.tmdb_id);
        console.log(`Missing recommendation movie db Ended. ${movieIDList.length} number of movie details will be fetched.`);

        for (let index = 0; index < movieIDList.length; index++) {
            const movieModel = await GetMovies(movieIDList[index]);

            if (movieModel != null) {
                movieList.push(movieModel);
            }
        }
        console.log("Missing movie recommendation fetch Ended");

        await InsertMovies(movieList, false);
    } catch (error) {
        console.log("Get missing movie recommendation from db error", error);
    }
}

async function getMissingRecommendationTVSeriesFromDB() {
    const tvList = [];

    try {
        const tvSeries = await TVSeriesModel.find({
            recommendations: {
                $exists: false,
            },
        }).select('tmdb_id');

        const tvIDList = tvSeries.map(tv => tv.tmdb_id);
        console.log(`Missing recommendation tv series db Ended. ${tvIDList.length} number of tv details will be fetched.`);

        for (let index = 0; index < tvIDList.length; index++) {
            const tvModel = await GetTVSeries(tvIDList[index]);

            if (tvModel != null) {
                tvList.push(tvModel);
            }
        }
        console.log("Missing tv recommendation fetch Ended");

        await InsertTVSeries(tvList, false);
    } catch (error) {
        console.log("Get missing tv recommendation from db error", error);
    }
}

async function getRecommendations() {
    try {
        await ConnectToMongoDB();

        await getMissingRecommendationMoviesFromDB();
        await getMissingRecommendationTVSeriesFromDB();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Recommendation error occured', err);
        return;
    }
}

getRecommendations();