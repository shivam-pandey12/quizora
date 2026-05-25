export const seedPackId = "quizora-starter-content";
export const seedVersion = "2026.05.24";

const categoryThemes = [
  {
    name: "Science",
    slug: "science",
    description: "Explore the laws, discoveries, and ideas that shape how the natural world works, from cells to energy.",
    icon: "Atom",
    accent: "from-sky-200 via-stone-100 to-emerald-100",
    featured: true,
    quizzes: ["Science Foundations", "Quick Fire Science", "Science Concept Challenge"],
    tags: ["science", "concepts", "school-ready"],
    facts: [
      ["Cell", "the basic unit of life", "Cells are the smallest structures that carry out life processes."],
      ["Gravity", "the force that pulls objects with mass toward one another", "Gravity explains why objects fall and why planets stay in orbit."],
      ["Evaporation", "the change from liquid to gas at the surface of a liquid", "Evaporation happens when faster-moving particles escape from a liquid."],
      ["Photosynthesis", "the process plants use to make food using light, water, and carbon dioxide", "Photosynthesis stores light energy as chemical energy in plant sugars."],
      ["Atom", "a tiny unit of matter made of particles such as protons, neutrons, and electrons", "Atoms are the building blocks of elements and compounds."],
      ["Ecosystem", "a community of living things interacting with their environment", "An ecosystem includes organisms plus nonliving factors such as air, water, and soil."],
      ["Mixture", "a physical combination of substances that are not chemically joined", "Mixtures can often be separated by physical methods."],
      ["Force", "a push or pull that can change the motion of an object", "Forces can speed objects up, slow them down, or change their direction."],
      ["Energy", "the ability to do work or cause change", "Energy appears in many forms, including light, heat, motion, and stored chemical energy."],
      ["Adaptation", "a trait that helps an organism survive or reproduce in its environment", "Adaptations become common when they improve survival over generations."],
      ["Magnetism", "a force linked to magnetic fields that can attract or repel certain materials", "Magnets affect materials such as iron and can also interact with other magnets."],
      ["Friction", "a force that resists motion between surfaces in contact", "Friction can slow motion and also helps objects grip surfaces."],
      ["Condensation", "the change from gas to liquid when a gas cools", "Cloud droplets form when water vapor condenses in cooler air."],
      ["Nutrient", "a substance an organism needs for growth, energy, or repair", "Nutrients support life processes such as building tissue and releasing energy."],
      ["Observation", "information gathered carefully through the senses or instruments", "Good observations are the starting point for scientific investigation."]
    ]
  },
  {
    name: "Mathematics",
    slug: "mathematics",
    description: "Build number sense, pattern confidence, and clean problem-solving habits through focused math rounds.",
    icon: "Sigma",
    accent: "from-emerald-200 via-stone-100 to-amber-100",
    featured: true,
    quizzes: ["Math Essentials", "Math Speed Drill", "Math Reasoning Challenge"],
    tags: ["math", "numbers", "practice"],
    facts: [
      ["Percent", "a number expressed as parts out of one hundred", "Percent means per hundred, so 25 percent equals 25 out of 100."],
      ["Ratio", "a comparison of two quantities by division", "Ratios show relative size, such as 2:3 for two parts to three parts."],
      ["Prime number", "a whole number greater than 1 with exactly two factors", "A prime number is divisible only by 1 and itself."],
      ["Variable", "a symbol that represents an unknown or changing value", "Variables let equations describe relationships without naming every value."],
      ["Area", "the amount of surface covered by a two-dimensional shape", "Area is measured in square units."],
      ["Perimeter", "the total distance around the edge of a shape", "Perimeter adds the side lengths around a figure."],
      ["Average", "a central value found by dividing a total by the number of items", "The arithmetic mean is the most common kind of average."],
      ["Probability", "a measure of how likely an event is to happen", "Probability ranges from impossible to certain."],
      ["Fraction", "a number that represents part of a whole", "Fractions use a numerator and denominator to show parts of a whole."],
      ["Equation", "a mathematical statement that two expressions are equal", "Equations use an equals sign to connect equivalent expressions."],
      ["Square number", "a number made by multiplying a whole number by itself", "For example, 36 is a square number because 6 times 6 equals 36."],
      ["Decimal", "a base-ten number written with a decimal point", "Decimals represent whole numbers and parts smaller than one."],
      ["Angle", "the figure formed where two rays meet at a point", "Angles are often measured in degrees."],
      ["Coordinate", "a number or pair of numbers that locates a point", "Coordinates describe position on a line or grid."],
      ["Symmetry", "a balanced match between parts of a shape or pattern", "A symmetric figure can be folded or transformed so parts line up."]
    ]
  },
  {
    name: "History",
    slug: "history",
    description: "Understand timelines, civilizations, reforms, and turning points with clear, student-safe history prompts.",
    icon: "Landmark",
    accent: "from-amber-200 via-stone-100 to-orange-100",
    featured: true,
    quizzes: ["History Essentials", "Timeline Sprint", "History Source Challenge"],
    tags: ["history", "timelines", "civilizations"],
    facts: [
      ["Timeline", "an ordered display of events by date or period", "Timelines help compare causes, changes, and sequences across history."],
      ["Civilization", "a complex society with cities, organization, culture, and technology", "Civilizations develop systems for living, working, learning, and governing."],
      ["Primary source", "evidence created during the time being studied", "Letters, inscriptions, diaries, and artifacts can be primary sources."],
      ["Republic", "a system where public matters are handled by representatives or elected leaders", "In a republic, authority is not held by a monarch alone."],
      ["Empire", "a large political unit ruling many peoples or territories", "Empires often expand through conquest, alliances, administration, or trade."],
      ["Archaeology", "the study of past human life through material remains", "Archaeologists examine artifacts, structures, and sites to understand history."],
      ["Renaissance", "a period of renewed interest in art, learning, and classical ideas in Europe", "The Renaissance encouraged new work in science, art, and literature."],
      ["Industrial Revolution", "a major shift from hand production to machine-powered industry", "Industrialization changed work, cities, transport, and economies."],
      ["Constitution", "a written or understood set of basic rules for governing", "A constitution defines powers, rights, and responsibilities."],
      ["Treaty", "a formal agreement between political groups or countries", "Treaties can end conflicts, set borders, or define cooperation."],
      ["Maritime trade", "exchange of goods and ideas by sea routes", "Sea trade connected regions and spread materials, technologies, and cultures."],
      ["Chronicle", "a record of events arranged in the order they happened", "Chronicles preserve sequences of events, though they still require careful interpretation."],
      ["Reform", "a deliberate change intended to improve a system", "Reforms may affect law, education, society, or government."],
      ["Migration", "movement of people from one place to another", "Migration can be caused by opportunity, conflict, environment, or trade."],
      ["Heritage", "cultural traditions, places, and knowledge passed across generations", "Heritage helps communities remember and interpret their past."]
    ]
  },
  {
    name: "Geography",
    slug: "geography",
    description: "Read the planet with confidence through maps, landforms, climate, regions, and human geography.",
    icon: "Map",
    accent: "from-lime-200 via-stone-100 to-sky-100",
    featured: true,
    quizzes: ["Geography Map Sense", "Landforms and Climate Sprint", "Geography Challenge"],
    tags: ["geography", "maps", "earth"],
    facts: [
      ["Latitude", "distance north or south of the Equator measured in degrees", "Latitude lines help describe climate zones and exact positions."],
      ["Longitude", "distance east or west of the Prime Meridian measured in degrees", "Longitude helps locate places and calculate time differences."],
      ["Equator", "the imaginary line around Earth halfway between the poles", "The Equator divides Earth into Northern and Southern Hemispheres."],
      ["Peninsula", "land surrounded by water on three sides", "A peninsula remains connected to a larger landmass on one side."],
      ["Plateau", "a broad area of high, relatively flat land", "Plateaus may form through uplift, lava flows, or erosion."],
      ["Delta", "land formed where a river deposits sediment near its mouth", "Deltas often form fertile lowlands near seas or lakes."],
      ["Monsoon", "a seasonal wind pattern that can bring heavy rainfall", "Monsoons strongly affect farming, water supply, and climate in many regions."],
      ["Basin", "an area where water drains toward a common river, lake, or low point", "Drainage basins connect rainfall, streams, rivers, and landforms."],
      ["Continent", "one of Earth's large continuous land areas", "Continents are major land divisions used in world geography."],
      ["Strait", "a narrow waterway connecting two larger bodies of water", "Straits can be important for shipping and regional movement."],
      ["Glacier", "a large mass of moving ice formed from compacted snow", "Glaciers shape valleys and store fresh water."],
      ["Time zone", "a region that uses the same standard time", "Time zones help coordinate clocks across Earth."],
      ["Urbanization", "growth in the share of people living in towns and cities", "Urbanization changes transport, housing, jobs, and land use."],
      ["Watershed", "land area that drains water into a specific body of water", "Watersheds link land management with water quality."],
      ["Scale", "the relationship between distance on a map and distance in the real world", "Map scale helps convert small map measurements into real distances."]
    ]
  },
  {
    name: "Technology",
    slug: "technology",
    description: "Learn the systems, tools, and product ideas behind modern digital life without jargon overload.",
    icon: "Cpu",
    accent: "from-slate-200 via-stone-100 to-cyan-100",
    featured: false,
    quizzes: ["Technology Timeline", "Digital Systems Sprint", "Technology Thinking Challenge"],
    tags: ["technology", "digital", "systems"],
    facts: [
      ["Algorithm", "a step-by-step method for solving a problem", "Algorithms give computers and people clear instructions to follow."],
      ["Cloud computing", "using remote servers to store, process, or deliver data and services", "Cloud services let apps scale without every user owning the hardware."],
      ["Encryption", "transforming information so only authorized parties can read it", "Encryption protects data during storage and communication."],
      ["Sensor", "a device that detects a condition and turns it into usable data", "Sensors measure things such as motion, light, temperature, or pressure."],
      ["Browser", "software used to access and interact with websites", "Browsers request web pages and render them for users."],
      ["Operating system", "core software that manages hardware and runs applications", "Operating systems coordinate files, memory, devices, and user interfaces."],
      ["Database", "an organized collection of data that can be searched and updated", "Databases help apps store information reliably."],
      ["Network", "connected devices that can exchange data", "Networks allow communication between computers, phones, servers, and other devices."],
      ["Bandwidth", "the amount of data that can be transmitted in a given time", "Higher bandwidth can support faster downloads and smoother streaming."],
      ["Interface", "the point where people or systems interact", "Good interfaces make actions understandable and efficient."],
      ["Automation", "using technology to perform tasks with reduced manual effort", "Automation can improve speed, consistency, and scale."],
      ["Prototype", "an early working model used to test an idea", "Prototypes help teams learn before building a complete product."],
      ["Cybersecurity", "practices that protect systems, networks, and data from digital threats", "Cybersecurity reduces risk from unauthorized access or damage."],
      ["Version control", "a system for tracking changes to files over time", "Version control helps teams review, restore, and collaborate on code."],
      ["Open source", "software whose source code is available for study, use, or improvement", "Open source projects can grow through transparent collaboration."]
    ]
  },
  {
    name: "Space & Astronomy",
    slug: "space-astronomy",
    description: "Travel from the solar system to deep space with clear astronomy ideas and cosmic scale checks.",
    icon: "Orbit",
    accent: "from-indigo-200 via-stone-100 to-sky-100",
    featured: true,
    quizzes: ["Solar System Basics", "Space Explorer Sprint", "Astronomy Challenge"],
    tags: ["space", "astronomy", "solar-system"],
    facts: [
      ["Orbit", "the curved path an object follows around another object in space", "Orbits are shaped by gravity and motion."],
      ["Planet", "a large body that orbits a star and is not itself a star", "Planets reflect light from their star rather than producing starlight like stars."],
      ["Star", "a hot sphere of gas that produces energy through nuclear fusion", "Stars shine because fusion releases enormous energy in their cores."],
      ["Galaxy", "a huge system of stars, gas, dust, and dark matter held by gravity", "The Milky Way is the galaxy that contains our solar system."],
      ["Moon", "a natural object that orbits a planet or dwarf planet", "Moons vary widely in size, surface, and origin."],
      ["Asteroid", "a small rocky object that orbits the Sun", "Many asteroids are found in the asteroid belt between Mars and Jupiter."],
      ["Comet", "an icy body that can form a glowing coma and tail near the Sun", "Solar heating releases gas and dust from comets."],
      ["Light-year", "the distance light travels in one year", "Astronomers use light-years to describe enormous distances between stars."],
      ["Gravity assist", "using a planet's motion and gravity to change a spacecraft's speed or path", "Gravity assists help spacecraft save fuel on long missions."],
      ["Telescope", "an instrument that collects light or other signals from distant objects", "Telescopes reveal details too faint or small for unaided eyes."],
      ["Solar wind", "a stream of charged particles flowing outward from the Sun", "Solar wind can affect magnetic fields and auroras."],
      ["Eclipse", "an event where one object in space blocks light from another", "Solar and lunar eclipses depend on careful alignment."],
      ["Nebula", "a cloud of gas and dust in space", "Some nebulae are regions where stars form."],
      ["Rotation", "the spinning of an object around its own axis", "Earth's rotation causes day and night."],
      ["Revolution", "the movement of an object around another object", "Earth's revolution around the Sun defines a year."]
    ]
  },
  {
    name: "Logical Reasoning",
    slug: "logical-reasoning",
    description: "Sharpen deduction, pattern spotting, constraints, and clean elimination strategies.",
    icon: "Brain",
    accent: "from-violet-200 via-stone-100 to-amber-100",
    featured: false,
    quizzes: ["Logic Arena", "Patterns and Sequences Sprint", "Reasoning Puzzle Set"],
    tags: ["logic", "reasoning", "puzzles"],
    facts: [
      ["Pattern", "a repeated or predictable arrangement", "Recognizing patterns helps predict what may come next."],
      ["Sequence", "items arranged in a specific order", "Sequences can follow arithmetic, geometric, alphabetical, or custom rules."],
      ["Analogy", "a comparison showing a relationship between two pairs", "Analogies test whether the same relationship holds in a new pair."],
      ["Deduction", "reasoning from general rules to a necessary conclusion", "Deduction is strong when the premises are true and the logic is valid."],
      ["Premise", "a statement used as a starting point for reasoning", "Premises support a conclusion in an argument."],
      ["Conclusion", "the claim reached from reasons or evidence", "A conclusion should follow from the premises."],
      ["Syllogism", "a structured argument with two premises and a conclusion", "Syllogisms test formal logical relationships."],
      ["Elimination", "removing impossible options to reach a better answer", "Elimination is useful when direct solving is slow."],
      ["Constraint", "a rule or limit that must be followed", "Constraints narrow the set of possible solutions."],
      ["Matrix", "a grid used to organize information or patterns", "Matrix puzzles often require row, column, and diagonal comparisons."],
      ["Assumption", "an unstated idea accepted as true for reasoning", "Identifying assumptions helps evaluate arguments."],
      ["Counterexample", "an example that disproves a general claim", "One valid counterexample can show that a universal claim is false."],
      ["Parity", "whether a number is odd or even", "Parity reasoning can simplify number and arrangement puzzles."],
      ["Inference", "a reasonable conclusion drawn from evidence", "Inferences go beyond direct statements while staying supported."],
      ["Venn diagram", "overlapping circles used to show relationships among sets", "Venn diagrams make set logic easier to see."]
    ]
  },
  {
    name: "English & Vocabulary",
    slug: "english-vocabulary",
    description: "Strengthen vocabulary, reading clues, tone, and sentence clarity through crisp language prompts.",
    icon: "BookOpenText",
    accent: "from-rose-200 via-stone-100 to-amber-100",
    featured: false,
    quizzes: ["Vocabulary Builder", "English Sprint", "Reading Clues Challenge"],
    tags: ["english", "vocabulary", "reading"],
    facts: [
      ["Synonym", "a word with a similar meaning to another word", "Synonyms help writers avoid repetition and choose precise wording."],
      ["Antonym", "a word with an opposite meaning to another word", "Antonyms make contrasts clear."],
      ["Context clue", "nearby information that helps explain an unfamiliar word", "Readers use context clues to infer meaning without stopping."],
      ["Prefix", "a word part added to the beginning of a word", "Prefixes can change meaning, such as re- for again."],
      ["Suffix", "a word part added to the end of a word", "Suffixes can change meaning or grammar."],
      ["Root word", "the basic part of a word that carries its main meaning", "Understanding roots helps decode related words."],
      ["Idiom", "a phrase whose meaning is not exactly literal", "Idioms must be understood as expressions, not word-by-word."],
      ["Tone", "the writer's attitude toward a subject or audience", "Tone can feel formal, playful, serious, doubtful, or excited."],
      ["Inference", "a conclusion made from clues and evidence in a text", "Inference connects what is written with what is implied."],
      ["Main idea", "the central point a paragraph or passage is about", "Details support the main idea."],
      ["Metaphor", "a direct comparison that says one thing is another", "Metaphors create meaning through comparison without using like or as."],
      ["Simile", "a comparison using like or as", "Similes make descriptions vivid through clear comparisons."],
      ["Homophone", "a word that sounds like another word but has a different meaning", "Homophones such as pair and pear can confuse spelling and meaning."],
      ["Active voice", "a sentence form where the subject performs the action", "Active voice is often direct and clear."],
      ["Concise sentence", "a sentence that expresses an idea without unnecessary words", "Concise writing keeps meaning sharp and readable."]
    ]
  },
  {
    name: "Computer Science",
    slug: "computer-science",
    description: "Practice the foundations of computing, data, programming logic, and internet systems.",
    icon: "Code2",
    accent: "from-cyan-200 via-stone-100 to-indigo-100",
    featured: false,
    quizzes: ["Computer Basics", "Programming Logic Sprint", "Computer Science Challenge"],
    tags: ["computer-science", "programming", "data"],
    facts: [
      ["Binary", "a base-two number system using only 0 and 1", "Computers represent many kinds of information using binary states."],
      ["Bit", "the smallest common unit of digital information", "A bit can represent one of two values, usually 0 or 1."],
      ["Byte", "a group of eight bits", "Bytes are often used to measure memory and file size."],
      ["Loop", "a programming structure that repeats instructions", "Loops help programs perform repeated tasks efficiently."],
      ["Function", "a reusable block of code designed to perform a task", "Functions help organize code and reduce repetition."],
      ["Array", "an ordered collection of values", "Arrays make it easier to store and access related items."],
      ["Boolean", "a value that is either true or false", "Booleans are essential for conditions and decision logic."],
      ["Compiler", "a tool that translates source code into another form a computer can run", "Compilers help turn human-written code into executable instructions."],
      ["Variable", "a named storage location for a value in a program", "Variables let programs remember and reuse information."],
      ["Data structure", "a way of organizing data for efficient use", "Choosing the right data structure can make programs faster and clearer."],
      ["Recursion", "a method where a function calls itself to solve smaller versions of a problem", "Recursion needs a stopping condition to avoid endless calls."],
      ["API", "a defined way for software systems to communicate", "APIs let applications request data or actions from other systems."],
      ["Cache", "temporary storage used to speed up repeated access", "Caches reduce the need to recalculate or reload the same data."],
      ["Protocol", "a shared rule set for communication between systems", "Protocols allow devices and software to exchange information consistently."],
      ["Debugging", "finding and fixing errors in code", "Debugging is a core skill for making software reliable."]
    ]
  },
  {
    name: "Indian Knowledge",
    slug: "indian-knowledge",
    description: "Explore India-focused civics, culture, history, geography, and knowledge traditions with respectful clarity.",
    icon: "Lotus",
    accent: "from-orange-200 via-stone-100 to-emerald-100",
    featured: true,
    quizzes: ["Indian Knowledge Essentials", "India GK Sprint", "Indian Heritage Challenge"],
    tags: ["india", "culture", "civics"],
    facts: [
      ["Constitution of India", "the supreme legal framework that defines government powers and citizen rights", "The Constitution sets the structure and principles of Indian democracy."],
      ["Panchayati Raj", "local self-government in rural India", "Panchayati Raj supports decentralized decision-making at village and local levels."],
      ["Monsoon", "the seasonal wind pattern that brings much of India's rainfall", "The monsoon is important for agriculture and water resources."],
      ["Ayurveda", "a traditional Indian system of health knowledge", "Ayurveda is one of India's long-standing knowledge traditions."],
      ["Yoga", "a discipline involving physical, mental, and breathing practices", "Yoga is widely practiced for fitness, focus, and well-being."],
      ["Classical dance", "a formally recognized Indian dance tradition with codified technique", "Indian classical dances combine movement, music, expression, and storytelling."],
      ["Census", "an official count and survey of population information", "A census helps governments understand population patterns and needs."],
      ["Lok Sabha", "the directly elected lower house of India's Parliament", "The Lok Sabha plays a central role in national lawmaking."],
      ["Rajya Sabha", "the upper house of India's Parliament", "The Rajya Sabha represents states and union territories in Parliament."],
      ["Sanchi Stupa", "a historic Buddhist monument in Madhya Pradesh", "Sanchi is known for its ancient stupa and carved gateways."],
      ["Indus Valley Civilization", "one of the world's early urban civilizations in South Asia", "It is known for planned cities, drainage systems, and craft production."],
      ["Ashoka", "a Mauryan emperor remembered for inscriptions and support of dhamma", "Ashoka's edicts are important historical sources."],
      ["Decimal system", "a place-value number system using ten digits", "Indian mathematical traditions contributed to the development and spread of place-value notation."],
      ["Green Revolution", "a period of agricultural change that increased crop yields", "The Green Revolution involved improved seeds, irrigation, and farming methods."],
      ["National emblem", "the official symbol adapted from the Lion Capital of Ashoka", "The emblem represents the Republic of India in official use."]
    ]
  },
  {
    name: "World Knowledge",
    slug: "world-knowledge",
    description: "Build broad global awareness across institutions, geography, society, and shared challenges.",
    icon: "Globe2",
    accent: "from-blue-200 via-stone-100 to-teal-100",
    featured: false,
    quizzes: ["World Knowledge Warm-Up", "Global Awareness Sprint", "World Systems Challenge"],
    tags: ["world", "global", "general-knowledge"],
    facts: [
      ["United Nations", "an international organization created to support cooperation among countries", "The UN works on peace, development, rights, and humanitarian issues."],
      ["Democracy", "a system where people have a role in choosing leaders or decisions", "Democracy depends on participation, representation, and accountability."],
      ["Currency", "money used as a medium of exchange in an economy", "Currencies help people price goods and services."],
      ["Time zone", "a region that follows the same standard time", "Time zones help coordinate daily life across longitudes."],
      ["World map", "a representation of Earth's surface on a flat surface", "Maps simplify the globe and require scale and projection choices."],
      ["Ocean", "a very large body of salt water", "Oceans influence climate, trade, ecosystems, and weather."],
      ["Continent", "a major landmass of Earth", "Continents are broad geographic divisions used for learning world geography."],
      ["Cultural heritage", "traditions, places, objects, and knowledge valued by communities", "Heritage helps preserve identity and shared memory."],
      ["Public health", "work focused on protecting and improving health across populations", "Public health includes prevention, sanitation, vaccination, and health education."],
      ["Literacy", "the ability to read and write effectively", "Literacy supports learning, work, and civic participation."],
      ["Renewable energy", "energy from sources that naturally replenish", "Sunlight, wind, and flowing water are examples of renewable energy sources."],
      ["International trade", "exchange of goods and services across national borders", "Trade connects economies and can affect jobs, prices, and supply chains."],
      ["Human rights", "basic rights and freedoms considered to belong to all people", "Human rights principles guide laws, institutions, and international agreements."],
      ["Migration", "movement of people from one region or country to another", "Migration can be temporary or permanent and may have many causes."],
      ["Global commons", "shared areas or resources beyond a single nation's control", "The atmosphere and high seas are often discussed as global commons."]
    ]
  },
  {
    name: "Sports Basics",
    slug: "sports-basics",
    description: "Learn core sports ideas such as rules, roles, strategy, fairness, training, and match flow.",
    icon: "Dumbbell",
    accent: "from-red-200 via-stone-100 to-amber-100",
    featured: false,
    quizzes: ["Sports Starter Pack", "Game Rules Sprint", "Sports Strategy Challenge"],
    tags: ["sports", "rules", "fitness"],
    facts: [
      ["Teamwork", "coordinated effort by players working toward a shared goal", "Strong teamwork improves decision-making, spacing, and morale."],
      ["Referee", "an official who enforces rules during a match", "Referees help keep competition fair and organized."],
      ["Offside", "a rule in some sports that limits unfair attacking position", "Offside rules encourage fair play and tactical movement."],
      ["Tie-breaker", "a method used to decide a winner when scores are tied", "Tie-breakers create a clear result without replaying the entire contest."],
      ["Endurance", "the ability to continue effort over time", "Endurance supports performance in long matches or distance events."],
      ["Sprint", "a short race or burst of high-speed effort", "Sprinting emphasizes acceleration, power, and technique."],
      ["Tournament", "a competition with multiple rounds or matches", "Tournaments organize many players or teams toward a final result."],
      ["Fair play", "respectful competition that follows rules and sportsmanship", "Fair play protects trust, safety, and enjoyment."],
      ["Warm-up", "preparation activity before exercise or competition", "A warm-up helps prepare muscles, joints, and focus."],
      ["Strategy", "a planned approach for gaining an advantage", "Sports strategy considers strengths, opponents, rules, and timing."],
      ["Scoreboard", "a display showing points, time, or match status", "Scoreboards keep players and spectators informed."],
      ["Penalty", "a consequence for breaking a rule", "Penalties discourage unfair or unsafe actions."],
      ["Relay", "a race where teammates complete parts in sequence", "Relays depend on speed and smooth transitions."],
      ["Equipment", "special gear used to play or train safely", "Correct equipment supports performance and reduces risk."],
      ["Recovery", "rest and care after effort to help the body adapt", "Recovery supports long-term progress and reduces fatigue."]
    ]
  },
  {
    name: "Movies & Pop Culture",
    slug: "movies-pop-culture",
    description: "Practice media literacy, storytelling terms, and pop-culture basics without gossip or unsafe content.",
    icon: "Clapperboard",
    accent: "from-pink-200 via-stone-100 to-purple-100",
    featured: false,
    quizzes: ["Pop Culture Basics", "Screen Story Sprint", "Media Literacy Challenge"],
    tags: ["movies", "culture", "media"],
    facts: [
      ["Genre", "a category of stories with shared style or subject", "Genres help audiences understand what kind of experience to expect."],
      ["Director", "the person guiding the creative choices of a film or screen project", "Directors coordinate performance, visuals, pacing, and tone."],
      ["Screenplay", "the written script for a film or screen production", "A screenplay includes dialogue, scenes, and action descriptions."],
      ["Soundtrack", "music and audio selections connected with a film or show", "Soundtracks can shape emotion, memory, and pace."],
      ["Animation", "creating the illusion of movement from images or models", "Animation can be hand-drawn, computer-generated, stop-motion, or hybrid."],
      ["Documentary", "a nonfiction film or program focused on real subjects", "Documentaries use evidence, interviews, footage, and narration to explain topics."],
      ["Franchise", "a connected set of media works built around a shared brand or story world", "Franchises often include sequels, spin-offs, or related merchandise."],
      ["Premiere", "the first public showing of a film or production", "A premiere marks the official beginning of public release."],
      ["Review", "a critical response evaluating a media work", "Reviews often discuss story, craft, performance, and audience experience."],
      ["Audience", "the people who watch, listen to, or read a media work", "Creators consider audience expectations and interpretation."],
      ["Adaptation", "a new version of a story in a different form or medium", "Books, plays, comics, and games can be adapted for screen."],
      ["Cameo", "a brief appearance by a known person or character", "Cameos are usually short and often playful."],
      ["Editing", "selecting and arranging shots or material into a finished sequence", "Editing controls rhythm, clarity, and emotional focus."],
      ["Box office", "ticket sales or commercial performance of a film in theaters", "Box office figures measure theatrical revenue, not artistic quality."],
      ["Streaming", "delivering media over the internet without requiring a full download first", "Streaming changed how many audiences access films, shows, and music."]
    ]
  },
  {
    name: "Environment",
    slug: "environment",
    description: "Understand sustainability, ecosystems, resources, and practical Earth-care concepts.",
    icon: "Leaf",
    accent: "from-green-200 via-stone-100 to-cyan-100",
    featured: false,
    quizzes: ["Environment Starter", "Earth and Sustainability Sprint", "Eco Systems Challenge"],
    tags: ["environment", "sustainability", "earth"],
    facts: [
      ["Biodiversity", "the variety of living things in an area or on Earth", "Biodiversity supports stable ecosystems and useful natural processes."],
      ["Conservation", "protecting and carefully managing natural resources", "Conservation helps preserve ecosystems for present and future needs."],
      ["Recycling", "processing used materials so they can become new products", "Recycling can reduce waste and demand for raw materials."],
      ["Composting", "turning organic waste into nutrient-rich material for soil", "Composting returns nutrients to soil and reduces landfill waste."],
      ["Renewable resource", "a resource that can naturally replace itself over time", "Renewable resources must still be managed carefully to avoid overuse."],
      ["Carbon footprint", "the amount of greenhouse gases linked to an activity or product", "A carbon footprint helps compare climate impact."],
      ["Habitat", "the natural home or environment of an organism", "Habitats provide food, shelter, and conditions needed for survival."],
      ["Wetland", "land area where water covers or saturates the soil for long periods", "Wetlands can filter water, store floodwater, and support wildlife."],
      ["Pollination", "the transfer of pollen that helps many plants reproduce", "Pollination supports fruits, seeds, and many food systems."],
      ["Food chain", "a simple path showing how energy moves between organisms", "Food chains begin with producers and continue through consumers."],
      ["Watershed", "land that drains water into a common water body", "Watersheds connect land use with river and lake health."],
      ["Air quality", "the condition of air based on pollutants and health impact", "Good air quality supports human and ecosystem health."],
      ["Sustainability", "meeting current needs while protecting future ability to meet needs", "Sustainability balances environment, society, and resources."],
      ["Native species", "a species that naturally occurs in a region", "Native species often fit local ecosystems through long adaptation."],
      ["Drought", "a long period with unusually low water availability", "Drought affects crops, water supply, ecosystems, and communities."]
    ]
  },
  {
    name: "Business & Startups",
    slug: "business-startups",
    description: "Learn product thinking, customers, markets, money basics, and startup decision-making.",
    icon: "BriefcaseBusiness",
    accent: "from-yellow-200 via-stone-100 to-blue-100",
    featured: false,
    quizzes: ["Startup Basics", "Business Model Sprint", "Founder Thinking Challenge"],
    tags: ["business", "startups", "product"],
    facts: [
      ["Customer", "a person or organization that buys or uses a product or service", "Understanding customers helps teams build useful offerings."],
      ["Product", "something created to solve a problem or satisfy a need", "Products can be physical goods, digital tools, services, or experiences."],
      ["Market", "the group of potential customers and competitors around an offering", "Market understanding helps guide pricing, messaging, and strategy."],
      ["Revenue", "money earned from selling goods or services", "Revenue is income before subtracting costs."],
      ["Cost", "money or resources spent to create or deliver value", "Costs affect pricing, profit, and sustainability."],
      ["Profit", "money left after costs are subtracted from revenue", "Profit indicates whether a business earns more than it spends."],
      ["Prototype", "an early model used to test an idea", "Prototypes help teams learn quickly before building the final version."],
      ["Feedback", "information from users or customers about an experience", "Feedback helps improve products and decisions."],
      ["Brand", "the identity and expectations associated with a product or organization", "A brand includes name, tone, design, trust, and reputation."],
      ["Pitch", "a concise presentation of an idea, product, or plan", "A strong pitch explains the problem, solution, value, and next step."],
      ["Supply", "the amount of a good or service available", "Supply interacts with demand to influence markets."],
      ["Demand", "the desire and ability to buy a good or service", "Demand shows how strongly customers want an offering at a price."],
      ["Break-even", "the point where revenue equals total costs", "At break-even, a business is not making a profit or a loss."],
      ["Cash flow", "movement of money into and out of a business", "Healthy cash flow helps a business pay bills and keep operating."],
      ["MVP", "a minimum viable product used to test core value with users", "An MVP should be small enough to learn quickly while still useful."]
    ]
  },
  {
    name: "Mixed Challenge",
    slug: "mixed-challenge",
    description: "Switch between subjects, styles, and thinking modes in balanced general challenge rounds.",
    icon: "Sparkles",
    accent: "from-amber-200 via-stone-100 to-sky-100",
    featured: false,
    quizzes: ["Classroom GK Starter Pack", "Mixed Brain Battle", "Ultimate Mixed Challenge"],
    tags: ["mixed", "general-knowledge", "challenge"],
    facts: [
      ["Pacific Ocean", "the largest ocean on Earth", "The Pacific Ocean covers more area than any other ocean."],
      ["Cell", "the basic unit of life", "Cells are fundamental to living organisms."],
      ["Prime number", "a whole number greater than 1 with exactly two factors", "Prime numbers are divisible only by 1 and themselves."],
      ["Democracy", "a system where people participate in choosing leaders or decisions", "Democracy relies on participation and representation."],
      ["Photosynthesis", "the process plants use to make food using light", "Photosynthesis supports plant growth and releases oxygen."],
      ["Latitude", "distance north or south of the Equator", "Latitude helps locate places and understand climate zones."],
      ["Algorithm", "a step-by-step method for solving a problem", "Algorithms organize problem-solving into clear instructions."],
      ["Renewable energy", "energy from sources that naturally replenish", "Renewable energy includes sunlight, wind, and flowing water."],
      ["Main idea", "the central point of a passage", "The main idea is supported by details."],
      ["Orbit", "the curved path of one object around another in space", "Orbits depend on gravity and motion."],
      ["Constitution", "a basic set of rules for governing", "A constitution defines powers, rights, and responsibilities."],
      ["Probability", "a measure of how likely an event is", "Probability helps compare uncertainty."],
      ["Habitat", "the natural home of an organism", "Habitats provide resources needed for survival."],
      ["Prototype", "an early model used to test an idea", "Prototypes help teams learn before investing heavily."],
      ["Inference", "a conclusion drawn from evidence", "Inferences should be supported by available clues."]
    ]
  }
];

