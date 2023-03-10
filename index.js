const { StartAnimeRequests } = require("./apis/anime");
const { ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");
const { DownloadFile } = require("./scrapers/tmdb");

async function main() {
    try{
        await ConnectToMongoDB();
        await Promise.all([
            StartAnimeRequests(),
            DownloadFile()
        ])
        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Error occured', err);
        return;
    }
}

main();