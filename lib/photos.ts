// Unsplash placeholder photos. Swap these for Mazbien's real photos later
// (drop files in /public and use "/your-photo.jpg"). If a URL ever breaks,
// the <Photo /> component falls back to a colour gradient automatically.
const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

// >>> EDIT HERE: PHOTOS (hero = home page big photo, team = about page, etc.) <<<
export const PHOTOS = {
  hero: u("photo-1522071820081-009f0129c71c", 1400),
  team: u("photo-1519389950473-47ba0277781c"),
  workshop: u("photo-1552664730-d307ca884978"),
  laptops: u("photo-1531482615713-2afd69097998"),
  meeting: u("photo-1517048676732-d65bc937f952"),
  code: u("photo-1498050108023-c5249f4df085"),
  mentor: u("photo-1573496359142-b8d87734a5a2"),
};
