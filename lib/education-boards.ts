export const supportedGradeLevels = ["grade_9", "grade_10", "o_level", "a_level"] as const;

export type SupportedGradeLevel = (typeof supportedGradeLevels)[number];

export type BoardSystemType =
  | "public_bise"
  | "public_secondary_board"
  | "public_university_exam_board"
  | "private_exam_board"
  | "public_open_distance_awarder"
  | "foreign_qab";

export type EducationBoardCatalogueEntry = {
  code: string;
  name: string;
  shortName: string;
  region: string;
  systemType: BoardSystemType;
  gradeLevels: readonly SupportedGradeLevel[];
  sourceUrl: string;
  sortOrder: number;
  legacyNames?: readonly string[];
};

const nationalGrades = ["grade_9", "grade_10"] as const;
const internationalGrades = ["o_level", "a_level"] as const;

/**
 * Maintained from the IBCC forum/registered-QAB directories and the relevant
 * provincial education-board directories. Technical boards and
 * intermediate-only boards are intentionally outside TestBench English v1.
 */
const educationBoardDefinitions = [
  {
    code: "pk_fbise",
    name: "Federal Board of Intermediate and Secondary Education",
    shortName: "FBISE",
    region: "Federal / nationwide",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://www.fbise.edu.pk/introduction.php",
    legacyNames: ["FBISE"],
  },
  {
    code: "pk_pb_bise_bahawalpur",
    name: "Board of Intermediate and Secondary Education Bahawalpur",
    shortName: "BISE Bahawalpur",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_dg_khan",
    name: "Board of Intermediate and Secondary Education Dera Ghazi Khan",
    shortName: "BISE Dera Ghazi Khan",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_faisalabad",
    name: "Board of Intermediate and Secondary Education Faisalabad",
    shortName: "BISE Faisalabad",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_gujranwala",
    name: "Board of Intermediate and Secondary Education Gujranwala",
    shortName: "BISE Gujranwala",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_lahore",
    name: "Board of Intermediate and Secondary Education Lahore",
    shortName: "BISE Lahore",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
    legacyNames: ["BISE Lahore"],
  },
  {
    code: "pk_pb_bise_multan",
    name: "Board of Intermediate and Secondary Education Multan",
    shortName: "BISE Multan",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_rawalpindi",
    name: "Board of Intermediate and Secondary Education Rawalpindi",
    shortName: "BISE Rawalpindi",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
    legacyNames: ["BISE Rawalpindi"],
  },
  {
    code: "pk_pb_bise_sahiwal",
    name: "Board of Intermediate and Secondary Education Sahiwal",
    shortName: "BISE Sahiwal",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_pb_bise_sargodha",
    name: "Board of Intermediate and Secondary Education Sargodha",
    shortName: "BISE Sargodha",
    region: "Punjab",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://hed.punjab.gov.pk/boards",
  },
  {
    code: "pk_kp_bise_abbottabad",
    name: "Board of Intermediate and Secondary Education Abbottabad",
    shortName: "BISE Abbottabad",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_bannu",
    name: "Board of Intermediate and Secondary Education Bannu",
    shortName: "BISE Bannu",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_di_khan",
    name: "Board of Intermediate and Secondary Education Dera Ismail Khan",
    shortName: "BISE Dera Ismail Khan",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_kohat",
    name: "Board of Intermediate and Secondary Education Kohat",
    shortName: "BISE Kohat",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_malakand",
    name: "Board of Intermediate and Secondary Education Malakand",
    shortName: "BISE Malakand",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_mardan",
    name: "Board of Intermediate and Secondary Education Mardan",
    shortName: "BISE Mardan",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_peshawar",
    name: "Board of Intermediate and Secondary Education Peshawar",
    shortName: "BISE Peshawar",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_kp_bise_swat",
    name: "Board of Intermediate and Secondary Education Swat",
    shortName: "BISE Swat",
    region: "Khyber Pakhtunkhwa",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ibcc.edu.pk/ibcc-forum-members/",
  },
  {
    code: "pk_sd_bsek_karachi",
    name: "Board of Secondary Education Karachi",
    shortName: "BSEK Karachi",
    region: "Sindh",
    systemType: "public_secondary_board",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
    legacyNames: ["BISE Karachi"],
  },
  {
    code: "pk_sd_bise_hyderabad",
    name: "Board of Intermediate and Secondary Education Hyderabad",
    shortName: "BISE Hyderabad",
    region: "Sindh",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
  },
  {
    code: "pk_sd_bise_sukkur",
    name: "Board of Intermediate and Secondary Education Sukkur",
    shortName: "BISE Sukkur",
    region: "Sindh",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
  },
  {
    code: "pk_sd_bise_larkana",
    name: "Board of Intermediate and Secondary Education Larkana",
    shortName: "BISE Larkana",
    region: "Sindh",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
  },
  {
    code: "pk_sd_bise_mirpurkhas",
    name: "Board of Intermediate and Secondary Education Mirpurkhas",
    shortName: "BISE Mirpurkhas",
    region: "Sindh",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
  },
  {
    code: "pk_sd_bise_shaheed_benazirabad",
    name: "Board of Intermediate and Secondary Education Shaheed Benazirabad",
    shortName: "BISE Shaheed Benazirabad",
    region: "Sindh",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://universitiesboards.sindh.gov.pk/universitiesinstitutes",
  },
  {
    code: "pk_ba_bbise_quetta",
    name: "Balochistan Board of Intermediate and Secondary Education Quetta",
    shortName: "BBISE Quetta",
    region: "Balochistan",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://bbiseqta.edu.pk/Home/About",
  },
  {
    code: "pk_ajk_bise_mirpur",
    name: "AJK Board of Intermediate and Secondary Education Mirpur",
    shortName: "AJK BISE Mirpur",
    region: "Azad Jammu and Kashmir",
    systemType: "public_bise",
    gradeLevels: nationalGrades,
    sourceUrl: "https://ajkbise.net/SchemeofStudies.php",
  },
  {
    code: "pk_gb_kiu_external",
    name: "Karakoram International University External Examinations",
    shortName: "KIU Examination Board",
    region: "Gilgit-Baltistan",
    systemType: "public_university_exam_board",
    gradeLevels: nationalGrades,
    sourceUrl: "https://examinations.kiu.edu.pk/",
  },
  {
    code: "pk_aku_eb",
    name: "Aga Khan University Examination Board",
    shortName: "AKU-EB",
    region: "Pakistan (private)",
    systemType: "private_exam_board",
    gradeLevels: nationalGrades,
    sourceUrl: "https://examinationboard.aku.edu/about-us/Pages/home.aspx",
  },
  {
    code: "pk_sd_zueb",
    name: "Ziauddin University Examination Board",
    shortName: "ZUEB",
    region: "Pakistan (private)",
    systemType: "private_exam_board",
    gradeLevels: nationalGrades,
    sourceUrl: "https://zueb.edu.pk/",
  },
  {
    code: "pk_aiou",
    name: "Allama Iqbal Open University Secondary School Certificate",
    shortName: "AIOU SSC",
    region: "Pakistan (distance learning)",
    systemType: "public_open_distance_awarder",
    gradeLevels: nationalGrades,
    sourceUrl: "https://www.aiou.edu.pk/secondary-school-certificate-matric",
  },
  {
    code: "intl_cambridge",
    name: "Cambridge International Education",
    shortName: "Cambridge International",
    region: "International qualifications",
    systemType: "foreign_qab",
    gradeLevels: internationalGrades,
    sourceUrl: "https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/",
    legacyNames: ["Cambridge O Level", "Cambridge A Level"],
  },
  {
    code: "intl_city_guilds",
    name: "City & Guilds of London Institute",
    shortName: "City & Guilds",
    region: "International qualifications",
    systemType: "foreign_qab",
    gradeLevels: internationalGrades,
    sourceUrl: "https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/",
  },
  {
    code: "intl_lrn",
    name: "Learning Resource Network",
    shortName: "LRN",
    region: "International qualifications",
    systemType: "foreign_qab",
    gradeLevels: internationalGrades,
    sourceUrl: "https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/",
  },
  {
    code: "intl_oxford_aqa",
    name: "Oxford International AQA Examinations",
    shortName: "OxfordAQA",
    region: "International qualifications",
    systemType: "foreign_qab",
    gradeLevels: internationalGrades,
    sourceUrl: "https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/",
  },
  {
    code: "intl_pearson_edexcel",
    name: "Pearson Education Limited",
    shortName: "Pearson Edexcel",
    region: "International qualifications",
    systemType: "foreign_qab",
    gradeLevels: internationalGrades,
    sourceUrl: "https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/",
  },
] as const satisfies readonly Omit<EducationBoardCatalogueEntry, "sortOrder">[];

export const educationBoardCatalogue: readonly EducationBoardCatalogueEntry[] =
  educationBoardDefinitions.map((board, index) => ({
    ...board,
    sortOrder: (index + 1) * 10,
  }));

export const educationBoardGroups = [...new Set(educationBoardCatalogue.map((board) => board.region))]
  .map((region) => ({
    region,
    boards: educationBoardCatalogue.filter((board) => board.region === region),
  }));

export function findEducationBoard(codeOrLegacyName: string) {
  const normalized = codeOrLegacyName.trim().toLowerCase();
  return educationBoardCatalogue.find((board) =>
    board.code.toLowerCase() === normalized
    || board.shortName.toLowerCase() === normalized
    || board.name.toLowerCase() === normalized
    || board.legacyNames?.some((name) => name.toLowerCase() === normalized),
  );
}