const thirdDifficulties = ["hard", "hard", "expert", "hard"];
const paidPlanDiscount = {
  discountPercent: 50,
  discountLabel: "50% OFF"
};

function halfOff(originalPriceINR) {
  return {
    originalPriceINR,
    priceINR: Math.floor(originalPriceINR * 0.5),
    ...paidPlanDiscount
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pointValue(difficulty) {
  if (difficulty === "expert") return 4;
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
}

function timeLimit(difficulty) {
  if (difficulty === "expert") return 75;
  if (difficulty === "hard") return 55;
  if (difficulty === "medium") return 40;
  return 25;
}

function option(id, text) {
  return { id, text };
}

function singleQuestion({ quizId, fact, distractors, order, difficulty, promptMode }) {
  const points = pointValue(difficulty);
  const correctId = "a";
  const prompt =
    promptMode === "definition"
      ? `Which concept best matches this description: ${fact.definition}?`
      : `What does ${fact.term} mean in this topic?`;
  const correctText = promptMode === "definition" ? fact.term : fact.definition;
  const wrongTexts = distractors.map((item) => (promptMode === "definition" ? item.term : item.definition));

  return {
    quizId,
    type: "single-choice",
    questionText: prompt,
    options: [option(correctId, correctText), option("b", wrongTexts[0]), option("c", wrongTexts[1]), option("d", wrongTexts[2])],
    correctAnswer: correctId,
    correctAnswers: [],
    explanation: fact.explanation,
    points,
    timeLimitSeconds: timeLimit(difficulty),
    order,
    status: "active",
    imageUrl: ""
  };
}

function multipleQuestion({ quizId, facts, order, difficulty }) {
  const points = pointValue(difficulty);
  return {
    quizId,
    type: "multiple-choice",
    questionText: `Which two terms match these descriptions: ${facts[0].definition}; and ${facts[1].definition}?`,
    options: [
      option("a", facts[0].term),
      option("b", facts[1].term),
      option("c", facts[2].term),
      option("d", facts[3].term)
    ],
    correctAnswer: "",
    correctAnswers: ["a", "b"],
    explanation: `${facts[0].term} means ${facts[0].definition}, and ${facts[1].term} means ${facts[1].definition}.`,
    points,
    timeLimitSeconds: timeLimit(difficulty),
    order,
    status: "active",
    imageUrl: ""
  };
}

function trueFalseQuestion({ quizId, fact, order, difficulty, shouldBeTrue }) {
  const points = pointValue(difficulty);
  const statement = shouldBeTrue
    ? `${fact.term} means ${fact.definition}.`
    : `${fact.term} means ${fact.falseDefinition}.`;
  return {
    quizId,
    type: "true-false",
    questionText: `True or false: ${statement}`,
    options: [option("true", "True"), option("false", "False")],
    correctAnswer: shouldBeTrue ? "true" : "false",
    correctAnswers: [],
    explanation: fact.explanation,
    points,
    timeLimitSeconds: timeLimit(difficulty),
    order,
    status: "active",
    imageUrl: ""
  };
}

function buildQuizQuestions(quizId, facts, difficulty, quizIndex) {
  const withFalseDefinitions = facts.map((fact, index) => ({
    ...fact,
    falseDefinition: facts[(index + 1) % facts.length].definition
  }));
  const questions = [];
  for (let index = 0; index < 4; index += 1) {
    const distractors = [withFalseDefinitions[(index + 1) % 5], withFalseDefinitions[(index + 2) % 5], withFalseDefinitions[(index + 3) % 5]];
    questions.push(singleQuestion({ quizId, fact: withFalseDefinitions[index], distractors, order: questions.length + 1, difficulty, promptMode: "definition" }));
  }
  for (let index = 0; index < 4; index += 1) {
    const distractors = [withFalseDefinitions[(index + 1) % 5], withFalseDefinitions[(index + 2) % 5], withFalseDefinitions[(index + 3) % 5]];
    questions.push(singleQuestion({ quizId, fact: withFalseDefinitions[index], distractors, order: questions.length + 1, difficulty, promptMode: "term" }));
  }
  questions.push(multipleQuestion({ quizId, facts: withFalseDefinitions, order: 9, difficulty }));
  questions.push(trueFalseQuestion({ quizId, fact: withFalseDefinitions[4], order: 10, difficulty, shouldBeTrue: quizIndex % 2 === 0 }));
  return questions;
}

export function getStarterContentPack() {
  const categories = categoryThemes.map((category) => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    accent: category.accent,
    quizCount: 3,
    featured: category.featured,
    status: "active",
    seoTitle: `${category.name} Quizzes | Quizora`,
    seoDescription: category.description,
    seedPackId,
    seedVersion
  }));

  const quizzes = [];
  const questions = [];

  categoryThemes.forEach((category, categoryIndex) => {
    for (let quizIndex = 0; quizIndex < 3; quizIndex += 1) {
      const difficulty = quizIndex === 0 ? "easy" : quizIndex === 1 ? "medium" : thirdDifficulties[categoryIndex % thirdDifficulties.length];
      const title = category.quizzes[quizIndex];
      const slug = slugify(title);
      const quizFacts = category.facts.slice(quizIndex * 5, quizIndex * 5 + 5).map(([term, definition, explanation]) => ({ term, definition, explanation }));
      const quizQuestions = buildQuizQuestions(slug, quizFacts, difficulty, quizIndex);
      const totalPoints = quizQuestions.reduce((sum, question) => sum + question.points, 0);
      const timeLimitSeconds = quizQuestions.reduce((sum, question) => sum + question.timeLimitSeconds, 0);

      quizzes.push({
        title,
        slug,
        shortDescription: `${category.name} practice with clear explanations and a ${difficulty} pace.`,
        description: `${title} is an original Quizora starter quiz for ${category.name.toLowerCase()} practice. ${category.description} It is designed for classroom demos, solo play, live rooms, and confident first-day exploration.`,
        categorySlug: category.slug,
        categoryName: category.name,
        difficulty,
        status: "published",
        visibility: "public",
        thumbnailUrl: "",
        icon: category.icon,
        accent: category.accent,
        visualTheme: category.accent,
        tags: [...category.tags, difficulty],
        estimatedMinutes: Math.max(5, Math.ceil(timeLimitSeconds / 60)),
        questionCount: quizQuestions.length,
        totalPoints,
        timeLimitSeconds,
        isFeatured: category.featured && quizIndex < 1,
        isDailyChallenge: category.slug === "mixed-challenge" && quizIndex === 1,
        playCount: 0,
        averageScore: 0,
        createdBy: "quizora-starter-content",
        ownerId: "quizora-starter-content",
        ownerName: "Quizora Studio",
        ownerType: "admin",
        publishScope: "global",
        reviewStatus: "approved",
        allowedClassIds: [],
        seoTitle: `${title} | Quizora`,
        seoDescription: `${title} is a published ${difficulty} Quizora starter quiz with 10 original questions and answer explanations.`,
        seedPackId,
        seedVersion
      });

      quizQuestions.forEach((question) => {
        questions.push({
          ...question,
          quizSlug: slug,
          categorySlug: category.slug,
          seedPackId,
          seedVersion
        });
      });
    }
  });

  const featuredQuizSlugs = [
    "science-foundations",
    "math-essentials",
    "history-essentials",
    "geography-map-sense",
    "solar-system-basics",
    "indian-knowledge-essentials"
  ];

  const badgeDefinitions = [
    ["first-quiz", "First Quiz Completed", "Completed your first Quizora attempt.", "Trophy", "common", "Milestone", "attempt.completed.first"],
    ["five-quizzes", "5 Quizzes Completed", "Submitted five completed quiz attempts.", "Medal", "common", "Milestone", "attempt.completed.5"],
    ["ten-quizzes", "10 Quizzes Completed", "Built a ten-quiz practice trail.", "Crown", "rare", "Milestone", "attempt.completed.10"],
    ["accuracy-80", "80% Accuracy Club", "Scored at least 80 percent accuracy.", "Target", "common", "Accuracy", "attempt.accuracy.80"],
    ["perfect-score", "Perfect Score", "Earned every available point in a quiz.", "Sparkles", "epic", "Accuracy", "attempt.perfect"],
    ["speed-runner", "Speed Runner", "Finished accurately under the speed target.", "Timer", "rare", "Speed", "attempt.speed"],
    ["category-explorer", "Category Explorer", "Completed quizzes across multiple categories.", "Compass", "rare", "Discovery", "categories.3"],
    ["leaderboard-debut", "Leaderboard Debut", "Posted a leaderboard-eligible result.", "BarChart3", "common", "Leaderboard", "leaderboard.first"],
    ["streak-starter", "Streak Starter", "Started a daily quiz streak.", "Flame", "common", "Streak", "streak.1"],
    ["three-day-streak", "3-Day Streak", "Kept a quiz streak alive for three days.", "Flame", "rare", "Streak", "streak.3"],
    ["seven-day-streak", "7-Day Streak", "Built a full-week quiz rhythm.", "Flame", "epic", "Streak", "streak.7"],
    ["science-starter", "Science Starter", "Completed a Science quiz.", "Atom", "common", "Category", "category.science.completed"],
    ["math-sprinter", "Math Sprinter", "Completed a Mathematics quiz with steady pace.", "Sigma", "rare", "Category", "category.mathematics.completed"],
    ["live-room-debut", "Live Room Debut", "Completed a live room for the first time.", "DoorOpen", "common", "Rooms", "room.completed.first"],
    ["quick-match-player", "Quick Match Player", "Played a quick match.", "RadioTower", "common", "Matchmaking", "quickmatch.played"],
    ["classroom-learner", "Classroom Learner", "Submitted a classroom assignment.", "GraduationCap", "common", "Classroom", "assignment.submitted"],
    ["challenge-accepted", "Challenge Accepted", "Opened or completed a daily challenge.", "Sparkles", "common", "Challenge", "daily.started"],
    ["space-explorer", "Space Explorer", "Completed a Space and Astronomy quiz.", "Orbit", "rare", "Category", "category.space.completed"],
    ["logic-warrior", "Logic Warrior", "Completed a Logical Reasoning quiz.", "Brain", "rare", "Category", "category.logic.completed"],
    ["vocabulary-builder", "Vocabulary Builder", "Completed an English and Vocabulary quiz.", "BookOpenText", "common", "Category", "category.english.completed"],
    ["history-hunter", "History Hunter", "Completed a History quiz.", "Landmark", "common", "Category", "category.history.completed"],
    ["eco-learner", "Eco Learner", "Completed an Environment quiz.", "Leaf", "common", "Category", "category.environment.completed"],
    ["premium-scholar", "Premium Scholar", "Unlocked a premium Quizora learning workflow.", "Crown", "legendary", "Premium", "premium.active"],
    ["trusted-result", "Verified Result", "Completed a server-scored trusted quiz attempt.", "ShieldCheck", "rare", "Trust", "attempt.trusted"]
  ].map(([id, name, description, icon, rarity, category, conditionKey], index) => ({
    id,
    name,
    description,
    icon,
    rarity,
    category,
    conditionKey,
    isActive: true,
    sortOrder: index + 1,
    seedPackId,
    seedVersion
  }));

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "A generous starter plan for browsing, basic quiz play, leaderboards, and limited live rooms.",
      bestFor: "Players exploring Quizora",
      priceINR: 0,
      billingType: "free",
      durationDays: 0,
      currency: "INR",
      features: ["rooms.create", "matchmaking.quickMatch"],
      limits: { maxCreatedRooms: 3, maxQuickMatchesPerDay: 5, maxClasses: 1, maxStudentsPerClass: 15, maxAssignments: 4, maxCreatorQuizzes: 3, maxExportsPerMonth: 0 },
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    },
    {
      id: "plus",
      name: "Plus",
      description: "Unlock richer solo progress, more live-room play, quick matches, and premium profile touches.",
      bestFor: "Active quiz players",
      ...halfOff(199),
      billingType: "monthly-pass",
      durationDays: 30,
      currency: "INR",
      features: ["solo.unlimitedAttempts", "rooms.create", "rooms.largerRooms", "rooms.botFill", "matchmaking.quickMatch", "analytics.advancedProgress", "profile.premiumThemes"],
      limits: { maxCreatedRooms: 40, maxQuickMatchesPerDay: 50, maxClasses: 1, maxStudentsPerClass: 15, maxAssignments: 4, maxCreatorQuizzes: 3, maxExportsPerMonth: 2 },
      isActive: true,
      isFeatured: true,
      sortOrder: 1
    },
    {
      id: "creator",
      name: "Creator",
      description: "Create class-use quiz drafts, manage private learning content, and review creator analytics.",
      bestFor: "Quiz creators and tutors",
      ...halfOff(499),
      billingType: "monthly-pass",
      durationDays: 30,
      currency: "INR",
      features: ["solo.unlimitedAttempts", "rooms.create", "rooms.largerRooms", "creator.createQuizzes", "creator.privateQuizzes", "creator.analytics", "analytics.advancedProgress", "classroom.exports"],
      limits: { maxCreatedRooms: 80, maxQuickMatchesPerDay: 80, maxClasses: 5, maxStudentsPerClass: 40, maxAssignments: 40, maxCreatorQuizzes: 40, maxExportsPerMonth: 20 },
      isActive: true,
      isFeatured: false,
      sortOrder: 2
    },
    {
      id: "classroom",
      name: "Classroom",
      description: "Expand teacher workflows with larger classes, assignments, analytics, exports, and class rooms.",
      bestFor: "Teachers and learning cohorts",
      ...halfOff(999),
      billingType: "monthly-pass",
      durationDays: 30,
      currency: "INR",
      features: ["solo.unlimitedAttempts", "rooms.create", "rooms.largerRooms", "rooms.botFill", "creator.createQuizzes", "creator.privateQuizzes", "creator.analytics", "classroom.createClasses", "classroom.assignments", "classroom.exports", "classroom.analytics", "analytics.advancedProgress"],
      limits: { maxCreatedRooms: 160, maxQuickMatchesPerDay: 100, maxClasses: 20, maxStudentsPerClass: 120, maxAssignments: 200, maxCreatorQuizzes: 100, maxExportsPerMonth: 100 },
      isActive: true,
      isFeatured: false,
      sortOrder: 3
    }
  ].map((plan) => ({ ...plan, seedPackId, seedVersion }));

  return {
    seedPackId,
    seedVersion,
    categories,
    quizzes,
    questions,
    featured: {
      featuredQuizSlugs,
      featuredCategorySlugs: categoryThemes.filter((category) => category.featured).map((category) => category.slug),
      heroQuizSlug: "mixed-brain-battle",
      dailyChallengeQuizSlug: "mixed-brain-battle"
    },
    badgeDefinitions,
    plans
  };
}
