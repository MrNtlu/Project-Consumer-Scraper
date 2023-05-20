const { StartAnimeRequests } = require("./apis/anime");
const { StartGameRequests } = require("./apis/game");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { StartMovieFileDownload } = require("./scrapers/tmdb");

async function main() {
    try{
        await ConnectToMongoDB();
        await StartGameRequests();
        await StartMovieFileDownload();
        await StartAnimeRequests();
        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

main();