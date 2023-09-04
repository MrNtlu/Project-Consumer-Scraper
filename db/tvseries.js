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
        if (parsedNdJsonList[index].popularity > 25) {
            const tvModel = await GetTVSeries(parsedNdJsonList[index].id);

            if (
                tvModel != null &&
                !(tvModel.networks.some(e => e.origin_country === "JP") && tvModel.genres.some(e => e.name === "Animation")) &&
                !tvModel.networks.some(e => e.origin_country === "IN") &&
                tvModel.first_air_date != "" &&
                (
                    !tvModel.genres.some(e => e.name === "Animation") ||
                    (
                        tvModel.tmdb_id == "456" ||
                        tvModel.tmdb_id == "60625" ||
                        tvModel.tmdb_id == "1434" ||
                        tvModel.tmdb_id == "1433" ||
                        tvModel.tmdb_id == "94605" ||
                        tvModel.tmdb_id == "95557" ||
                        tvModel.tmdb_id == "105248" ||
                        tvModel.tmdb_id == "4194"
                    )
                )
            ) {
                tvSeriesList.push(tvModel);
            }
        }
    }
    console.log("TVSeries fetch ended.");

    await InsertTVSeries(tvSeriesList);
}

module.exports.StartTVFileDownload = startTVFileDownload;
