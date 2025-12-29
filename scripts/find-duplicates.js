import fs from 'fs';

const inputPath = './data/power-outages.json';

console.log('Loading data...');
const data = JSON.parse(fs.readFileSync(inputPath).toString());

const outageIdMap = new Map();
const duplicates = [];
let totalOutages = 0;

console.log('Scanning for duplicates...');

for (const district in data) {
    for (const outage of data[district]) {
        totalOutages++;
        const key = outage.outageId;
        
        if (outageIdMap.has(key)) {
            const existing = outageIdMap.get(key);
            duplicates.push({
                outageId: key,
                locality: outage.locality,
                district: district,
                entry1: {
                    id: existing.id,
                    date: existing.date,
                    to: existing.to
                },
                entry2: {
                    id: outage.id,
                    date: outage.date,
                    to: outage.to
                }
            });
        } else {
            outageIdMap.set(key, outage);
        }
    }
}

console.log('');
console.log('=== Duplicate Report ===');
console.log(`Total outages scanned: ${totalOutages}`);
console.log(`Unique outageIds: ${outageIdMap.size}`);
console.log(`Duplicates found: ${duplicates.length}`);
console.log('');

if (duplicates.length > 0) {
    console.log('=== Duplicate Details ===');
    duplicates.forEach((dup, index) => {
        console.log(`\n[${index + 1}] ${dup.locality} (${dup.district})`);
        console.log(`    outageId: ${dup.outageId}`);
        console.log(`    Entry 1: id=${dup.entry1.id}`);
        console.log(`             date="${dup.entry1.date}"`);
        console.log(`             to=${dup.entry1.to}`);
        console.log(`    Entry 2: id=${dup.entry2.id}`);
        console.log(`             date="${dup.entry2.date}"`);
        console.log(`             to=${dup.entry2.to}`);
    });
    
    console.log('\n');
    console.log('These duplicates will be merged when makeUniq() runs.');
    console.log('The entry with the latest "to" time will be kept.');
} else {
    console.log('No duplicates found!');
}
