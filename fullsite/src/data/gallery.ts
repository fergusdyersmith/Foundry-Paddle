// The gallery photo set: 47 frames from the tournament shoots at 8613 N Crawford,
// with the category and alt text written against each one. Consumed by
// src/pages/Gallery.tsx; the files themselves live in public/photos/gallery/.
//
// `w`/`h` are the SOURCE dimensions and exist only to give each tile a correct
// aspect ratio before its image loads, so the grid never reflows as photos
// arrive.

export type GalleryCategory = "The Club" | "Match Play" | "The Community" | "Details";

export type GalleryPhoto = {
  /** Basename, without directory or extension. */
  file: string;
  category: GalleryCategory;
  alt: string;
  w: number;
  h: number;
};

export const PHOTO_BASE = "/photos/gallery";

/**
 * Directory the lightbox pulls from. The asset drop shipped the 800px `thumb/`
 * set only — the 1600px `full/` set was left out of the archive — so the viewer
 * currently shows the same file the grid does. Drop `full/` into
 * public/photos/gallery/ and change this to "full" and the lightbox upgrades
 * on its own.
 */
export const LIGHTBOX_DIR = "thumb";

/**
 * Directory to pass as <Photo dir> for a gallery frame used outside /gallery.
 * Rides the same seam as the lightbox, so dropping in the full set upgrades
 * both at once.
 */
export const GALLERY_IMAGE_DIR = `gallery/${LIGHTBOX_DIR}`;

export const CATEGORIES = ["All", "The Club", "Match Play", "The Community", "Details"] as const;

export type FilterCategory = (typeof CATEGORIES)[number];

