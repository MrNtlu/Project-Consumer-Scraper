const { GetUpcomingMovies } = require("../apis/tmdb");
const { MovieModel } = require("../mongodb");
const { InsertMovies } = require("../scrapers/tmdb");

async function fetchUpcomingMovies() {
    const upcomingMovieIDList = [];

    console.log("Upcoming Movie Fetch Started");
    const upcomingMovieList = await GetUpcomingMovies();

    for (let index = 0; index < upcomingMovieList.length; index++) {
        const element = upcomingMovieList[index];

        if (movieList.find(movie => movie.id == element.toString()) == undefined) {
            const movieModel = await GetMovies(upcomingMovieList[index]);

            if (movieModel != null) {
                upcomingMovieIDList.push(movieModel);
            }
        }
    }
    console.log("Upcoming Movie Fetch Ended");

    await InsertMovies(upcomingMovieIDList, true);
}

async function getUpcomingMoviesFromDB() {
    console.log("Upcoming Movie DB Started");

    try {
        const movies = await MovieModel.find({
            status: {
                $ne: "Released",
            },
        }).select('tmdb_id');

        const movieIDList = movies.map(movie => movie.tmdb_id);

        console.log("Upcoming Movie DB Ended");

        await InsertMovies(movieIDList, false);
    } catch (error) {
        console.log("Get error", error);
    }
}

module.exports.GetUpcomingMoviesFromDB = getUpcomingMoviesFromDB;
module.exports.FetchUpcomingMovies = fetchUpcomingMovies;