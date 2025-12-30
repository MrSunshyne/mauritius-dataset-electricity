import fs from 'fs';

interface Outage {
    locality: string;
    district: string;
    from: string;
}

interface LocalityInfo {
    name: string;
    district: string;
    aliases: string[];
}

interface LocalitiesMapping {
    version: string;
    generated: string;
    localities: Record<string, LocalityInfo>;
}

// Slugify a locality name according to the rules
function slugify(name: string): string {
    return name
        .toLowerCase()
        // Remove parentheses and their contents
        .replace(/\([^)]*\)/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove special characters except hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Remove multiple consecutive hyphens
        .replace(/-+/g, '-')
        // Trim leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

// Read the historical data file
const rawData = fs.readFileSync('./data/power-outages.json', 'utf-8');
const data: Record<string, Outage[]> = JSON.parse(rawData);

// Collect all localities with their districts
const localityMap = new Map<string, { district: string; names: Set<string> }>();

Object.values(data).flat().forEach(outage => {
    const slug = slugify(outage.locality);
    
    if (!localityMap.has(slug)) {
        localityMap.set(slug, {
            district: outage.district,
            names: new Set([outage.locality])
        });
    } else {
        // Add as an alias if it's a different spelling
        localityMap.get(slug)!.names.add(outage.locality);
    }
});

// Build the mapping object
const localities: Record<string, LocalityInfo> = {};

for (const [slug, info] of localityMap.entries()) {
    const namesArray = Array.from(info.names).sort();
    const canonicalName = namesArray[0]; // Use first alphabetically as canonical
    const aliases = namesArray.slice(1); // Rest are aliases
    
    localities[slug] = {
        name: canonicalName,
        district: info.district,
        aliases: aliases
    };
}

// Create the final mapping object
const mapping: LocalitiesMapping = {
    version: "1.0",
    generated: new Date().toISOString(),
    localities: Object.fromEntries(
        Object.entries(localities).sort((a, b) => a[0].localeCompare(b[0]))
    )
};

// Write to file
fs.writeFileSync(
    './localities-mapping.json',
    JSON.stringify(mapping, null, 2)
);

console.log(`Generated localities-mapping.json with ${Object.keys(localities).length} localities`);
