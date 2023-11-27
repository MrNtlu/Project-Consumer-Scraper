const { StartAnimeRequests } = require("./apis/anime");
const { StartComicRequests } = require("./apis/comic");
const { StartGameRequests } = require("./apis/game");
const { StartMangaRequests } = require("./apis/manga");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { StartMovieFileDownload } = require("./scrapers/tmdb");

async function main() {
    try{
        console.log(Date());
        await ConnectToMongoDB();

        await StartMovieFileDownload();
        await StartAnimeRequests();
        await StartMangaRequests();
        await StartGameRequests();
        await StartComicRequests();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);
        return;
    }
}

main();