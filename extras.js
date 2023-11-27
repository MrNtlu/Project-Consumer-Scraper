const fs = require("fs");
const gunzip = require("gunzip-file");
const Downloader = require("nodejs-file-downloader");
const { tmdbFileBaseURL, tmdbFileExtension, sleep } = require("./constants");
const ndjsonParser = require("ndjson-parse");
const { GetPersonDetails } = require("./apis/people");
const { PersonModel, ConnectToMongoDB, DisconnectFromMongoDB } = require("./mongodb");

const date = new Date()
const today = new Date(date.setDate(date.getDate() - 1));
const month = (today.getUTCMonth() + 1 < 10) ? '0' + (today.getUTCMonth() + 1) : today.getUTCMonth() + 1;
const day = (today.getUTCDate() < 10) ? '0' + today.getUTCDate() : today.getUTCDate();
const year = today.getUTCFullYear();

const personDownloadURL = `person_ids_${month}_${day}_${year}${tmdbFileExtension}`;
const downloadFolder = "person_downloads";

async function startPersonFileDownload() {
    if (fs.existsSync(downloadFolder)) {
        fs.rmSync(downloadFolder, { recursive: true });

        console.log("Previous files deleted successfully.");
    }

    console.log("Download starting for: ", personDownloadURL);
    const downloader = new Downloader({
        url: tmdbFileBaseURL + personDownloadURL,
        directory: `./${downloadFolder}`,
        cloneFiles: false,
    });

    try {
        const { _, downloadStatus } = await downloader.download();
        const path = `./${downloadFolder}/${personDownloadURL}`;

        console.log("Download status:", downloadStatus);
        await extractFile(path);
        await sleep(3000);
        await readFile(path.replace(".gz", ''));
    } catch (error) {
        console.log("Download failed", downloader, error);
    }
}

async function extractFile(filePath) {
    return new Promise((resolve, _) => {
        gunzip(filePath, filePath.replace(".gz", ''), async function () {
            console.log("Extracted successfully.", filePath);
            resolve();
        })
    })
}

const personThreshold = 15;

async function readFile(filePath) {
    console.log("Reading file", filePath);

    var text = fs.readFileSync(filePath).toString('utf-8');
    const parsedNdJsonList = ndjsonParser(text);
    console.log(`Total person items: `, parsedNdJsonList.length);

    var peopleList = [];

    console.log("Person fetch started.");
    for (let index = 0; index < parsedNdJsonList.length; index++) {
        if (parsedNdJsonList[index].popularity > personThreshold) {
            const personModel = await GetPersonDetails(parsedNdJsonList[index].id);

            if (personModel != null && personModel.image_url != null) {
                peopleList.push(personModel);
            }

            if (peopleList.length >= 2500) {
                await insertPeople(peopleList);

                peopleList = [];
            }
        }
    }
    console.log(`People fetch Ended. Inserting remaining people ${peopleList.length}`);

    await insertPeople(peopleList);
}

async function insertPeople(peopleList) {
    console.log(`Inserting ${peopleList.length} number of items to Person DB.`);

    for (let index = 0; index < peopleList.length; index++) {
        const element = peopleList[index];

        peopleList[index] = {
            'updateOne': {
                'filter': {'tmdb_id': element.tmdb_id},
                'update': {
                    "$set": {
                        name: element.name,
                        biography: element.biography,
                        birthday: element.birthday,
                        deathday: element.deathday,
                        tmdb_id: element.tmdb_id,
                        tmdb_popularity: element.tmdb_popularity,
                        place_of_birth: element.place_of_birth,
                        image_url: element.image_url,
                        thumb_image_url: element.thumb_image_url,
                        images: element.images,
                        created_at: new Date(),
                    }
                },
                'upsert': true,
            }
        }
    }
    try {
        await PersonModel.bulkWrite(peopleList);
        console.log(`Inserted ${peopleList.length} number of items to Person DB.`);
    } catch(error) {
        console.log("Person Insert error", error);
    }
}

async function extras() {
    try{
        console.log(Date());
        await ConnectToMongoDB();

        await startPersonFileDownload();

        DisconnectFromMongoDB();
    } catch(err) {
        console.log('Extra Error occured', err);
        return;
    }
}

extras();