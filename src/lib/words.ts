import type { Difficulty, WordChoice } from './types';
import { normalizeKey } from './normalize';

const EASY_RAW = [
  'cat', 'dog', 'fish', 'bird', 'cow', 'pig', 'horse', 'sheep', 'duck', 'chicken',
  'mouse', 'lion', 'tiger', 'bear', 'elephant', 'monkey', 'penguin', 'owl', 'shark', 'whale',
  'dolphin', 'crab', 'octopus', 'turtle', 'rabbit', 'fox', 'deer', 'wolf', 'kangaroo', 'giraffe',
  'zebra', 'panda', 'koala', 'camel', 'snake', 'frog', 'bee', 'ant', 'spider', 'butterfly',
  'dragon', 'unicorn', 'ghost', 'robot', 'alien', 'snowman', 'sun', 'moon', 'star', 'cloud',
  'rain', 'snow', 'fire', 'rainbow', 'tree', 'flower', 'grass', 'leaf', 'mountain', 'volcano',
  'beach', 'island', 'river', 'lake', 'waterfall', 'apple', 'banana', 'orange', 'grapes', 'strawberry',
  'watermelon', 'lemon', 'carrot', 'potato', 'tomato', 'corn', 'mushroom', 'egg', 'cheese', 'bread',
  'cake', 'cookie', 'pizza', 'burger', 'hot dog', 'fries', 'popcorn', 'ice cream', 'donut', 'coffee',
  'tea', 'milk', 'water', 'juice', 'spoon', 'fork', 'knife', 'plate', 'cup', 'bowl',
  'bottle', 'house', 'door', 'window', 'roof', 'stairs', 'chair', 'table', 'bed', 'sofa',
  'lamp', 'clock', 'key', 'lock', 'mirror', 'sink', 'toilet', 'bathtub', 'towel', 'soap',
  'toothbrush', 'book', 'pencil', 'paper', 'scissors', 'glue', 'ruler', 'backpack', 'umbrella', 'glasses',
  'hat', 'shirt', 'pants', 'dress', 'shoe', 'sock', 'glove', 'ring', 'crown', 'watch',
  'wallet', 'phone', 'laptop', 'camera', 'television', 'radio', 'headphones', 'guitar', 'piano', 'drum',
  'violin', 'trumpet', 'microphone', 'ball', 'balloon', 'kite', 'boat', 'ship', 'car', 'bus',
  'truck', 'train', 'plane', 'helicopter', 'bicycle', 'motorcycle', 'rocket', 'tractor', 'ambulance', 'fire truck',
  'traffic light', 'stop sign', 'bridge', 'castle', 'tent', 'campfire', 'ladder', 'bucket', 'broom', 'hammer',
  'saw', 'screwdriver', 'needle', 'button', 'basket', 'box', 'bag', 'map', 'compass', 'telescope',
  'magnet', 'battery', 'light bulb', 'candle', 'gift', 'ticket', 'flag', 'trophy', 'medal', 'coin',
  'money', 'mask', 'cape', 'sword', 'shield', 'arrow', 'anchor', 'wheel', 'road', 'tunnel',
  'park', 'school', 'hospital', 'library', 'zoo', 'farm', 'barn', 'windmill', 'lighthouse', 'fountain',
  'bench', 'playground', 'swimming pool', 'garden', 'fence', 'mailbox', 'bus stop', 'bakery', 'stadium', 'pyramid',
  'statue', 'snowflake', 'pineapple', 'cherry', 'peach', 'pear', 'pumpkin', 'sandwich', 'taco', 'sushi',
  'pancake', 'waffle', 'lollipop', 'chocolate', 'honey', 'butterfly net', 'fish bowl', 'bird cage', 'dog house', 'tree house',
  // More animals
  'ostrich', 'flamingo', 'peacock', 'parrot', 'pigeon', 'goose', 'swan', 'eagle', 'hawk', 'bat',
  'hamster', 'gerbil', 'pony', 'lamb', 'calf', 'chick', 'kitten', 'puppy', 'goldfish', 'seahorse',
  'jellyfish', 'starfish', 'lobster', 'shrimp', 'snail', 'worm', 'ladybug', 'beetle', 'dragonfly', 'grasshopper',
  'cricket', 'scorpion', 'chameleon', 'lizard', 'crocodile', 'hippopotamus', 'rhinoceros', 'leopard', 'cheetah', 'gorilla',
  'chimpanzee', 'sloth', 'llama', 'alpaca', 'buffalo', 'bison', 'moose', 'seal', 'walrus', 'squirrel',
  'hedgehog', 'raccoon', 'beaver', 'otter', 'skunk', 'mole', 'ferret', 'dinosaur', 'mammoth', 'seashell',
  // Food and drinks
  'peanut', 'walnut', 'almond', 'coconut', 'avocado', 'broccoli', 'cucumber', 'pepper', 'onion', 'garlic',
  'lettuce', 'cabbage', 'peas', 'beans', 'blueberry', 'raspberry', 'mango', 'papaya', 'kiwi', 'melon',
  'plum', 'apricot', 'pomegranate', 'olive', 'pickle', 'jam', 'cereal', 'yogurt', 'pudding', 'pie',
  'cupcake', 'muffin', 'brownie', 'pretzel', 'cracker', 'nachos', 'burrito', 'dumpling', 'noodles', 'spaghetti',
  'rice', 'soup', 'salad', 'steak', 'bacon', 'sausage', 'meatball', 'fish stick', 'bagel', 'toast',
  'croissant', 'lemonade', 'milkshake', 'smoothie', 'hot chocolate', 'soda', 'popsicle', 'marshmallow', 'jellybean', 'caramel',
  'ketchup', 'mustard', 'salt', 'sugar', 'syrup', 'honey jar', 'peanut butter', 'corn dog', 'chicken wing', 'candy cane',
  // Nature and weather
  'hill', 'valley', 'desert', 'jungle', 'forest', 'cave', 'cliff', 'pond', 'stream', 'puddle',
  'glacier', 'iceberg', 'snowball', 'hail', 'thunder', 'lightning', 'storm', 'tornado', 'fog', 'mist',
  'sand', 'pebble', 'rock', 'boulder', 'cactus', 'palm tree', 'pine tree', 'acorn', 'pinecone', 'sprout',
  'vine', 'moss', 'fern', 'bamboo', 'wheat', 'meadow', 'reef', 'lagoon', 'horizon', 'sunrise',
  'sunset', 'planet', 'comet', 'meteor', 'asteroid', 'satellite', 'spaceship', 'astronaut', 'shadow', 'sunbeam',
  // Home and kitchen
  'desk', 'bookshelf', 'dresser', 'wardrobe', 'cabinet', 'drawer', 'rug', 'carpet', 'curtain', 'pillow',
  'blanket', 'mattress', 'crib', 'couch', 'armchair', 'stool', 'fireplace', 'chimney', 'fan', 'heater',
  'vacuum cleaner', 'mop', 'dustpan', 'sponge', 'napkin', 'teapot', 'kettle', 'frying pan', 'cutting board', 'apron',
  'rolling pin', 'whisk', 'ladle', 'tongs', 'grater', 'peeler', 'colander', 'toaster', 'oven mitt', 'dish rack',
  // Bathroom and clothes
  'shower', 'faucet', 'drain', 'plunger', 'razor', 'comb', 'hairbrush', 'shampoo', 'lotion', 'perfume',
  'lipstick', 'nail polish', 'hair clip', 'bath mat', 'laundry basket', 'hoodie', 'sweater', 'jacket', 'coat', 'scarf',
  'mitten', 'beanie', 'tie', 'bow tie', 'belt', 'shorts', 'skirt', 'jeans', 'swimsuit', 'pajamas',
  'slippers', 'boots', 'sneakers', 'sandals', 'uniform', 'tuxedo', 'wedding dress', 'veil', 'purse', 'handbag',
  'necklace', 'bracelet', 'earring', 'sunglasses', 'goggles', 'helmet', 'briefcase', 'keychain', 'padlock', 'doorknob',
  'doorbell', 'newspaper', 'magazine', 'envelope', 'stamp', 'package', 'ribbon', 'zipper', 'safety pin', 'paperclip',
  'rubber band', 'tape dispenser', 'candle holder', 'picture frame', 'vase', 'flower pot', 'bird bath', 'porch swing', 'garden gate', 'lamp post',
  // School, toys and sports
  'crayon', 'marker', 'paintbrush', 'palette', 'easel', 'chalk', 'chalkboard', 'whiteboard', 'notebook', 'textbook',
  'calculator', 'protractor', 'globe', 'atlas', 'dictionary', 'stapler', 'tape', 'clipboard', 'folder', 'pencil case',
  'lunchbox', 'abacus', 'flashcards', 'yo-yo', 'spinning top', 'jump rope', 'hula hoop', 'marbles', 'jigsaw puzzle', 'building blocks',
  'teddy bear', 'doll', 'dollhouse', 'action figure', 'toy train', 'rubber duck', 'bubble wand', 'pinwheel', 'boomerang', 'frisbee',
  'soccer ball', 'basketball', 'baseball', 'tennis ball', 'volleyball', 'football', 'golf ball', 'ping pong paddle', 'badminton racket', 'hockey puck',
  'tennis racket', 'baseball bat', 'ice skates', 'surfboard', 'trampoline', 'punching bag', 'dumbbell', 'treadmill', 'whistle', 'stopwatch',
  // Music and vehicles
  'xylophone', 'flute', 'harmonica', 'banjo', 'accordion', 'harp', 'cello', 'saxophone', 'tambourine', 'jukebox',
  'music note', 'sheet music', 'boombox', 'record player', 'speaker', 'stage', 'spotlight', 'scooter', 'subway', 'tram',
  'monster truck', 'race car', 'police car', 'taxi', 'garbage truck', 'dump truck', 'cement mixer', 'bulldozer', 'excavator', 'crane truck',
  'forklift', 'snowplow', 'food truck', 'ferry', 'speedboat', 'yacht', 'tugboat', 'hovercraft', 'go-kart', 'hot air balloon',
  // Places and people
  'cinema', 'mall', 'supermarket', 'cafe', 'restaurant', 'hotel', 'church', 'temple', 'palace', 'cottage',
  'cabin', 'igloo', 'treehouse', 'garage', 'shed', 'office', 'bookstore', 'toy store', 'pet shop', 'barber shop',
  'post office', 'bank', 'fire station', 'police station', 'harbor', 'pier', 'orchard', 'vineyard', 'baker', 'farmer',
  'painter', 'singer', 'dancer', 'athlete', 'soldier', 'sailor', 'cashier', 'guard', 'janitor', 'waitress',
  // Body and celebrations
  'hand', 'foot', 'arm', 'leg', 'head', 'face', 'eye', 'nose', 'mouth', 'ear',
  'finger', 'thumb', 'toe', 'hair', 'beard', 'mustache', 'eyebrow', 'eyelash', 'smile', 'frown',
  'lip', 'chin', 'cheek', 'forehead', 'neck', 'snow angel', 'snow fort', 'snow globe', 'christmas tree', 'stocking',
  'ornament', 'wreath', 'heart', 'valentine', 'easter egg', 'birthday cake', 'party hat', 'confetti', 'fireworks', 'trophy case',
];

