const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync('scratch/yt_mapping.json', 'utf8'));
const filePath = path.join(__dirname, '..', 'src', 'pages', 'WorkoutPlanner.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The exercise library is defined as an array of objects.
// Let's replace the videoUrl in each one if we have a mapping.

for (const [exName, vidId] of Object.entries(mapping)) {
    // Regex to match: { name: 'Barbell Bench Press', ..., videoUrl: '...' }
    // Since properties might be in any order, we can match the specific exercise line
    // Fortunately, the exercises are defined like { name: 'Name', muscles: [...], tips: '...', description: '...', videoUrl: '...' }
    
    // Escape single quotes if necessary
    const safeName = exName.replace(/'/g, "\\'");
    
    // Search for line containing: name: 'safeName'
    // and replace videoUrl: 'something' with videoUrl: 'vidId'
    
    const regex = new RegExp(`({\\s*name:\\s*['"]${safeName}['"].*?videoUrl:\\s*['"])[^'"]*(['"])`, 'g');
    content = content.replace(regex, `$1${vidId}$2`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated WorkoutPlanner.tsx with new video URLs.");
