import convert from 'html-to-json-data';
import { group, text } from 'html-to-json-data/definitions.js';
import { parse } from "date-fns";
import fr from "date-fns/locale/fr/index.js";
import md5 from 'md5'

export interface Outage {
    date: string;
    locality: string;
    streets: string;
    district: string;
    from: string; // Date string in ISO format
    to: string;   // Date string in ISO format
    id: string;
    outageId: string; // Stable ID based on district + locality + start time
}

export interface InputData {
    [district: string]: Outage[];
}

export interface OutputObject {
    today: Outage[];
    future: Outage[];
}

export interface LocalityMapping {
    version: string;
    generated: string;
    localities: Record<string, {
        name: string;
        district: string;
        aliases: string[];
    }>;
}

const MAURITIUS_TIMEZONE = 'Indian/Mauritius';

/**
 * Get the current time adjusted for Mauritius timezone using the Intl API.
 * Returns the start and end of "today" in Mauritius time as UTC Date objects.
 */
function getMauritiusToday(): { now: Date; startOfDay: Date; endOfDay: Date } {
    const now = new Date();

    // Get current date parts in Mauritius timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: MAURITIUS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // Format: YYYY-MM-DD (en-CA locale gives us this format)
    const mauritiusDateStr = formatter.format(now);

    // Create start of day (00:00:00) in Mauritius timezone
    // By appending the timezone, the Date constructor will convert to UTC internally
    const startOfDay = new Date(`${mauritiusDateStr}T00:00:00.000+04:00`);

    // Create end of day (23:59:59.999) in Mauritius timezone
    const endOfDay = new Date(`${mauritiusDateStr}T23:59:59.999+04:00`);

    return { now, startOfDay, endOfDay };
}

function parseDate(date: string, delimiter = 'from', tz = "+0400") {
    if (date.length > 0) {
        let processing: string[] = date.replace(/\s+/g, ' ').trim().split('à');

        const opt = {
            locale: fr,
        };

        const from = parse(processing[0].trim() + tz, "'Le' EEEE d MMMM yyyy 'de' HH:mm:ssxx", new Date(), opt)
        const to = parse(processing[1].trim() + tz, 'HH:mm:ssxx', from, opt)

        if (delimiter === 'from') {
            return from
        } else {
            return to
        }
    } else {
        return date
    }
}

/**
 * Remove duplicate outages based on a property key.
 * When duplicates are found (same key), keeps the one with the latest 'to' time.
 * This ensures that when CEB updates an outage, we keep the most recent version.
 */
function removeDuplicates(originalArray: any[], prop: string = 'outageId'): any[] {
    const newArray: any[] = [];
    const lookupObject: Record<string, any> = {};

    for (const i in originalArray) {
        const item = originalArray[i];
        if (item['date'] !== '') { // also remove empty values when date is null
            const key = item[prop];

            // If duplicate found, keep the one with later 'to' time (most updated)
            if (lookupObject[key]) {
                const existingTo = new Date(lookupObject[key].to);
                const currentTo = new Date(item.to);
                if (currentTo > existingTo) {
                    lookupObject[key] = item;
                }
            } else {
                lookupObject[key] = item;
            }
        }
    }

    for (const key in lookupObject) {
        newArray.push(lookupObject[key]);
    }
    return newArray;
}

/**
 * Remove duplicate outages from all districts.
 * Uses 'outageId' for deduplication to properly handle CEB updates.
 */
export function makeUniq(obj: InputData): InputData {
    const newObj: InputData = {}
    for (const arr in obj) {
        const newSet = removeDuplicates(obj[arr], 'outageId')
        newObj[arr] = [...newSet]
    }
    return newObj
}

export const extractFromSource = (data: any): InputData => {
    const districts = Object.keys(data);
    const dataset: InputData = {}

    for (const district in districts) {
        if (Object.prototype.hasOwnProperty.call(districts, district)) {
            const element = districts[district];
            const currentDistrict = convert(data[element],
                group('[id^=table-mauritius] tbody tr',
                    {
                        date: text('td:nth-child(1)'),
                        locality: text('td:nth-child(2)'),
                        streets: text('td:nth-child(3)'),
                        district: element,
                    }
                )
            )

            dataset[element] = currentDistrict.map((item: any) => {
                const from = parseDate(item.date, 'from');
                const to = parseDate(item.date, 'to');
                const fromISO = from instanceof Date ? from.toISOString() : '';

                return {
                    ...item,
                    "from": from,
                    "to": to,
                    "id": md5(JSON.stringify(item)), // Legacy ID (unchanged for backwards compatibility)
                    "outageId": md5(`${element}-${item.locality}-${fromISO}`) // Stable ID based on district + locality + start time
                }
            })
        }
    }


    return dataset
}