export const PHOTOS: GalleryPhoto[] = [
  {
    file: "night-serve-wide",
    category: "The Club",
    alt: "A player serves under the steel trusses of Foundry Padel's warehouse courts",
    w: 1600,
    h: 1067,
  },
  {
    file: "night-courts-panorama",
    category: "The Club",
    alt: "Amber light over the blue courts at Foundry Padel after dark",
    w: 1600,
    h: 1067,
  },
  {
    file: "mezzanine-four-courts",
    category: "The Club",
    alt: "Foundry Padel's four glass courts seen from the mezzanine",
    w: 1600,
    h: 1067,
  },
  {
    file: "adjacent-courts-play",
    category: "The Club",
    alt: "Play underway on adjacent courts inside the converted warehouse",
    w: 1600,
    h: 1067,
  },
  {
    file: "doubles-across-net",
    category: "The Club",
    alt: "Two pairs rally across the net on a glass-walled court",
    w: 1600,
    h: 1067,
  },
  {
    file: "daylight-court-wide",
    category: "The Club",
    alt: "Daylight streams across the courts during an afternoon session",
    w: 1600,
    h: 1067,
  },
  {
    file: "over-the-net-rally",
    category: "The Club",
    alt: "A rally seen from behind the net at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "evening-lights-rally",
    category: "The Club",
    alt: "Court lights come on over an evening rally at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "open-door-daylight",
    category: "The Club",
    alt: "Daylight through the open rollup door at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "court-one",
    category: "The Club",
    alt: "The court 1 marker above Foundry Padel's first glass court",
    w: 1600,
    h: 1067,
  },
  {
    file: "court-from-the-back-glass",
    category: "The Club",
    alt: "A rally seen the length of the court from behind the back glass at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "wide-forehand-reach",
    category: "Match Play",
    alt: "A player stretches wide for a forehand at full extension",
    w: 1600,
    h: 1067,
  },
  {
    file: "forehand-contact",
    category: "Match Play",
    alt: "A player makes contact on a forehand, ball frozen at the paddle",
    w: 1600,
    h: 1067,
  },
  {
    file: "overhead-court-angle",
    category: "Match Play",
    alt: "An overhead view of a player tracking the ball across the blue court",
    w: 1600,
    h: 1067,
  },
  {
    file: "long-shadow-lunge",
    category: "Match Play",
    alt: "A player and their long shadow stretched across the court",
    w: 1600,
    h: 1067,
  },
  {
    file: "overhead-backhand",
    category: "Match Play",
    alt: "A player lunges for a low backhand, seen from above",
    w: 1600,
    h: 1067,
  },
  {
    file: "leaping-smash",
    category: "Match Play",
    alt: "A player leaves the ground for an overhead smash",
    w: 1067,
    h: 1600,
  },
  {
    file: "reach-to-the-glass",
    category: "Match Play",
    alt: "A player reaches for a high ball against the glass back wall",
    w: 1600,
    h: 1067,
  },
  {
    file: "forehand-drive",
    category: "Match Play",
    alt: "A player drives a forehand from mid-court",
    w: 1067,
    h: 1600,
  },
  {
    file: "serve-motion",
    category: "Match Play",
    alt: "A player winds up at the top of the serve motion",
    w: 1066,
    h: 1600,
  },
  {
    file: "overhead-serve",
    category: "Match Play",
    alt: "A player reaches full extension on an overhead",
    w: 1067,
    h: 1600,
  },
  {
    file: "jumping-smash",
    category: "Match Play",
    alt: "A player jumps to attack a high ball at the net",
    w: 1067,
    h: 1600,
  },
  {
    file: "net-volley",
    category: "Match Play",
    alt: "A player sets up for a volley at the net",
    w: 1067,
    h: 1600,
  },
  {
    file: "ready-at-the-net",
    category: "Match Play",
    alt: "A player waits in the ready position at the net",
    w: 1600,
    h: 1067,
  },
  {
    file: "split-step",
    category: "Match Play",
    alt: "A player split-steps as the ball comes back over",
    w: 1600,
    h: 1067,
  },
  {
    file: "low-volley",
    category: "Match Play",
    alt: "A player digs out a low volley at the net cord",
    w: 1600,
    h: 1067,
  },
  {
    file: "crosscourt-drive",
    category: "Match Play",
    alt: "A player drives the ball crosscourt from the back of the court",
    w: 1067,
    h: 1600,
  },
  {
    file: "backhand-defence",
    category: "Match Play",
    alt: "A player sets up a two-handed backhand from the back court",
    w: 1600,
    h: 1067,
  },
  {
    file: "bandeja",
    category: "Match Play",
    alt: "A player lines up a bandeja mid-rally",
    w: 1067,
    h: 1600,
  },
  {
    file: "forehand-against-concrete",
    category: "Match Play",
    alt: "A player meets a forehand in front of the bare concrete wall at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "overhead-reach-in-yellow",
    category: "Match Play",
    alt: "A player stretches up for an overhead with daylight behind them at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "low-dig-backhand",
    category: "Match Play",
    alt: "A player digs out a low backhand near the floor at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "the-toss",
    category: "Match Play",
    alt: "A player releases the ball at the top of the toss, seen from behind, at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "lunging-overhead",
    category: "Match Play",
    alt: "A player lunges under a high ball to play an overhead at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "attacking-the-high-ball",
    category: "Match Play",
    alt: "A player leaves the ground to attack a high ball at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "reaching-for-the-smash",
    category: "Match Play",
    alt: "A player reaches full stretch for a smash under the court lights at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "ready-position-in-daylight",
    category: "Match Play",
    alt: "A player waits in the ready position with the rollup door open behind them at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "eyes-on-the-ball-at-the-net",
    category: "Match Play",
    alt: "A player watches the ball from just behind the net tape at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "swinging-through-a-forehand",
    category: "Match Play",
    alt: "A player swings through a forehand in the back corner of the court at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "overhead-with-partner-beyond",
    category: "Match Play",
    alt: "A player sets up an overhead as their opponents wait beyond the net at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "low-forehand-in-the-corner",
    category: "Match Play",
    alt: "A player bends low for a forehand against the concrete back wall at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "setting-up-the-overhead",
    category: "Match Play",
    alt: "A player turns and lifts the paddle to meet a high ball at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "stretching-for-the-volley",
    category: "Match Play",
    alt: "A player stretches wide for a volley under the warehouse roof at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "winding-up-the-smash",
    category: "Match Play",
    alt: "A player takes the paddle back behind the head to load up a smash at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "airborne-smash",
    category: "Match Play",
    alt: "A player jumps off both feet to hit a smash at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "forehand-down-the-line",
    category: "Match Play",
    alt: "A player drives a forehand down the line past the net at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "low-reach-by-the-open-door",
    category: "Match Play",
    alt: "A player reaches low for the ball beside the open rollup door at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "through-the-glass",
    category: "Match Play",
    alt: "A player mid-swing, seen through the glass wall of the court at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "high-volley-at-the-glass",
    category: "Match Play",
    alt: "A player takes a high volley in front of the glass back wall at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "chasing-the-wide-ball",
    category: "Match Play",
    alt: "A player runs down a ball wide of the court at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "low-backhand-on-the-line",
    category: "Match Play",
    alt: "A player plays a low backhand right on the service line at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "fist-bump-fp-tee",
    category: "The Community",
    alt: "Two members in Foundry Padel gear fist-bump between courts",
    w: 1600,
    h: 1067,
  },
  {
    file: "paddle-tap-four",
    category: "The Community",
    alt: "Four players tap paddles across the net after a match",
    w: 1600,
    h: 1067,
  },
  {
    file: "high-five-net",
    category: "The Community",
    alt: "Players high-five at the net after a league match",
    w: 1600,
    h: 1067,
  },
  {
    file: "group-high-five",
    category: "The Community",
    alt: "Four players high-five over the net at the end of a match",
    w: 1600,
    h: 1067,
  },
  {
    file: "headband-high-five",
    category: "The Community",
    alt: "Two pairs meet at the net with hands raised after a tournament match at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "celebration-arms-up",
    category: "The Community",
    alt: "A player throws her arms up after winning the point",
    w: 1067,
    h: 1600,
  },
  {
    file: "post-match-huddle",
    category: "The Community",
    alt: "Players gather at the net to trade high-fives after a match",
    w: 1600,
    h: 1067,
  },
  {
    file: "coaching-demo",
    category: "The Community",
    alt: "A coach demonstrates a low volley to a player",
    w: 1067,
    h: 1600,
  },
  {
    file: "mixed-doubles-net",
    category: "The Community",
    alt: "Two teammates talk tactics between points",
    w: 1067,
    h: 1600,
  },
  {
    file: "all-ages-forehand",
    category: "The Community",
    alt: "A veteran player lines up a forehand - padel is a game for every age",
    w: 1600,
    h: 1067,
  },
  {
    file: "running-down-the-ball",
    category: "The Community",
    alt: "A player sprints to run down a drop shot",
    w: 1067,
    h: 1600,
  },
  {
    file: "womens-doubles",
    category: "The Community",
    alt: "A player prepares to return serve in a doubles match",
    w: 1600,
    h: 1067,
  },
  {
    file: "drill-overhead-with-basket",
    category: "The Community",
    alt: "A player lines up an overhead during a coaching drill, ball basket courtside at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "low-ready-in-a-drill",
    category: "The Community",
    alt: "A player drops into a low ready position during a drill at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "celebration-with-a-partner",
    category: "The Community",
    alt: "Two partners laugh and raise their paddles after winning a point at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "talking-it-over-at-the-net",
    category: "The Community",
    alt: "Two players lean in over the net tape to talk between points at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "fp-tee-on-court",
    category: "The Community",
    alt: "A member in a Foundry Padel tee waits for the serve on court",
    w: 1067,
    h: 1600,
  },
  {
    file: "point-won",
    category: "The Community",
    alt: "A player throws both arms up after taking the point at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "between-points",
    category: "The Community",
    alt: "A player walks back to the baseline between points at Foundry Padel",
    w: 1067,
    h: 1600,
  },
  {
    file: "talking-through-the-drill",
    category: "The Community",
    alt: "Two players talk through the next drill beside the ball cart at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "paddle-tap-after-the-match",
    category: "The Community",
    alt: "Four players meet at the net to tap paddles after a match at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "ball-at-the-net",
    category: "Details",
    alt: "A padel ball resting against the base of the net",
    w: 1600,
    h: 1067,
  },
  {
    file: "fp-logo-tee",
    category: "Details",
    alt: "The Foundry Padel logo on a player's shirt courtside",
    w: 1600,
    h: 1067,
  },
  {
    file: "racquets-on-the-counter",
    category: "Details",
    alt: "Padel racquets laid out on the pro shop counter at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "net-and-ball",
    category: "Details",
    alt: "A ball comes to rest by the net post on the blue court",
    w: 1600,
    h: 1067,
  },
  {
    file: "shoes-under-the-table",
    category: "Details",
    alt: "Padel shoes tucked under a lounge table between matches at Foundry Padel",
    w: 1600,
    h: 1067,
  },
  {
    file: "fp-green-tee",
    category: "Details",
    alt: "A member in a Foundry Padel tee spins a paddle between games",
    w: 1600,
    h: 1067,
  },
  {
    file: "paddle-through-the-cage",
    category: "Details",
    alt: "A paddle rests against the cage as play continues behind it",
    w: 1600,
    h: 1067,
  },
];
