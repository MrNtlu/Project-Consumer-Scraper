const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension } = require("../constants");
const ndjsonParser = require("ndjson-parse");
const { GetMovies, GetTVSeries } = require("../apis/tmdb");

const today = new Date();
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() - 1 < 10) ? '0' + (today.getUTCDate() - 1) : today.getUTCDate() - 1;
const year = today.getUTCFullYear();

const movieDownloadURL = `movie_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const tvSeriesDownloadURL = `tv_series_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const downloadURLList = [tvSeriesDownloadURL, movieDownloadURL];
const downloadFolder = "downloads"
const movieDownloadPath = `./${downloadFolder}/${movieDownloadURL.replace(".gz", '')}`

const pathList = [];
async function downloadFile() {
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true });

        console.log("Previous files deleted successfully.");
    }


    for (const url of downloadURLList) {
        console.log("Download starting for: ", url);
        const downloader = new Downloader({
            url: tmdbFileBaseURL + url,
            directory: "./" + downloadFolder,
            cloneFiles: false,
        });

        try {
            const { _, downloadStatus } = await downloader.download();
            const path = "./" + downloadFolder + "/" + url;

            console.log("Download status:", downloadStatus);
            pathList.push(path);
        } catch (error) {
            console.log("Download failed", error);
        }
    }

    pathList.forEach(async path => {
        extractFile(path);
    });
}

function extractFile(filePath) {
    gunzip(filePath, filePath.replace(".gz", ''), async function () {
        console.log("Extracted successfully.", filePath);

        // This check is required for sync.
        // Without this check it loops both movie and tv series at the same time.
        if (filePath.replace(".gz", '') != movieDownloadPath) {
            await readFile(pathList[0].replace(".gz", ''), false)
            await readFile(pathList[1].replace(".gz", ''), true)
        }
    })
}

async function readFile(filePath, isMovie) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log("Total items:", parsedNdJsonList.length);

    if (isMovie) {
        console.log("Movie fetch started.");

        for (let index = 0; index < parsedNdJsonList.length; index++) {
            await GetMovies(parsedNdJsonList[index].id);
        }

        console.log("Movie fetch Ended.");
    } else {
        console.log("TVSeries fetch started.");

        for (let index = 0; index < parsedNdJsonList.length; index++) {
            await GetTVSeries(parsedNdJsonList[index].id);
        }

        console.log("TVSeries fetch ended.");
    }
}

module.exports.DownloadFile = downloadFile;