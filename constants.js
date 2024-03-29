const tmdbFileBaseURL = "http://files.tmdb.org/p/exports/"
const tmdbFileExtension = ".json.gz"

const tmdbBaseMovieAPIURL = "https://api.themoviedb.org/3/movie/"
const tmdbBaseDiscoverAPIURL = "https://api.themoviedb.org/3/discover/"
const tmdbBaseTVSeriesAPIURL = "https://api.themoviedb.org/3/tv/"
const tmdbBasePersonAPIURL = "https://api.themoviedb.org/3/person/"
const tmdbBaseImageURL = "https://image.tmdb.org/t/p/"

const jikanBaseURL = "https://api.jikan.moe/v4/"

const rawgBaseURL = "https://api.rawg.io/api/"

const comicBaseURL = "https://comicvine.gamespot.com/api/"

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.tmdbFileBaseURL = tmdbFileBaseURL
module.exports.tmdbFileExtension = tmdbFileExtension
module.exports.tmdbBaseMovieAPIURL = tmdbBaseMovieAPIURL
module.exports.tmdbBaseDiscoverAPIURL = tmdbBaseDiscoverAPIURL
module.exports.tmdbBaseTVSeriesAPIURL = tmdbBaseTVSeriesAPIURL
module.exports.tmdbBasePersonAPIURL = tmdbBasePersonAPIURL
module.exports.tmdbBaseImageURL = tmdbBaseImageURL
module.exports.jikanBaseURL = jikanBaseURL
module.exports.rawgBaseURL = rawgBaseURL
module.exports.comicBaseURL = comicBaseURL

module.exports.sleep = sleep