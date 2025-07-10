import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

//https://iamwebwiz.medium.com/how-to-fix-dirname-is-not-defined-in-es-module-scope-34d94a86694d
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// Define paths to relevant data files
const database =  path.join(__dirname, '../../../', 'database')
const ratemyprofessor = path.join('../py',"ratemyprofessor.json")
const search = path.join(database,"search.json")
const subjects = path.join(database,"subjects.json")
// const output = path.join(database,"courses.txt")

// Mapping dictionaries for decoding codes
const terms = {"10" : "Fall", "20": "Winter", "30": "Summer"}
const daysName = {"M" : "Monday", "T": "Tuesday", "W": "Wednesday", "R" : "Thursday", "F": "Friday"}
const types = {"Lab" : "Laboratory", "Lec" : "Lecture", "WkT" : "Work Term", "WkS" : "Workshop", "Ens" : "Ensemble", "Tut" : "Tutorial", "Ths" : "Thesis", "Int" : "Internship"};

let searchData, subjectData, rmpData
try {
    searchData = JSON.parse(fs.readFileSync(search,"utf-8"))
    subjectData = JSON.parse(fs.readFileSync(subjects,"utf-8"))
    rmpData = JSON.parse(fs.readFileSync(ratemyprofessor,"utf-8"))
}
catch(err){
    console.error("Error Reading JSON files", err)
    process.exit(1)
}

// Build a subject code to department description map
const subjectMap = {}
Object.entries(subjectData).forEach(courseCode => {
    subjectMap[courseCode[1].code] = courseCode[1].description
})

// Final formatted result to be written to file
// const result = []
const jsonCourses = [];
// Iterate through each course
Object.entries(searchData).forEach(([courseCode, info]) => {
    const departmentPrefix = courseCode.slice(0,4)
    const departmentDesc = subjectMap[departmentPrefix] || ""

    const title = info.title || ""
    const level = courseCode[4] + "000"
    const prerequisites = info.prerequisites || []
    const creditHours = info.creditHours != null? info.creditHours : ""
    const description = (info.description).trim().replace(/<[^>]*>/g, '') || ""
    // Handle equivalent course codes in a readable format
    const equivalent = info.equivalent ? terms[info.equivalent.slice(4,6)] + " " + info.equivalent.slice(0,4) + " " + info.equivalent.slice(7,11) + info.equivalent.slice(12,16) : ""

    const termClasses = info.termClasses || []

    const instructorsCombined = []
    const instructorsByTerm = info.instructorsByTerm || {}

    // Combine and deduplicate instructors across all terms
    Object.values(instructorsByTerm).forEach((instrList) => {
        instrList.forEach((instrName) => {
            if(!instructorsCombined.some((i) => i.name === instrName.trim())){
                const ratingInfo = rmpData[instrName.trim()] || null
                instructorsCombined.push({ name: instrName.trim(), rating: ratingInfo })
            }
        })
    })

    // const block = [];

    // Basic course info for json file
    const jsonCourse = {
        course_code: courseCode,
        level: parseInt(level),
        department: departmentDesc,
        title: title,
        credit_hours: creditHours,
        prerequisites: prerequisites,
        equivalent: equivalent || null,
        description: description,
        terms: termClasses.map(tc => ({
            term: `${terms[tc.term.slice(4,6)]} ${tc.term.slice(0,4)}`,
            type: types[tc.type] || "",
            section: tc.section || "",
            days: (tc.days || []).map(day => daysName[day]),
            time: tc.time && tc.time.start && tc.time.end 
            ? `${convertTime(tc.time.start)} - ${convertTime(tc.time.end)}`
            : "",
            location: tc.location || "",
            crn: tc.crn || ""
        })),
        instructors: instructorsCombined.map(instr => {
            const rating = instr.rating;
            return rating
            ? {
                name: `${rating.firstName} ${rating.lastName}`,
                username: instr.name,
                overall_rating: rating.overallRating,
                would_take_again: rating.takeAgainRating,
                difficulty: rating.difficultyLevel,
                num_ratings: rating.numberOfRatings,
                rmp_url: rating.rateMyProfLink
                }
            : { name: instr.name };
        })
        };

    jsonCourses.push(jsonCourse);


//     // Basic course info for text file
//     block.push(`------`);
//     block.push(`Course Code: ${courseCode}`);
//     block.push(`Course Level: ${level}`);
//     if (departmentDesc) block.push(`Department: ${departmentDesc}`);
//     block.push(`Title: ${title}`);
//     block.push(`Credit Hours: ${creditHours} credit hours`);

//     if (prerequisites.length) {
//         block.push(`Prerequisites: ${prerequisites.join(", ")}`);
//     } else {
//         block.push(`Prerequisites: None`);
//     }

//     if (equivalent) {
//         block.push(`Equivalent: ${equivalent}`);
//     } else {
//         block.push(`Equivalent: None`);
//     }

//     block.push(`Description:`);
//     if (description) {
//         description.split("\n").forEach((line) => {
//         block.push(`  ${line.trim()}`);
//         });
//     } else {
//         block.push(`  (No description available)`);
//     }

//     // Course offering info by term, type, etc.
//     if (termClasses.length) {
//         block.push(`Term Offerings:`);
//         termClasses.forEach((tc) => {
//         const term = terms[tc.term.slice(4,6)] + " " + tc.term.slice(0,4) || "";
//         const type = types[tc.type] || "";
//         const section = tc.section || "";
//         const days = (tc.days || []).map(day => daysName[day]).join(", ");
//         let timeString = "";
//         // Convert military to AM/PM time
//         if (tc.time && tc.time.start && tc.time.end) {
//             timeString = `${convertTime(tc.time.start)} - ${convertTime(tc.time.end)}`;
//         }
//         const loc = tc.location || "";
//         const crn = tc.crn || "";

//         let line = `  Term: ${term}`;
//         if (type)       line += ` | Type: ${type}`;
//         if (section)    line += ` | Section: ${section}`;
//         if (days)       line += ` | Days: ${days}`;
//         if (timeString) line += ` | Time: ${timeString}`;
//         if (loc)        line += ` | Location: ${loc}`;
//         if (crn)        line += ` | CRN: ${crn}`;

//         block.push(line);
//         });
//     }
//     // Instructor info, including ratings if available
//     if (instructorsCombined.length) {
//         block.push(`Instructors:`);
//         instructorsCombined.forEach((instr) => {
//         const name   = instr.name || "";
//         const rating = instr.rating;

//         if (rating) {
//             block.push(`  ${rating.firstName} ${rating.lastName} (${name})`);
//             block.push(`    Overall Rating: ${rating.overallRating} out of 5`);
//             block.push(`    Would Take Again: ${rating.takeAgainRating}`);
//             block.push(`    Difficulty: ${rating.difficultyLevel} out of 5`);
//             block.push(`    Number of Ratings: ${rating.numberOfRatings}`);
//             block.push(`    RateMyProfessor Profile: ${rating.rateMyProfLink}`);
//         } else {
//             block.push(`  ${name}`);
//         }
//         });
//     } else {
//         block.push(`Instructors: (none listed)`);
//     }

//     block.push(``);
//     result.push(block.join("\n"));
})

