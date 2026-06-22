const fs = require('fs');
const filePath = 'src/app/listing/[id]/page.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldTag = "              <img\n                src={'https://maps.googleapis.com/maps/api/staticmap?center=' + listing.lat + ',' + listing.lng + '&zoom=14&size=600x300&scale=2&maptype=roadmap&markers=color:0x1a1a1a%7C' + listing.lat + ',' + listing.lng + '&key=' + (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')}\n                alt=\"Map location\"\n                className=\"w-full h-full object-cover\"\n              />";

const newTag = "              <img\n                src={'https://maps.googleapis.com/maps/api/staticmap?center=' + listing.lat + ',' + listing.lng + '&zoom=14&size=600x300&scale=2&maptype=roadmap&markers=color:0x1a1a1a%7C' + listing.lat + ',' + listing.lng + '&key=' + (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')}\n                alt=\"Map location\"\n                referrerPolicy=\"no-referrer\"\n                className=\"w-full h-full object-cover bg-gray-100\"\n              />";

if (content.indexOf(oldTag) === -1) {
  console.log('Tag not found');
  process.exit(1);
}

content = content.replace(oldTag, newTag);
fs.writeFileSync(filePath, content);
console.log('Done - added referrerPolicy no-referrer to map image');