// Categorize outages into "today" (started today or still active) and "future"
// Uses Mauritius timezone (UTC+4) to determine "today"
export const categorize = (inputData: InputData): OutputObject => {
    const { now, startOfDay, endOfDay } = getMauritiusToday();

    const todayOutages: Outage[] = [];
    const futureOutages: Outage[] = [];

    // Iterate over each district in the input data.
    Object.values(inputData).forEach((outages: Outage[]) => {
        outages.forEach((outage: Outage) => {
            if (!outage.from || !outage.to) {
                // If 'from' or 'to' field is missing or empty, skip this outage.
                return;
            }

            const from = new Date(outage.from);
            const to = new Date(outage.to);

            // Include in "today" if:
            // 1. Outage started today (from >= startOfDay AND from <= endOfDay), OR
            // 2. Outage is still ongoing (to > now)
            const startedToday = from >= startOfDay && from <= endOfDay;
            const stillOngoing = to > now;

            if (startedToday || stillOngoing) {
                // If it starts after today, it's a future outage
                if (from > endOfDay) {
                    futureOutages.push(outage);
                } else {
                    todayOutages.push(outage);
                }
            }
        });
    });

    // Return an object with 'today' and 'future' keys.
    return {
        today: todayOutages,
        future: futureOutages
    };
}

// ========== Additional Utility Functions for View Generation ==========

/**
 * Slugify a locality name according to the rules:
 * - Convert to lowercase
 * - Remove parentheses and their contents
 * - Replace spaces with hyphens
 * - Remove special characters except hyphens
 * - Trim leading/trailing hyphens
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Get canonical slug for a locality (handles aliases)
 */
export function getLocalitySlug(name: string, mapping: LocalityMapping): string {
    const slug = slugify(name);

    // Check if this slug exists directly
    if (mapping.localities[slug]) {
        return slug;
    }

    // Otherwise, check if this name is an alias of another locality
    for (const [localitySlug, info] of Object.entries(mapping.localities)) {
        if (info.aliases.includes(name)) {
            return localitySlug;
        }
    }

    // If not found, return the generated slug (new locality)
    return slug;
}

/**
 * Get start/end of a specific date in Mauritius timezone
 */
export function getMauritiusDay(date: Date): { startOfDay: Date; endOfDay: Date } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: MAURITIUS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const mauritiusDateStr = formatter.format(date);

    const startOfDay = new Date(`${mauritiusDateStr}T00:00:00.000+04:00`);
    const endOfDay = new Date(`${mauritiusDateStr}T23:59:59.999+04:00`);

    return { startOfDay, endOfDay };
}

/**
 * Get the date string (YYYY-MM-DD) for a given date in Mauritius timezone
 */
export function getMauritiusDateString(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: MAURITIUS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    return formatter.format(date);
}

/**
 * Group outages by date (Mauritius timezone)
 * Returns a Map where keys are YYYY-MM-DD strings and values are arrays of outages
 */
export function groupOutagesByDate(outages: Outage[]): Map<string, Outage[]> {
    const grouped = new Map<string, Outage[]>();

    outages.forEach(outage => {
        if (!outage.from) return;

        const from = new Date(outage.from);
        const dateStr = getMauritiusDateString(from);

        if (!grouped.has(dateStr)) {
            grouped.set(dateStr, []);
        }

        grouped.get(dateStr)!.push(outage);
    });

    return grouped;
}

/**
 * Group outages by locality slug
 */
export function groupOutagesByLocality(
    outages: Outage[],
    mapping: LocalityMapping,
): Map<string, Outage[]> {
    const grouped = new Map<string, Outage[]>();

    outages.forEach(outage => {
        const slug = getLocalitySlug(outage.locality, mapping);

        if (!grouped.has(slug)) {
            grouped.set(slug, []);
        }

        grouped.get(slug)!.push(outage);
    });

    return grouped;
}

/**
 * Group outages by district
 */
export function groupOutagesByDistrict(outages: Outage[]): Map<string, Outage[]> {
    const grouped = new Map<string, Outage[]>();

    outages.forEach(outage => {
        if (!grouped.has(outage.district)) {
            grouped.set(outage.district, []);
        }

        grouped.get(outage.district)!.push(outage);
    });

    return grouped;
}

/**
 * Flatten district-organized data into a single array of outages
 */
export function flattenOutages(data: Record<string, Outage[]>): Outage[] {
    return Object.values(data).flat();
}
