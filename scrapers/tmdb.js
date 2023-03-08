const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension } = require("../constants");
const ndjsonParser = require("ndjson-parse");

const today = new Date();
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() - 1 < 10) ? '0' + (today.getUTCDate() - 1) : today.getUTCDate() - 1;
const year = today.getUTCFullYear();

const movieDownloadURL = "movie_ids_" + month + "_" + day + "_" + year + tmdbFileExtension;
const tvSeriesDownloadURL = "tv_series_ids_" + month + "_" + day + "_" + year + tmdbFileExtension;
const downloadURLList = [movieDownloadURL, tvSeriesDownloadURL];

async function downloadFile() {
    if (fs.existsSync("downloads")) {
        fs.rmSync("downloads", { recursive: true });

        console.log("Previous files deleted successfully.");
    }

    var pathList = [];
    for (const url of downloadURLList) {
        console.log("Download starting for: ", url);
        const downloader = new Downloader({
            url: tmdbFileBaseURL + url,
            directory: "./downloads",
            cloneFiles: false,
        });

        try {
            const { _, downloadStatus } = await downloader.download();
            const path = "./downloads/" + url;

            console.log("Download status:", downloadStatus);
            pathList.push(path);
        } catch (error) {
            console.log("Download failed", error);
        }
    }

    pathList.forEach(async path => {
        await extractFile(path);
    });
}

async function extractFile(filePath) {
    gunzip(filePath, filePath.replace(".gz", ''), function() {
        console.log("Extracted successfully.");

        readFile(filePath.replace(".gz", ''));
    })
}

async function readFile(filePath) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJson = ndjsonParser(text);
    console.log(parsedNdJson[0].id);

    // var data = fs.readFileSync(filePath);
    // var parsedJSON = JSON.parse(data);
    // for (let index = 0; index < parsedJSON.length; index++) {
    //     console.log(array[index]);
    // }
}

module.exports.DownloadFile = downloadFile;