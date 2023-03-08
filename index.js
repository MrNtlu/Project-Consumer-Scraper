const { ConnectToMongoDB } = require("./mongodb");
const { DownloadFile } = require("./scrapers/tmdb");

async function main() {
    try{
        await DownloadFile();
        // await ConnectToMongoDB();
    } catch(err) {
        console.log('Error occured', err);
        return;
    }
}

main();