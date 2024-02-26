const { StartAnimeRequests } = require("./apis/anime");
const { StartGameRequests } = require("./apis/game");
const { StartMangaRequests } = require("./apis/manga");
const { sleep } = require("./constants");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { StartMovieFileDownload } = require("./scrapers/tmdb");

async function main() {
    try{
        console.log(Date());
        await ConnectToMongoDB();

        await StartMovieFileDownload();

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