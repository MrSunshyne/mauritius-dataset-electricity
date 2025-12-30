import { exit } from 'process';
import fs from 'fs'
import path from 'path'
import { extractFromSource, makeUniq, categorize, flattenOutages, groupOutagesByDate, groupOutagesByLocality, slugify, getMauritiusDateString } from "./utils"
import deepmerge from 'deepmerge';

const URL = 'https://ceb.mu/customer-corner/power-outage-information'
const historicalPath = './data/power-outages.json'
const pathLatest = './data/power-outages.latest.json'
const DATA_DIR = './data';
const DAILY_DIR = path.join(DATA_DIR, 'daily');
const LOCALITIES_DIR = path.join(DATA_DIR, 'localities');

interface Outage {
    date: string;
    locality: string;
    streets: string;
    district: string;
    from: string;
    to: string;
    id: string;
    outageId: string;
}

interface LocalityMapping {
    version: string;
    generated: string;
    localities: Record<string, {
        name: string;
        district: string;
        aliases: string[];
    }>;
}

// Ensure directories exist
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load localities mapping
function loadLocalitiesMapping(): LocalityMapping {
    const rawData = fs.readFileSync('./localities-mapping.json', 'utf-8');
    return JSON.parse(rawData);
}

// Generate all view files from historical data
function generateViews(historicalData: Record<string, Outage[]>) {
    console.log('Generating view files...');

    const mapping = loadLocalitiesMapping();
    const outages = flattenOutages(historicalData);

    console.log(`Processing ${outages.length} outages for view generation`);

    // Generate daily files
    generateDailyFiles(outages);

    // Generate locality files
    generateLocalityFiles(outages, mapping);

    // Generate root index
    generateRootIndex(outages, mapping);

    console.log('View files generated successfully');
}

// Generate daily files
function generateDailyFiles(outages: Outage[]) {
    console.log('Generating daily files...');
    ensureDir(DAILY_DIR);

    const grouped = groupOutagesByDate(outages);
    const dailyIndex: Array<{
        date: string;
        file: string;
        outageCount: number;
    }> = [];

    for (const [dateStr, dateOutages] of Array.from(grouped.entries()).sort()) {
        const dailyData = {
            date: dateStr,
            timezone: 'Indian/Mauritius',
            generated: new Date().toISOString(),
            outageCount: dateOutages.length,
            outages: dateOutages.map(outage => ({
                date: outage.date,
                locality: outage.locality,
                localitySlug: slugify(outage.locality),
                streets: outage.streets,
                district: outage.district,
                from: outage.from,
                to: outage.to,
                id: outage.id
            }))
        };

        fs.writeFileSync(
            path.join(DAILY_DIR, `${dateStr}.json`),
            JSON.stringify(dailyData, null, 2)
        );

        dailyIndex.push({
            date: dateStr,
            file: `${dateStr}.json`,
            outageCount: dateOutages.length
        });
    }

    // Generate daily index
    const indexData = {
        generated: new Date().toISOString(),
        timezone: 'Indian/Mauritius',
        description: 'Daily files contain all outages that occurred on that date in Mauritius time',
        available: dailyIndex.reverse() // Most recent first
    };

    fs.writeFileSync(
        path.join(DAILY_DIR, 'index.json'),
        JSON.stringify(indexData, null, 2)
    );

    console.log(`Generated ${dailyIndex.length} daily files`);
}

