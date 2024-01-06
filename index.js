const { StartAnimeRequests } = require("./apis/anime");
const { StartComicRequests } = require("./apis/comic");
const { StartGameRequests } = require("./apis/game");
const { StartMangaRequests } = require("./apis/manga");
const { sleep } = require("./constants");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { StartMovieFileDownload } = require("./scrapers/tmdb");

async function main() {
    try{
        console.log(Date());
        await ConnectToMongoDB();

        await StartComicRequests();
        await StartMangaRequests();
        await StartAnimeRequests();
        await StartMovieFileDownload();
        await StartGameRequests();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Main Error occured', err);

        console.log("\n!!!!!!!\nRestarting in 3s...\n!!!!!!!\n")
        sleep(3000);
        main();
        return;
    }
}

main();