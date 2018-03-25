const util = require('util');
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS({
    useragent: 'TemporaryUserAgent',
    ssl: true
});

class CheckSubtitle {
    constructor(name, path, lang, indexNum) {
        this.fileName = name;
        this.filePath = path;
        this.language = lang;
        this.index = indexNum;
    }
    // Function to check subtitle for single video file
    checkSubSingle(errorCall, failureCall, successCall, partialSuccessCall, token) {
        var fileNameIn = this.fileName;
        var filePathIn = this.filePath;
        var languageIn = this.language;

        // Subtitle path variable same as video file name
        var subPath = path.join(path.dirname(filePathIn), path.basename(filePathIn, path.extname(fileNameIn)) + ".srt");
        
        // Execute normal search using subdb
        // Generate hash for the specified file
        subdb.computeHash(filePathIn, function (err, res) {
            if (err) {
                errorCall(token);
                return err;
            }
            var hash = res;

            // Use the hash to find subtitle in subdb api
            subdb.api.search_subtitles(hash, function (err, res) {
                if (err) {
                    errorCall(token);
                    return err;
                }

                // if user left the loading page, then exit the scan
                if (globalToken != token || globalToken == 0) {
                    return;
                }

                // Download the subtitle if success
                subdb.api.download_subtitle(hash, languageIn, subPath, function (err, res) {
                    if (err) {
                        errorCall(token);
                        return err;
                    }
                    // If subtitle search failed, execute deep scan
                    if (res == '') {
                        console.log("Failed to find subtitle using normal scan");

                        OpenSubtitles.search({
                            sublanguageid: languageCodeto3Letter(languageIn),
                            path: filePathIn,
                            filename: fileNameIn,
                            query: fileNameIn,
                            limit: 'all'
                        }).then(result => {
                            if (jQuery.isEmptyObject(result)) {
                                failureCall(token);
                            } else {
                                partialSuccessCall(result, filePathIn, token);
                            }
                        });
                        return res;
                    } else {
                        console.log("Successfully found subtitle using normal scan");
                        successCall(filePathIn, token);
                        return res;
                    }
                });
            });
        });
    }
    // Function to check subtitle for multiple video files
    checkSubMulti(errorCall, successCall, partialSuccessCall, token) {
        var fileNameIn = this.fileName;
        var filePathIn = this.filePath;
        var languageIn = this.language;
        var indexNum = this.index;

        // Subtitle path variable same as video file name
        var subPath = path.join(path.dirname(filePathIn), path.basename(filePathIn, path.extname(fileNameIn)) + ".srt");

        // Execute normal search using subdb
        // Generate hash for the specified file
        subdb.computeHash(filePathIn, function (err, res) {
            if (err) {
                errorCall(filePathIn, indexNum, token);
                return err;
            }

            var hash = res;

            // Use the hash to find subtitle in subdb api
            subdb.api.search_subtitles(hash, function (err, res) {
                if (err) {
                    errorCall(filePathIn, indexNum, token);
                    return err;
                }

                // if user left the result page, then exit the scan
                if (globalToken != token || globalToken == 0) {
                    return;
                }

                // Download the subtitle if success
                subdb.api.download_subtitle(hash, languageIn, subPath, function (err, res) {
                    if (err) {
                        errorCall(filePathIn, indexNum, token);
                        return err;
                    }
                    // If subtitle search failed, ready ui to execute deep scan
                    if (res == '') {
                        partialSuccessCall(filePathIn, indexNum, token);
                        console.log("Partial Success");
                        return res;
                    } else {
                        console.log("Successfully found");
                        successCall(filePathIn, indexNum, token);
                        return res;
                    }
                });

            });
        });
    }
}

// Function to convert default 2 language code to 3 language code for OpenSubtitle
function languageCodeto3Letter(lang) {
    switch (lang) {
        case 'en':
            return 'eng';
        case 'es':
            return 'spa';
        case 'fr':
            return 'fre';
        case 'it':
            return 'ita';
        case 'nl':
            return 'dut';
        case 'pl':
            return 'pol';
        case 'pt':
            return 'por';
        case 'ro':
            return 'ron';
        case 'sv':
            return 'swe';
        case 'tr':
            return 'tur';
        default:
            console.log("Error language code");
            break;
    }
}
module.exports = CheckSubtitle;