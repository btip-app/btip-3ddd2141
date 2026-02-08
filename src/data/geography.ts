/**
 * Static geographic hierarchy for Africa
 * Region → Country → Subdivision (using local terminology)
 *
 * Designed for cascading filters across Daily Brief, Threat Map,
 * Assets & Routes, and the incident data model.
 */

export interface Subdivision {
  value: string;
  label: string;
}

export interface Country {
  value: string;
  label: string;
  /** Local term for first-level subdivision (e.g. "State", "County") */
  subdivisionTerm: string;
  subdivisions: Subdivision[];
}

export interface Region {
  value: string;
  label: string;
  countries: Country[];
}

export const REGIONS: Region[] = [
  {
    value: "west-africa",
    label: "West Africa",
    countries: [
      {
        value: "nigeria",
        label: "Nigeria",
        subdivisionTerm: "State",
        subdivisions: [
          { value: "lagos", label: "Lagos" },
          { value: "rivers", label: "Rivers" },
          { value: "kano", label: "Kano" },
          { value: "oyo", label: "Oyo" },
          { value: "abuja-fct", label: "Abuja (FCT)" },
          { value: "kaduna", label: "Kaduna" },
          { value: "borno", label: "Borno" },
          { value: "delta", label: "Delta" },
          { value: "enugu", label: "Enugu" },
          { value: "anambra", label: "Anambra" },
          { value: "edo", label: "Edo" },
          { value: "ondo", label: "Ondo" },
          { value: "bayelsa", label: "Bayelsa" },
          { value: "plateau", label: "Plateau" },
          { value: "benue", label: "Benue" },
          { value: "niger", label: "Niger" },
          { value: "zamfara", label: "Zamfara" },
          { value: "sokoto", label: "Sokoto" },
        ],
      },
      {
        value: "ghana",
        label: "Ghana",
        subdivisionTerm: "Region",
        subdivisions: [
          { value: "greater-accra", label: "Greater Accra" },
          { value: "ashanti", label: "Ashanti" },
          { value: "western", label: "Western" },
          { value: "eastern", label: "Eastern" },
          { value: "northern", label: "Northern" },
          { value: "volta", label: "Volta" },
          { value: "central", label: "Central" },
          { value: "upper-east", label: "Upper East" },
          { value: "upper-west", label: "Upper West" },
        ],
      },
      {
        value: "mali",
        label: "Mali",
        subdivisionTerm: "Region",
        subdivisions: [
          { value: "bamako", label: "Bamako" },
          { value: "mopti", label: "Mopti" },
          { value: "gao", label: "Gao" },
          { value: "timbuktu", label: "Timbuktu" },
          { value: "kidal", label: "Kidal" },
          { value: "segou", label: "Ségou" },
          { value: "sikasso", label: "Sikasso" },
          { value: "menaka", label: "Ménaka" },
        ],
      },
    ],
  },
  {
    value: "east-africa",
    label: "East Africa",
    countries: [
      {
        value: "kenya",
        label: "Kenya",
        subdivisionTerm: "County",
        subdivisions: [
          { value: "nairobi", label: "Nairobi" },
          { value: "mombasa", label: "Mombasa" },
          { value: "kisumu", label: "Kisumu" },
          { value: "nakuru", label: "Nakuru" },
          { value: "kiambu", label: "Kiambu" },
          { value: "machakos", label: "Machakos" },
          { value: "kwale", label: "Kwale" },
          { value: "kilifi", label: "Kilifi" },
          { value: "garissa", label: "Garissa" },
          { value: "turkana", label: "Turkana" },
        ],
      },
      {
        value: "ethiopia",
        label: "Ethiopia",
        subdivisionTerm: "Region",
        subdivisions: [
          { value: "addis-ababa", label: "Addis Ababa" },
          { value: "oromia", label: "Oromia" },
          { value: "amhara", label: "Amhara" },
          { value: "tigray", label: "Tigray" },
          { value: "snnpr", label: "SNNPR" },
          { value: "somali", label: "Somali" },
          { value: "afar", label: "Afar" },
          { value: "dire-dawa", label: "Dire Dawa" },
        ],
      },
      {
        value: "somalia",
        label: "Somalia",
        subdivisionTerm: "State",
        subdivisions: [
          { value: "banadir", label: "Banadir (Mogadishu)" },
          { value: "puntland", label: "Puntland" },
          { value: "jubaland", label: "Jubaland" },
          { value: "south-west", label: "South West" },
          { value: "hirshabelle", label: "Hirshabelle" },
          { value: "galmudug", label: "Galmudug" },
          { value: "somaliland", label: "Somaliland" },
        ],
      },
      {
        value: "mozambique",
        label: "Mozambique",
        subdivisionTerm: "Province",
        subdivisions: [
          { value: "maputo", label: "Maputo" },
          { value: "cabo-delgado", label: "Cabo Delgado" },
          { value: "nampula", label: "Nampula" },
          { value: "zambezia", label: "Zambezia" },
          { value: "sofala", label: "Sofala" },
          { value: "gaza", label: "Gaza" },
          { value: "niassa", label: "Niassa" },
        ],
      },
    ],
  },
  {
    value: "southern-africa",
    label: "Southern Africa",
    countries: [
      {
        value: "south-africa",
        label: "South Africa",
        subdivisionTerm: "Province",
        subdivisions: [
          { value: "gauteng", label: "Gauteng" },
          { value: "western-cape", label: "Western Cape" },
          { value: "kwazulu-natal", label: "KwaZulu-Natal" },
          { value: "eastern-cape", label: "Eastern Cape" },
          { value: "limpopo", label: "Limpopo" },
          { value: "mpumalanga", label: "Mpumalanga" },
          { value: "north-west", label: "North West" },
          { value: "free-state", label: "Free State" },
          { value: "northern-cape", label: "Northern Cape" },
        ],
      },
    ],
  },
  {
    value: "north-africa",
    label: "North Africa",
    countries: [
      {
        value: "egypt",
        label: "Egypt",
        subdivisionTerm: "Governorate",
        subdivisions: [
          { value: "cairo", label: "Cairo" },
          { value: "alexandria", label: "Alexandria" },
          { value: "giza", label: "Giza" },
          { value: "luxor", label: "Luxor" },
          { value: "aswan", label: "Aswan" },
          { value: "red-sea", label: "Red Sea" },
          { value: "port-said", label: "Port Said" },
          { value: "suez", label: "Suez" },
          { value: "north-sinai", label: "North Sinai" },
          { value: "south-sinai", label: "South Sinai" },
        ],
      },
      {
        value: "libya",
        label: "Libya",
        subdivisionTerm: "District",
        subdivisions: [
          { value: "tripoli", label: "Tripoli" },
          { value: "benghazi", label: "Benghazi" },
          { value: "misrata", label: "Misrata" },
          { value: "Sabha", label: "Sabha" },
          { value: "sirte", label: "Sirte" },
          { value: "derna", label: "Derna" },
          { value: "zawiya", label: "Zawiya" },
        ],
      },
      {
        value: "sudan",
        label: "Sudan",
        subdivisionTerm: "State",
        subdivisions: [
          { value: "khartoum", label: "Khartoum" },
          { value: "north-darfur", label: "North Darfur" },
          { value: "south-darfur", label: "South Darfur" },
          { value: "west-darfur", label: "West Darfur" },
          { value: "north-kordofan", label: "North Kordofan" },
          { value: "south-kordofan", label: "South Kordofan" },
          { value: "blue-nile", label: "Blue Nile" },
          { value: "red-sea-sd", label: "Red Sea" },
          { value: "kassala", label: "Kassala" },
          { value: "gedaref", label: "Gedaref" },
        ],
      },
    ],
  },
  {
    value: "central-africa",
    label: "Central Africa",
    countries: [
      {
        value: "drc",
        label: "DR Congo",
        subdivisionTerm: "Province",
        subdivisions: [
          { value: "kinshasa", label: "Kinshasa" },
          { value: "north-kivu", label: "North Kivu" },
          { value: "south-kivu", label: "South Kivu" },
          { value: "katanga", label: "Haut-Katanga" },
          { value: "ituri", label: "Ituri" },
          { value: "kasai", label: "Kasaï" },
          { value: "equateur", label: "Équateur" },
          { value: "maniema", label: "Maniema" },
        ],
      },
      {
        value: "cameroon",
        label: "Cameroon",
        subdivisionTerm: "Region",
        subdivisions: [
          { value: "centre", label: "Centre (Yaoundé)" },
          { value: "littoral", label: "Littoral (Douala)" },
          { value: "north-west", label: "North-West" },
          { value: "south-west", label: "South-West" },
          { value: "far-north", label: "Far North" },
          { value: "adamawa", label: "Adamawa" },
          { value: "north-cm", label: "North" },
          { value: "east-cm", label: "East" },
        ],
      },
      {
        value: "car",
        label: "Central African Republic",
        subdivisionTerm: "Prefecture",
        subdivisions: [
          { value: "bangui", label: "Bangui" },
          { value: "ouham", label: "Ouham" },
          { value: "ouham-pende", label: "Ouham-Pendé" },
          { value: "nana-grebizi", label: "Nana-Grébizi" },
          { value: "haute-kotto", label: "Haute-Kotto" },
          { value: "haut-mbomou", label: "Haut-Mbomou" },
        ],
      },
    ],
  },
];

// ─── Helper utilities ────────────────────────────────────────

/** Flat list of region options (for Select dropdowns) */
export const regionOptions = REGIONS.map(r => ({ value: r.value, label: r.label }));

/** Get countries for a given region value */
export function getCountriesForRegion(regionValue: string): Country[] {
  if (regionValue === "all") return REGIONS.flatMap(r => r.countries);
  return REGIONS.find(r => r.value === regionValue)?.countries ?? [];
}

/** Get subdivisions for a given country value */
export function getSubdivisionsForCountry(countryValue: string): Subdivision[] {
  for (const region of REGIONS) {
    const country = region.countries.find(c => c.value === countryValue);
    if (country) return country.subdivisions;
  }
  return [];
}

/** Get the local subdivision term for a country (e.g. "State", "County") */
export function getSubdivisionTerm(countryValue: string): string {
  for (const region of REGIONS) {
    const country = region.countries.find(c => c.value === countryValue);
    if (country) return country.subdivisionTerm;
  }
  return "Subdivision";
}

/** Find which region a country belongs to */
export function getRegionForCountry(countryValue: string): Region | undefined {
  return REGIONS.find(r => r.countries.some(c => c.value === countryValue));
}
