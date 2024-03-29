
const { GetUpcomingAnimeFromDB, FetchUpcomingAnime } = require("./db/anime");
const { GetUpcomingGamesFromDB, FetchUpcomingGames } = require("./db/game");
const { GetUpcomingMoviesFromDB, FetchUpcomingMovies } = require("./db/movie");
const { StartTVFileDownload } = require("./db/tvseries");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");

async function main() {
    try{
        console.log(Date());
        await ConnectToMongoDB();

        await GetUpcomingMoviesFromDB();
        await FetchUpcomingMovies();

        await GetUpcomingAnimeFromDB();
        await FetchUpcomingAnime();

        await GetUpcomingGamesFromDB();
        await FetchUpcomingGames();

        await StartTVFileDownload();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

main();