// Generate locality files
function generateLocalityFiles(outages: Outage[], mapping: LocalityMapping) {
    console.log('Generating locality files...');
    ensureDir(LOCALITIES_DIR);

    const grouped = groupOutagesByLocality(outages, mapping);
    const localitiesIndex: Array<{
        slug: string;
        name: string;
        district: string;
        outageCount: number;
        file: string;
        firstOutage: string;
        lastOutage: string;
    }> = [];

    for (const [slug, localityOutages] of Array.from(grouped.entries()).sort()) {
        // Sort by date descending (most recent first)
        const sorted = localityOutages.sort((a, b) =>
            new Date(b.from).getTime() - new Date(a.from).getTime()
        );

        const localityInfo = mapping.localities[slug];
        if (!localityInfo) {
            console.warn(`Warning: Locality slug "${slug}" not found in mapping`);
            continue;
        }

        const firstOutage = sorted[sorted.length - 1];
        const lastOutage = sorted[0];

        const localityData = {
            slug: slug,
            name: localityInfo.name,
            district: localityInfo.district,
            generated: new Date().toISOString(),
            outageCount: sorted.length,
            firstOutage: getMauritiusDateString(new Date(firstOutage.from)),
            lastOutage: getMauritiusDateString(new Date(lastOutage.from)),
            outages: sorted.map(outage => ({
                date: outage.date,
                streets: outage.streets,
                from: outage.from,
                to: outage.to,
                id: outage.id
            }))
        };

        fs.writeFileSync(
            path.join(LOCALITIES_DIR, `${slug}.json`),
            JSON.stringify(localityData, null, 2)
        );

        localitiesIndex.push({
            slug: slug,
            name: localityInfo.name,
            district: localityInfo.district,
            outageCount: sorted.length,
            file: `${slug}.json`,
            firstOutage: getMauritiusDateString(new Date(firstOutage.from)),
            lastOutage: getMauritiusDateString(new Date(lastOutage.from))
        });
    }

    // Generate localities index
    const indexData = {
        generated: new Date().toISOString(),
        description: 'All outages grouped by locality',
        localityCount: localitiesIndex.length,
        localities: localitiesIndex.sort((a, b) => a.slug.localeCompare(b.slug))
    };

    fs.writeFileSync(
        path.join(LOCALITIES_DIR, 'index.json'),
        JSON.stringify(indexData, null, 2)
    );

    console.log(`Generated ${localitiesIndex.length} locality files`);
}

// Generate root index
function generateRootIndex(outages: Outage[], mapping: LocalityMapping) {
    console.log('Generating root index...');

    const dates = outages
        .filter(o => o.from)
        .map(o => getMauritiusDateString(new Date(o.from)))
        .sort();

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const districts = new Set(outages.map(o => o.district));

    const rootIndex = {
        name: 'Mauritius Electricity Power Outages Dataset',
        description: 'Automatically updated dataset of power outages in Mauritius',
        source: 'https://ceb.mu/customer-corner/power-outage-information',
        repository: 'https://github.com/MrSunshyne/mauritius-dataset-electricity',
        generated: new Date().toISOString(),
        timezone: 'Indian/Mauritius',
        schema: {
            version: '2.0'
        },
        files: {
            full: {
                path: 'power-outages.json',
                description: 'Complete historical data'
            },
            latest: {
                path: 'power-outages.latest.json',
                description: "Today's outages (including completed) and future scheduled outages"
            },
            daily: {
                index: 'daily/index.json',
                description: 'Outages grouped by date'
            },
            localities: {
                index: 'localities/index.json',
                description: 'Outages grouped by locality'
            }
        },
        stats: {
            totalOutages: outages.length,
            dateRange: {
                from: firstDate,
                to: lastDate
            },
            districtCount: districts.size,
            localityCount: Object.keys(mapping.localities).length
        }
    };

    fs.writeFileSync(
        path.join(DATA_DIR, 'index.json'),
        JSON.stringify(rootIndex, null, 2)
    );

    console.log('Generated root index');
}

async function main() {
    try {
        // Use Bun's native fetch
        const response = await fetch(URL);
        if (!response.ok) {
            console.error('error:', response.status, response.statusText);
            exit(1);
        }
        const body = await response.text();

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
    if (!fs.existsSync(historicalPath)) {
        console.log('Creating aggregate data file ...');
        fs.writeFileSync(historicalPath, JSON.stringify(newData));
        console.log('Created aggregate data file');
    }

    console.log('Updating aggregate data file ...');
    const rawdata = fs.readFileSync(historicalPath); // open file
    const oldData = JSON.parse(rawdata.toString());
    const mergedData = deepmerge(oldData, newData) // Merge old and new data
    const uniq = makeUniq(mergedData); // remove duplicate data & empty values
    fs.writeFileSync(historicalPath, JSON.stringify(uniq));
    console.log('Updated aggregate data file');

    // Create latest data file if not exist.
    if (!fs.existsSync(pathLatest)) {
        console.log('Creating latest data file ...');
        fs.writeFileSync(pathLatest, JSON.stringify(newData));
        console.log('Created latest data file');
    }

        console.log('Updating latest data file ...');
        fs.writeFileSync(pathLatest, JSON.stringify(categorize(newData)));
        console.log('Updated latest data file');

        // Generate all view files FROM the updated historical data
        // This ensures no data is lost, even if CEB removes an outage from their website
        generateViews(uniq);

        exit(0);
    } catch (error) {
        console.error('error:', error);
        exit(1);
    }
}

main();