// // Write the final formatted text to courses.json
// const jsonOutput = path.join(database, "courses.json");
// try {
//   fs.writeFileSync(jsonOutput, JSON.stringify(jsonCourses, null, 2), "utf-8");
//   console.log(`Written courses.json to:\n ${jsonOutput}`);
// } catch (err) {
//   console.error("Error writing courses.json:", err);
//   process.exit(1);
// }

// // Write the final formatted text to courses.txt
// try {
//   fs.writeFileSync(output, result.join("\n"), "utf-8");
//   console.log(`Written courses.txt to:\n ${output}`);
// } catch (err) {
//   console.error("Error writing courses.txt:", err);
//   process.exit(1);
// }

// Write the final formatted data to courses.jsonl
const jsonlOutput = path.join(database, "courses.jsonl");
try {
  const jsonlContent = jsonCourses.map(obj => JSON.stringify(obj)).join("\n");
  fs.writeFileSync(jsonlOutput, jsonlContent, "utf-8");
  console.log(`Written courses.jsonl to:\n ${jsonlOutput}`);
} catch (err) {
  console.error("Error writing courses.jsonl:", err);
  process.exit(1);
}

// Helper to convert military (24h) time to 12h AM/PM
function convertTime(time){
    let hour = parseInt(time.slice(0, 2), 10);
    const min = time.slice(2, 4);
    const ampm = hour >= 12 ? 'PM' : 'AM';

    if (hour === 0) {
        hour = 12;
    } else if (hour > 12) {
        hour = hour - 12;
    }

    return `${hour}:${min} ${ampm}`;
}
