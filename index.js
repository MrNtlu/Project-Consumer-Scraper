const { StartAnimeRequests } = require("./apis/anime");
const { StartGameRequests } = require("./apis/game");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { StartMovieFileDownload } = require("./scrapers/tmdb");

//TODO When items deleted and readded, their obj id changes,
//so either make obj id somehow same or update existing items with tmdb_id
async function main() {
    try{
        await ConnectToMongoDB();
        await StartGameRequests();
        await StartAnimeRequests();
        await StartMovieFileDownload();
        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

main();