const MEDIUM_RAW = [
  'lighthouse', 'volcano', 'campfire', 'treasure map', 'roller coaster', 'ice cream truck', 'hot air balloon', 'windmill', 'castle', 'dragonfly',
  'jack-o-lantern', 'sandcastle', 'waterfall', 'rainbow', 'telescope', 'microscope', 'paintbrush', 'skateboard', 'bicycle', 'motorcycle',
  'helicopter', 'submarine', 'space shuttle', 'satellite', 'astronaut', 'mermaid', 'pirate ship', 'treasure chest', 'hourglass', 'magnifying glass',
  'typewriter', 'headphones', 'electric guitar', 'grand piano', 'drum kit', 'violin', 'trumpet', 'microphone', 'television', 'laptop',
  'keyboard', 'joystick', 'robot vacuum', 'toaster', 'blender', 'washing machine', 'refrigerator', 'microwave', 'hairdryer', 'toothbrush',
  'umbrella', 'backpack', 'suitcase', 'passport', 'ticket', 'globe', 'mailbox', 'streetlight', 'traffic light', 'fire hydrant',
  'bus stop', 'hospital', 'library', 'museum', 'airport', 'train station', 'greenhouse', 'aquarium', 'movie theater', 'stadium',
  'playground', 'swimming pool', 'parking lot', 'gas station', 'grocery store', 'skyscraper', 'apartment building', 'subway station', 'ferris wheel', 'carousel',
  'circus tent', 'water slide', 'doghouse', 'birdhouse', 'beehive', 'spider web', 'nest', 'cave', 'desert', 'jungle',
  'forest', 'glacier', 'cliff', 'canyon', 'oasis', 'swamp', 'savanna', 'crater', 'meteor', 'galaxy',
  'planet', 'constellation', 'eclipse', 'sunrise', 'sunset', 'thunderstorm', 'tornado', 'hurricane', 'earthquake', 'avalanche',
  'wildfire', 'flood', 'drought', 'fog', 'frost', 'icicle', 'hail', 'breeze', 'shadow', 'reflection',
  'echo', 'gravity', 'friction', 'electricity', 'magnetism', 'prism', 'kaleidoscope', 'mirror maze', 'laser', 'hologram',
  'pixel', 'barcode', 'QR code', 'password', 'fingerprint', 'footprint', 'x-ray', 'skeleton', 'brain', 'heart',
  'lungs', 'stomach', 'eyeball', 'tooth', 'tongue', 'elbow', 'knee', 'shoulder', 'ankle', 'wrist',
  'spine', 'skull', 'bone', 'blood', 'cell', 'DNA', 'virus', 'bacteria', 'vaccine', 'bandage',
  'stethoscope', 'syringe', 'wheelchair', 'crutches', 'dentist', 'surgeon', 'firefighter', 'police officer', 'chef', 'teacher',
  'doctor', 'nurse', 'pilot', 'astronaut', 'magician', 'juggler', 'acrobat', 'clown', 'mime', 'pirate',
  'knight', 'ninja', 'samurai', 'viking', 'cowboy', 'wizard', 'witch', 'fairy', 'elf', 'gnome',
  'giant', 'dwarf', 'ogre', 'troll', 'goblin', 'werewolf', 'vampire', 'zombie', 'mummy', 'genie',
  'phoenix', 'griffin', 'minotaur', 'cyclops', 'centaur', 'pegasus', 'kraken', 'yeti', 'bigfoot', 'scarecrow',
  'wind chime', 'weather vane', 'bird feeder', 'sundial', 'compass rose', 'treasure island', 'volcano eruption', 'solar panel', 'wind turbine', 'water tower',
  'fire escape', 'revolving door', 'elevator', 'escalator', 'lighthouse keeper', 'fishing boat', 'sailboat', 'canoe', 'kayak', 'raft',
  'hot spring', 'geyser', 'quicksand', 'cactus', 'palm tree', 'bonsai tree', 'sunflower', 'rose', 'tulip', 'cherry blossom',
  'mushroom forest', 'venus flytrap', 'coral reef', 'jellyfish', 'seahorse', 'starfish', 'sea turtle', 'pufferfish', 'swordfish', 'anglerfish',
  'chameleon', 'iguana', 'gecko', 'salamander', 'hedgehog', 'porcupine', 'raccoon', 'otter', 'beaver', 'badger',
  'moose', 'bison', 'antelope', 'cheetah', 'leopard', 'jaguar', 'hyena', 'meerkat', 'sloth', 'armadillo',
  'platypus', 'walrus', 'seal', 'narwhal', 'orca', 'hammerhead shark', 'stingray', 'eel', 'piranha', 'clownfish',
  // More occupations
  'architect', 'engineer', 'scientist', 'astronomer', 'biologist', 'chemist', 'geologist', 'veterinarian', 'pharmacist', 'paramedic',
  'lifeguard', 'tour guide', 'flight attendant', 'air traffic controller', 'train conductor', 'taxi driver', 'truck driver', 'mechanic', 'electrician', 'plumber',
  'carpenter', 'welder', 'jeweler', 'watchmaker', 'locksmith', 'tailor', 'florist', 'barista', 'bartender', 'waiter',
  'food critic', 'diplomat', 'politician', 'lawyer', 'judge', 'detective', 'spy', 'bodyguard', 'general', 'fisherman',
  'rancher', 'blacksmith', 'potter', 'sculptor', 'illustrator', 'cartoonist', 'animator', 'photographer', 'journalist', 'editor',
  // More places and landmarks
  'observatory', 'planetarium', 'opera house', 'concert hall', 'art gallery', 'courthouse', 'embassy', 'city hall', 'power plant', 'factory',
  'warehouse', 'department store', 'flea market', 'farmers market', 'food court', 'rooftop', 'balcony', 'basement', 'attic', 'hallway',
  'courtyard', 'terrace', 'lobby', 'bus terminal', 'ferry terminal', 'marina', 'observation deck', 'watchtower', 'clock tower', 'radio tower',
  'watermill', 'drawbridge', 'aqueduct', 'viaduct', 'monorail', 'cable car', 'funicular', 'ski lift', 'chairlift', 'gondola',
  // Nature and geography
  'plateau', 'mesa', 'fjord', 'archipelago', 'atoll', 'delta', 'estuary', 'tributary', 'sand dune', 'salt flat',
  'tundra', 'taiga', 'rainforest', 'mangrove', 'kelp forest', 'tide pool', 'ice shelf', 'crevasse', 'rock slide', 'landslide',
  'sinkhole', 'stalactite', 'stalagmite', 'limestone', 'sandstone', 'granite', 'obsidian', 'fossil', 'amber', 'geode',
  // Science and gadgets
  'test tube', 'beaker', 'flask', 'petri dish', 'periscope', 'barometer', 'thermometer', 'anemometer', 'seismograph', 'circuit board',
  'motherboard', 'processor', 'hard drive', 'USB drive', 'floppy disk', 'vinyl record', 'cassette tape', 'film reel', 'projector', '3D printer',
  'laser pointer', 'remote control', 'game controller', 'arcade machine', 'pinball machine', 'vending machine', 'slot machine', 'cash register', 'security camera', 'satellite dish',
  // Space
  'mission control', 'space station', 'space suit', 'space helmet', 'rocket launch', 'launch pad', 'lunar rover', 'solar flare', 'sunspot', 'asteroid belt',
  'meteor shower', 'shooting star', 'northern lights', 'lunar eclipse', 'solar eclipse', 'full moon', 'crescent moon', 'radio telescope', 'space probe', 'ground control',
  // Fantasy
  'leprechaun', 'pixie', 'sprite', 'nymph', 'siren', 'banshee', 'gargoyle', 'chimera', 'hydra', 'basilisk',
  'wyvern', 'dragon egg', 'wizard hat', 'magic wand', 'crystal ball', 'potion', 'spell book', 'cauldron', 'broomstick', 'flying carpet',
  'magic lamp', 'wishing well', 'enchanted forest', 'fairy tale', 'buried treasure', 'secret passage', 'hidden door', 'labyrinth', 'maze', 'treasure hunt',
  // Food and drink
  'caesar salad', 'club sandwich', 'fish and chips', 'chicken curry', 'beef stew', 'vegetable soup', 'fried rice', 'spring roll', 'ramen bowl', 'poke bowl',
  'ice cream sundae', 'banana split', 'apple pie', 'cherry pie', 'cheesecake', 'tiramisu', 'cotton candy', 'smores', 'picnic basket', 'bento box',
  'charcuterie board', 'afternoon tea', 'dinner party', 'potluck', 'barbecue grill', 'campfire cooking', 'lemonade stand', 'bake sale', 'food festival', 'coffee shop',
  // Music and art
  'trombone', 'tuba', 'clarinet', 'oboe', 'bassoon', 'french horn', 'steel drum', 'bagpipes', 'ukulele', 'double bass',
  'pipe organ', 'harpsichord', 'music stand', 'metronome', 'tuning fork', 'sound wave', 'reverb', 'mixing board', 'vinyl player', 'equalizer',
  // Games and sports
  'chess board', 'checkers', 'dominoes', 'backgammon', 'poker chips', 'playing cards', 'dartboard', 'bowling alley', 'pool table', 'air hockey',
  'foosball', 'table tennis', 'rock climbing', 'bungee jumping', 'skydiving', 'paragliding', 'hang gliding', 'scuba diving', 'snorkeling', 'water skiing',
  'wakeboarding', 'surfing', 'snowboarding', 'skiing', 'ice skating', 'figure skating', 'speed skating', 'curling', 'bobsled', 'snowball fight',
  // More animals
  'wombat', 'dingo', 'cassowary', 'kiwi bird', 'puffin', 'albatross', 'condor', 'vulture', 'falcon', 'snowy owl',
  'barn owl', 'woodpecker', 'kingfisher', 'hummingbird', 'heron', 'stork', 'goldfinch', 'pheasant', 'roadrunner', 'emu',
  'capybara', 'tapir', 'okapi', 'pangolin', 'aardvark', 'mongoose', 'lynx', 'bobcat', 'cougar', 'ocelot',
  'serval', 'caracal', 'wolverine', 'marten', 'mink', 'stoat', 'armadillo', 'anteater', 'meerkat', 'porcupine',
  // Home and decor
  'chandelier', 'candelabra', 'mantelpiece', 'rocking chair', 'hammock', 'bean bag', 'floor lamp', 'lava lamp', 'disco ball', 'neon sign',
  'grandfather clock', 'cuckoo clock', 'poster', 'wall mural', 'houseplant', 'fish tank', 'terrarium', 'bookshelf ladder', 'coat rack', 'shoe rack',
  // Hobbies
  'origami', 'calligraphy', 'pottery wheel', 'knitting', 'crochet', 'embroidery', 'scrapbooking', 'woodworking', 'metal detecting', 'stargazing',
  'birdwatching', 'rock collecting', 'model train', 'model airplane', 'puzzle box', 'escape room', 'obstacle course', 'talent show', 'magic trick', 'street market',
  // Outdoors and seasonal fun
  'street corner', 'crosswalk', 'roundabout', 'parking meter', 'parking garage', 'taxi stand', 'newsstand', 'flower market', 'fish market', 'night market',
  'street vendor', 'food stall', 'farm stand', 'corn maze', 'hayride', 'petting zoo', 'county fair', 'carnival ride', 'fun house', 'bumper cars',
  'haunted house', 'corn field', 'wheat field', 'apple orchard', 'sunflower field', 'pumpkin patch', 'vegetable garden', 'herb garden', 'tree swing', 'rope bridge',
  'zip line', 'camping tent', 'sleeping bag', 'trail map', 'mountain trail', 'scenic overlook', 'picnic table', 'porch light', 'picket fence', 'clothesline',
  'rain barrel', 'wheelbarrow', 'garden hose', 'sprinkler', 'butterfly garden', 'rock garden', 'zen garden', 'hedge maze', 'rose garden', 'rooftop garden',
];

