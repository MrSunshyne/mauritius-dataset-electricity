import { exit } from 'process';
import fs from 'fs'
import { extractFromSource, makeUniq, categorize } from "./utils"
import request from 'request'
import deepmerge from 'deepmerge';

const URL = 'https://ceb.mu/customer-corner/power-outage-information'
const path = './data/power-outages.json'
const path_latest = './data/power-outages.latest.json'

request(URL, function (error, _, body) {
    if (error) {
        console.error('error:', error);
        exit(1)
    }

    console.log('Fetched raw data from CEB');

    console.log('Pre-extracting data ...')
    const result = /var arDistrictLocations = ({".+"});/gm.exec(body);
    if (!result || result.length !== 2) {
        console.error('error: result from pre-extraction is null or malformed');
        exit(1);
    }
    const preExtracted = JSON.parse(result?.[1] || '');
    console.log('Pre-extracted data');

    // The newly fetched data from CEB Website.
    console.log('Extracting data ...');
    const newData = extractFromSource(preExtracted);
    console.log('Extracted data');

    // Create aggregate data file if not exist.
    if (!fs.existsSync(path)) {
        console.log('Creating aggregate data file ...');
        fs.writeFileSync(path, JSON.stringify(newData));
        console.log('Created aggregate data file');       
    }

    console.log('Updating aggregate data file ...');
    const rawdata = fs.readFileSync(path); // open file
    const oldData = JSON.parse(rawdata.toString());
    const mergedData = deepmerge(oldData, newData) // Merge old and new data
    const uniq = makeUniq(mergedData); // remove duplicate data & empty values
    fs.writeFileSync(path, JSON.stringify(uniq));
    console.log('Updated aggregate data file');

    // Create latest data file if not exist.
    if (!fs.existsSync(path_latest)) {
        console.log('Creating latest data file ...');
        fs.writeFileSync(path_latest, JSON.stringify(newData));
        console.log('Created latest data file');
    }

    console.log('Updating latest data file ...');
    fs.writeFileSync(path_latest, JSON.stringify(categorize(newData)));
    console.log('Updated latest data file');

    exit(0);
});
