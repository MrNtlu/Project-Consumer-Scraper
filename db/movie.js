const { GetUpcomingMovies, GetMovies } = require("../apis/tmdb");
const { MovieModel } = require("../mongodb");
const { InsertMovies } = require("../scrapers/tmdb");

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 7));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

async function fetchUpcomingMovies() {
    const upcomingMovieList = [];

    console.log("Upcoming Movie Fetch Started");

    const upcomingMovieIDList = await GetUpcomingMovies();

    for (let index = 0; index < upcomingMovieIDList.length; index++) {
        const movieModel = await GetMovies(upcomingMovieIDList[index]);

        if (movieModel != null) {
            upcomingMovieList.push(movieModel);
        }
    }
    console.log("Upcoming Movie Fetch Ended");

    await InsertMovies(upcomingMovieList, true);
}

async function getUpcomingMoviesFromDB() {
    const upcomingMovieList = [];

    console.log("Upcoming Movie DB Started");

    try {
        const movies = await MovieModel.find({
            $or: [
                {
                    status: {
                        $ne: "Released",
                    },
                },
                {
                    release_date: {
                        $gt: `${year}-${month}-${day}`,
                    },
                },
            ],
        }).select('tmdb_id');

        const movieIDList = movies.map(movie => movie.tmdb_id);
        console.log(`Upcoming Movie DB Ended. ${movieIDList.length} number of movie details will be fetched.`);

        for (let index = 0; index < movieIDList.length; index++) {
            const movieModel = await GetMovies(movieIDList[index]);

            if (movieModel != null) {
                upcomingMovieList.push(movieModel);
            }
        }
        console.log("Upcoming Movie Fetch Ended");

        await InsertMovies(upcomingMovieList, false);
    } catch (error) {
        console.log("Get upcoming movie from db error", error);
    }
}

module.exports.GetUpcomingMoviesFromDB = getUpcomingMoviesFromDB;
module.exports.FetchUpcomingMovies = fetchUpcomingMovies;