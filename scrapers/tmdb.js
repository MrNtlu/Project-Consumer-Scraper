const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension, sleep } = require("../constants");
const ndjsonParser = require("ndjson-parse");
const { GetMovies, GetTVSeries } = require("../apis/tmdb");
const { MovieModel, TVSeriesModel } = require("../mongodb");

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
            directory: `./${downloadFolder}`,
            cloneFiles: false,
        });

        try {
            const { _, downloadStatus } = await downloader.download();
            const path = `./${downloadFolder}/${url}`;

            console.log("Download status:", downloadStatus);
            pathList.push(path);
        } catch (error) {
            console.log("Download failed", error);
        }
    }

    pathList.forEach(async path => {
        extractFile(path);
    });

    await sleep(3000);

    await Promise.all([
        readFile(pathList[0].replace(".gz", ''), false),
        readFile(pathList[1].replace(".gz", ''), true)
    ])
}

function extractFile(filePath) {
    gunzip(filePath, filePath.replace(".gz", ''), async function () {
        console.log("Extracted successfully.", filePath);
    })
}

async function readFile(filePath, isMovie) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log(`Total ${isMovie ? "movie" : "tv series"} items: `, parsedNdJsonList.length);

    if (isMovie) {
        console.log("Movie fetch started.");

        const movieList = [];
        for (let index = 0; index < parsedNdJsonList.length; index++) {
            const movieModel = await GetMovies(parsedNdJsonList[index].id);

            if (movieModel != null) {
                movieList.push(movieModel);
            }
        }

        console.log("Movie fetch Ended.");
        if (movieList.length > 0) {
            console.log(`Inserting ${movieList.length} number of items to Movie DB.`);
            await MovieModel.deleteMany({});
            await MovieModel.insertMany(movieList);
        }
    } else {
        console.log("TVSeries fetch started.");

        const tvSeriesList = [];
        for (let index = 0; index < parsedNdJsonList.length; index++) {
            const tvModel = await GetTVSeries(parsedNdJsonList[index].id);
            if (tvModel != null) {
                tvSeriesList.push(tvModel);
            }
        }

        console.log("TVSeries fetch ended.");
        if (tvSeriesList.length > 0) {
            console.log(`Inserting ${tvSeriesList.length} number of items to TVSeries DB.`);
            await TVSeriesModel.deleteMany({});
            await TVSeriesModel.insertMany(tvSeriesList);
        }
    }
}

module.exports.DownloadFile = downloadFile;