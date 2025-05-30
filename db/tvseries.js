const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension, sleep } = require("../constants");
const ndjsonParser = require("ndjson-parse");
const { InsertTVSeries } = require("../scrapers/tmdb");
const { GetTVSeries } = require("../apis/tmdb");

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 7));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

const tvSeriesDownloadURL = `tv_series_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const downloadFolder = "downloads"

const popularityThreshold = 20;

async function startTVFileDownload() {
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true });

        console.log("Previous files deleted successfully.");
    }

    console.log("Download starting for: ", tvSeriesDownloadURL);
    const downloader = new Downloader({
        url: tmdbFileBaseURL + tvSeriesDownloadURL,
        directory: `./${downloadFolder}`,
        cloneFiles: false,
    });

    try {
        const { _, downloadStatus } = await downloader.download();
        const path = `./${downloadFolder}/${tvSeriesDownloadURL}`;

        console.log("Download status:", downloadStatus);
        extractFile(path);

        await sleep(3000);

    await Promise.all([
        readFile(path.replace(".gz", '')),
    ]);
    } catch (error) {
        console.log("Download failed", downloader, error);
    }
}

function extractFile(filePath) {
    gunzip(filePath, filePath.replace(".gz", ''), async function () {
        console.log("Extracted successfully.", filePath);
    });
}

async function readFile(filePath) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log(`Total tv series items: `, parsedNdJsonList.length);

    console.log("TVSeries fetch started.");

    const tvSeriesList = [];
    for (let index = 0; index < parsedNdJsonList.length; index++) {
        if (parsedNdJsonList[index].popularity > popularityThreshold) {
            const tvModel = await GetTVSeries(parsedNdJsonList[index].id);

            if (
                tvModel != null &&
                !(tvModel.genres.some(e => e === "News")) &&
                !(tvModel.production_companies.some(e => e.origin_country === "JP") && tvModel.genres.some(e => e === "Animation")) &&
                !tvModel.networks.some(e => e.origin_country === "IN") &&
                !(
                    (tvModel.streaming != null) &&
                    (tvModel.streaming.filter(e => e.country_code == "US") != null) &&
                    ((tvModel.streaming.filter(e => e.country_code == "US")[0] != null)) &&
                    (tvModel.streaming.filter(e => e.country_code == "US")[0].streaming_platforms != null) &&
                    (tvModel.streaming.filter(e => e.country_code == "US")[0].streaming_platforms.some(e => e.name.includes("Crunchyroll")))
                ) &&
                tvModel.first_air_date != ""
            ) {
                tvSeriesList.push(tvModel);
            }
        }
    }
    console.log("TVSeries fetch ended.");

    await InsertTVSeries(tvSeriesList);
}

module.exports.StartTVFileDownload = startTVFileDownload;