const HARD_RAW = [
  'photosynthesis', 'gravity', 'democracy', 'algorithm', 'black hole', 'time travel', 'parallel universe', 'artificial intelligence', 'social media', 'climate change',
  'recycling', 'evolution', 'imagination', 'nostalgia', 'deja vu', 'procrastination', 'teamwork', 'electricity', 'magnetism', 'ecosystem',
  'biodiversity', 'architecture', 'choreography', 'improvisation', 'interpretation', 'constellation', 'satellite', 'barcode', 'password', 'firewall',
  'encryption', 'streaming', 'podcast', 'influencer', 'memes', 'burnout', 'deadline', 'multitasking', 'networking', 'brainstorm',
  'prototype', 'feedback', 'startup', 'blockchain', 'virtual reality', 'augmented reality', 'machine learning', 'neural network', 'quantum computing', 'open source',
  'cloud storage', 'search engine', 'operating system', 'notifications', 'autocorrect', 'screenshot', 'emoji', 'hashtag', 'livestream', 'subscription',
  'paywall', 'data mining', 'privacy policy', 'terms of service', 'captcha', 'two factor authentication', 'phishing', 'malware', 'ransomware', 'cyberattack',
  'server outage', 'bug report', 'feature creep', 'merge conflict', 'code review', 'deployment', 'rollback', 'uptime', 'downtime', 'bandwidth',
  'latency', 'cache', 'cookie', 'browser history', 'incognito mode', 'bookmark', 'download', 'upload', 'screensaver', 'wallpaper',
  'dark mode', 'light mode', 'airplane mode', 'low battery', 'charging cable', 'wireless charging', 'smart watch', 'fitness tracker', 'noise cancelling', 'surround sound',
  'slow motion', 'time lapse', 'stop motion', 'cliffhanger', 'plot twist', 'spoiler alert', 'happy ending', 'flashback', 'foreshadowing', 'narration',
  'monologue', 'irony', 'sarcasm', 'pun', 'metaphor', 'simile', 'hyperbole', 'onomatopoeia', 'alliteration', 'rhyme',
  'rhythm', 'melody', 'harmony', 'tempo', 'pitch', 'octave', 'chord', 'symphony', 'orchestra', 'conductor',
  'encore', 'applause', 'standing ovation', 'curtain call', 'intermission', 'audition', 'rehearsal', 'costume', 'makeup', 'spotlight',
  'stage fright', 'improv', 'stand up comedy', 'punchline', 'inside joke', 'awkward silence', 'small talk', 'icebreaker', 'elevator pitch', 'job interview',
  'performance review', 'team building', 'trust fall', 'mind map', 'flowchart', 'wireframe', 'mockup', 'minimum viable product', 'pivot', 'scaling',
  'outsourcing', 'automation', 'redundancy', 'efficiency', 'productivity', 'work life balance', 'remote work', 'commute', 'traffic jam', 'rush hour',
  'all nighter', 'caffeine', 'power nap', 'second wind', 'muscle memory', 'gut feeling', 'intuition', 'common sense', 'perfectionism', 'imposter syndrome',
  'writers block', 'eureka moment', 'trial and error', 'cause and effect', 'supply and demand', 'opportunity cost', 'inflation', 'recession', 'monopoly', 'merger',
  'acquisition', 'headquarters', 'franchise', 'brand loyalty', 'word of mouth', 'viral marketing', 'clickbait', 'filter bubble', 'echo chamber', 'misinformation',
  'fact check', 'peer review', 'consensus', 'debate', 'compromise', 'negotiation', 'mediation', 'bureaucracy', 'red tape', 'loophole',
  'fine print', 'contract', 'warranty', 'refund', 'receipt', 'invoice', 'budget', 'savings', 'investment', 'interest rate',
  'mortgage', 'loan', 'debt', 'credit score', 'pension', 'insurance', 'tax return', 'paycheck', 'overtime', 'promotion',
  'resignation', 'sabbatical', 'retirement', 'midlife crisis', 'quarter life crisis', 'peer pressure', 'group project', 'networking event', 'small business', 'customer service',
  'hold music', 'queue', 'appointment', 'reservation', 'cancellation', 'standby', 'layover', 'jet lag', 'souvenir', 'postcard',
  'wanderlust', 'road trip', 'staycation', 'bucket list', 'crowdfunding', 'volunteering', 'fundraiser', 'charity', 'community garden', 'neighborhood watch',
  'recycling bin', 'compost', 'carbon footprint', 'solar power', 'wind energy', 'greenhouse effect', 'ozone layer', 'acid rain', 'deforestation', 'water scarcity',
  'food waste', 'upcycling', 'sustainable fashion', 'fast fashion', 'second hand', 'garage sale', 'antique', 'collector', 'hoarder', 'minimalism',
  // Work and business
  'performance metrics', 'key performance indicator', 'return on investment', 'supply chain', 'quality assurance', 'risk assessment', 'stakeholder', 'shareholder', 'board meeting', 'annual report',
  'quarterly earnings', 'market research', 'focus group', 'target audience', 'brand identity', 'corporate culture', 'office politics', 'water cooler talk', 'mentorship', 'internship',
  'apprenticeship', 'severance package', 'non compete clause', 'notice period', 'exit interview', 'performance bonus', 'cost of living', 'hiring freeze', 'unpaid overtime', 'company retreat',
  // Technology and internet
  'website', 'database', 'version control', 'pull request', 'continuous integration', 'unit test', 'regression test', 'rubber duck debugging', 'technical debt', 'race condition',
  'memory leak', 'infinite loop', 'null pointer', 'kernel panic', 'blue screen of death', 'dark web', 'virtual private network', 'end to end encryption', 'digital footprint', 'data breach',
  'identity theft', 'biometric scan', 'facial recognition', 'voice assistant', 'smart home', 'internet of things', 'quantum cryptography', 'data center', 'cloud computing', 'server farm',
  // Science and abstract
  'entropy', 'relativity', 'quantum mechanics', 'string theory', 'multiverse', 'dark matter', 'dark energy', 'event horizon', 'singularity', 'speed of light',
  'time dilation', 'wormhole', 'teleportation', 'parallel dimension', 'simulation theory', 'butterfly effect', 'chaos theory', 'game theory', 'probability', 'statistics',
  'correlation', 'causation', 'placebo effect', 'confirmation bias', 'cognitive dissonance', 'fight or flight', 'adrenaline rush', 'jamais vu', 'sixth sense', 'mind over matter',
  // Communication
  'body language', 'tone of voice', 'public speaking', 'reading between the lines', 'double meaning', 'play on words', 'cold shoulder', 'silent treatment', 'grey area', 'white lie',
  'half truth', 'white elephant', 'elephant in the room', 'break the ice', 'small world', 'food for thought', 'change of heart', 'fork in the road', 'domino effect', 'ripple effect',
  'chain reaction', 'vicious cycle', 'catch 22', 'double edged sword', 'necessary evil', 'lesser of two evils', 'means to an end', 'slippery slope', 'blurred lines', 'tipping point',
  // Idioms
  'piece of cake', 'hit the books', 'under the weather', 'once in a blue moon', 'let the cat out of the bag', 'spill the beans', 'break a leg', 'cost an arm and a leg', 'bite the bullet', 'hit the nail on the head',
  'on cloud nine', 'down to earth', 'over the moon', 'in hot water', 'at the drop of a hat', 'against the clock', 'back to square one', 'ball is in your court', 'burn the midnight oil', 'burning the candle at both ends',
  // Society and media
  'public opinion', 'mass media', 'propaganda', 'censorship', 'freedom of speech', 'civil rights', 'human rights', 'constitution', 'election campaign', 'opinion poll',
  'landslide victory', 'coalition government', 'veto power', 'political spectrum', 'social ladder', 'class divide', 'equal opportunity', 'social mobility', 'fact checking', 'media literacy',
  // Psychology
  'growth mindset', 'comfort zone', 'analysis paralysis', 'decision fatigue', 'information overload', 'sensory overload', 'brain fog', 'tunnel vision', 'selective memory', 'wishful thinking',
  'self sabotage', 'inner critic', 'pet peeve', 'guilty pleasure', 'mood swing', 'mixed feelings', 'bittersweet', 'sentimental value', 'butterflies in the stomach', 'nervous laughter',
  'goosebumps', 'chill down the spine', 'warm fuzzy feeling', 'peace of mind', 'road rage', 'cabin fever', 'spring fever', 'homesickness', 'mutual respect', 'trust issues',
  // Time and productivity
  'time management', 'daily routine', 'morning person', 'night owl', 'beauty sleep', 'race against time', 'eleventh hour', 'last minute', 'head start', 'learning curve',
  'steep learning curve', 'practice makes perfect', 'quick study', 'shortcut', 'detour', 'pit stop', 'gridlock', 'snooze button', 'dead battery', 'second nature',
  // Sports and competition
  'photo finish', 'underdog story', 'comeback victory', 'hail mary pass', 'slam dunk', 'hat trick', 'own goal', 'personal best', 'record breaking', 'overtime',
  'sudden death', 'penalty shootout', 'championship ring', 'hall of fame', 'rookie season', 'trading deadline', 'free agency', 'salary cap', 'home field advantage', 'team spirit',
  'good sportsmanship', 'friendly rivalry', 'crowd favorite', 'standing room only', 'photo op', 'victory lap', 'podium finish', 'false start', 'starting lineup', 'final whistle',
  // Arts and culture
  'deus ex machina', 'character development', 'world building', 'unreliable narrator', 'red herring', 'jump scare', 'slow burn', 'plot armor', 'fan fiction', 'cult classic',
  'box office flop', 'sleeper hit', 'spin off', 'reboot', 'remake', 'cameo appearance', 'easter egg', 'directors cut', 'bloopers', 'deleted scene',
  'breaking the fourth wall', 'graphic novel', 'comic strip', 'street performer', 'open mic night', 'encore performance', 'dress rehearsal', 'final cut', 'final curtain', 'warm up act',
  // Food and lifestyle
  'secret ingredient', 'family recipe', 'comfort food', 'street food', 'finger food', 'soul food', 'food coma', 'sugar rush', 'brain freeze', 'aftertaste',
  'acquired taste', 'picky eater', 'sweet tooth', 'mouth watering', 'melting pot', 'recipe for disaster', 'half baked idea', 'icing on the cake', 'cherry on top', 'spice of life',
  // Nature and climate
  'global warming', 'renewable energy', 'fossil fuel', 'oil spill', 'melting iceberg', 'rising sea levels', 'extreme weather', 'natural disaster', 'state of emergency', 'evacuation plan',
  'relief effort', 'humanitarian aid', 'sustainability', 'conservation', 'eco friendly', 'reforestation', 'ocean acidification', 'light pollution', 'noise pollution', 'carbon neutral',
  // Life and decisions
  'first impression', 'lightbulb moment', 'train of thought', 'open secret', 'open book', 'clean slate', 'fresh start', 'second chance', 'last resort', 'backup plan',
  'worst case scenario', 'best case scenario', 'silver lining', 'blessing in disguise', 'mixed blessing', 'double whammy', 'win win situation', 'zero sum game', 'fair play', 'common ground',
  'middle ground', 'meeting halfway', 'give and take', 'quid pro quo', 'gentlemens agreement', 'handshake deal', 'leap of faith', 'calculated risk', 'risk reward', 'trial run',
  // Modern internet life
  'screen time', 'doom scrolling', 'infinite scroll', 'notification overload', 'digital detox', 'social battery', 'burnout culture', 'hustle culture', 'side hustle', 'passive income',
  'gig economy', 'remote meeting', 'video call fatigue', 'mute button', 'unstable connection', 'dial up tone', 'autocorrect fail', 'keyboard warrior', 'internet troll', 'anonymous account',
  'online shopping', 'shopping cart', 'checkout page', 'free shipping', 'out of stock', 'customer review', 'delivery driver', 'package tracking', 'return policy', 'money back guarantee',
  'loyalty points', 'discount code', 'flash sale', 'black friday', 'cyber monday', 'bidding war', 'auction house', 'hidden gem', 'hole in the wall', 'secret menu',
];

