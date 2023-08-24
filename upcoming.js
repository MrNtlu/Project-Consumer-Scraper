
const { GetUpcomingAnimeFromDB, FetchUpcomingAnime } = require("./db/anime");
const { GetUpcomingGamesFromDB, FetchUpcomingGames } = require("./db/game");
const { GetUpcomingMoviesFromDB, FetchUpcomingMovies } = require("./db/movie");
const { StartTVFileDownload } = require("./db/tvseries");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");

async function main() {
    try{
        await ConnectToMongoDB();

        await GetUpcomingMoviesFromDB();
        await FetchUpcomingMovies();

        await StartTVFileDownload();

        await GetUpcomingAnimeFromDB();
        await FetchUpcomingAnime();

        await GetUpcomingGamesFromDB();
        await FetchUpcomingGames();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

main();