function dedupe(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const key = normalizeKey(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

export const WORD_POOLS: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: dedupe(EASY_RAW),
  medium: dedupe(MEDIUM_RAW),
  hard: dedupe(HARD_RAW),
};

const ALL_WORDS: WordChoice[] = [
  ...WORD_POOLS.easy.map((word) => ({ word, stars: 1 })),
  ...WORD_POOLS.medium.map((word) => ({ word, stars: 2 })),
  ...WORD_POOLS.hard.map((word) => ({ word, stars: 3 })),
];

/**
 * Pick 3 word choices for the artist. Mixed difficulty gives one easy, one medium
 * and one hard word so the artist can gamble for more artist points.
 */
export function pickWordChoices(
  difficulty: Difficulty,
  used: Set<string>,
  customWords: string[] = [],
): WordChoice[] {
  const custom: WordChoice[] = customWords.map((word) => ({ word, stars: 2 }));
  const usedKeys = new Set(Array.from(used, (word) => normalizeKey(word)));
  const chosen: WordChoice[] = [];
  const chosenKeys = new Set<string>();

  const takeOne = (pool: WordChoice[]): boolean => {
    const available = pool.filter((candidate) => {
      const key = normalizeKey(candidate.word);
      return key && !usedKeys.has(key) && !chosenKeys.has(key);
    });
    if (!available.length) return false;
    const pick = available[Math.floor(Math.random() * available.length)];
    chosen.push(pick);
    chosenKeys.add(normalizeKey(pick.word));
    return true;
  };

  if (difficulty === 'mixed') {
    const tiers: WordChoice[][] = [
      [...WORD_POOLS.easy.map((word) => ({ word, stars: 1 })), ...custom],
      [...WORD_POOLS.medium.map((word) => ({ word, stars: 2 })), ...custom],
      [...WORD_POOLS.hard.map((word) => ({ word, stars: 3 })), ...custom],
    ];
    for (const tier of tiers) takeOne(tier);
  } else {
    const pool =
      difficulty === 'easy'
        ? [...WORD_POOLS.easy.map((word) => ({ word, stars: 1 })), ...custom]
        : [...WORD_POOLS.hard.map((word) => ({ word, stars: 3 })), ...custom];
    for (let i = 0; i < 3; i++) takeOne(pool);
  }

  let guard = 0;
  while (chosen.length < 3 && guard < 20) {
    guard++;
    takeOne(ALL_WORDS);
  }

  if (chosen.length < 3) {
    // Extremely unlikely: the room has exhausted the whole dictionary. Reset the
    // used filter so the game can continue instead of deadlocking.
    usedKeys.clear();
    while (chosen.length < 3) {
      const pick = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
      const key = normalizeKey(pick.word);
      if (chosenKeys.has(key)) {
        if (chosen.length >= ALL_WORDS.length) break;
        continue;
      }
      chosen.push(pick);
      chosenKeys.add(key);
    }
  }

  return chosen.slice(0, 3);
}

export function wordPoolSize(): number {
  return ALL_WORDS.length;
}
