// Learning Center content: paths by role, technology primers, the glossary and
// the methods behind the numbers. Written content, not data. Primer makers are
// slugs in COMPANIES, so their revenue growth comes live from SEC filings; they
// are suppliers in the app that make the part, not Avnet's line card.

export type Role = "seller" | "fae" | "pm" | "leader";

export const ROLES: { id: Role; label: string }[] = [
  { id: "seller", label: "Seller" },
  { id: "fae", label: "FAE" },
  { id: "pm", label: "Product manager" },
  { id: "leader", label: "Sales leader" },
];

export interface Step {
  page: string;
  href: string;
  why: string;
}

export const PATHS: Record<Role, Step[]> = {
  seller: [
    { page: "Start Here", href: "/start", why: "Your week in one page: what changed and where to go next." },
    { page: "Market News", href: "/news", why: "Stories with a line on why each matters to a customer." },
    { page: "Company Profiles", href: "/network", why: "A supplier or customer at a glance before a call." },
    { page: "QBR Prep", href: "/tools/qbr", why: "A brief for the meeting, built from the profile, news and the cycle." },
    { page: "Technology primers", href: "/learn#primers", why: "What a part is, where it's used and what to ask." },
  ],
  fae: [
    { page: "Technology primers", href: "/learn#primers", why: "The parts you design in, and the questions that open a design." },
    { page: "Design Pipeline", href: "/design-pipeline", why: "Registrations from submission to billing, and what has stalled." },
    { page: "Company Profiles", href: "/network", why: "The supplier's results and what management said about demand." },
    { page: "Line Cards", href: "/line-cards", why: "Who else carries a supplier, and recent franchise moves." },
    { page: "Supply Chain", href: "/supply-chain", why: "Lead times and supply before you commit a customer to a part." },
  ],
  pm: [
    { page: "Market Share", href: "/market-share", why: "Avnet's share by segment, supplier and region, and how sure it is." },
    { page: "Code Mapping", href: "/tools/mapping", why: "How product codes map to market categories, and what needs review." },
    { page: "Supply Chain", href: "/supply-chain", why: "Lead times, prices and what suppliers say about allocation." },
    { page: "Line Cards", href: "/line-cards", why: "Coverage, overlap and white space across distributors." },
    { page: "Quarterly Earnings", href: "/earnings", why: "Each supplier's quarter, and its group's median for comparison." },
  ],
  leader: [
    { page: "Start Here", href: "/start", why: "The numbers that matter this week." },
    { page: "Performance Tracker", href: "/performance", why: "Billings, bookings, backlog and the regions behind them." },
    { page: "Customers & End Markets", href: "/customers", why: "Which markets drive growth, and whether demand is behind it." },
    { page: "Market Cycle", href: "/cycle", why: "Where the industry is in the cycle, stage by stage." },
    { page: "Avnet vs Arrow", href: "/competitive", why: "The head-to-head, with talking points." },
  ],
};

export interface Primer {
  slug: string;
  name: string;
  /** One line for the grid. */
  summary: string;
  /** Alt text for the illustration. */
  alt: string;
  whatItIs: string;
  uses: { name: string; detail: string }[];
  questions: string[];
  /** Company slugs from COMPANIES. */
  makers: string[];
  /** Glossary terms to show beside the primer. */
  related: string[];
}

export const PRIMERS: Primer[] = [
  {
    slug: "microcontrollers",
    name: "Microcontrollers",
    summary: "A small computer on one chip that runs the embedded software in most electronic products.",
    alt: "Line drawing of a square microcontroller package with pads on each side",
    whatItIs:
      "A microcontroller (MCU) puts a processor core, memory and peripherals such as timers, converters and communication ports on one chip, so a product can run its control software without separate parts. They are sorted by core width (8, 16 or 32 bits), by memory and by the peripherals they carry, and most new designs use 32-bit Arm cores. Once an MCU is designed in, its software ties the product to that family for years.",
    uses: [
      { name: "Industrial control", detail: "motor drives, sensors, programmable controllers and meters" },
      { name: "Automotive", detail: "body electronics, lighting, battery management and small control units" },
      { name: "Consumer and appliances", detail: "remote controls, white goods, toys and power tools" },
      { name: "Connected devices", detail: "wireless MCUs for smart home, wearables and asset trackers" },
    ],
    questions: [
      "Which core and family is the current design on, and how much of the software would move with it?",
      "What memory and peripherals does the next version need, and is the current part running out of either?",
      "Does the product need wireless, security or functional safety certification?",
      "What volumes and lifetime does the programme need, and is a second source required?",
      "Which development tools and boards does the team already use?",
    ],
    makers: ["microchip", "nxp", "texas-instruments", "silicon-labs"],
    related: ["Design registration (DRMS)", "Lead time"],
  },
  {
    slug: "sic-mosfets",
    name: "SiC MOSFETs",
    summary: "Power switches made of silicon carbide that waste less energy at high voltage than silicon.",
    alt: "Line drawing of a TO-247 power transistor with three leads",
    whatItIs:
      "A silicon carbide (SiC) MOSFET is a power transistor that switches high voltages with lower losses than silicon devices, so designs run cooler, smaller and more efficiently. SiC is a wide-bandgap material, which lets the device block more voltage in a thinner layer and run at higher temperatures. They come as discrete packages such as TO-247 or as modules, usually rated 650 V to 1,700 V.",
    uses: [
      { name: "Electric vehicles", detail: "traction inverters and on-board chargers, especially on 800 V platforms" },
      { name: "Charging", detail: "DC fast chargers" },
      { name: "Renewables and storage", detail: "solar inverters and battery storage converters" },
      { name: "Industrial", detail: "motor drives, power supplies and uninterruptible power" },
    ],
    questions: [
      "What bus voltage does the power stage run at, and is it moving from 400 V to 800 V?",
      "What switching frequency and efficiency is the design aiming for?",
      "Discrete packages or power modules, and what does the thermal design allow?",
      "Which gate driver and protection scheme will be used?",
      "What qualification does the product need (automotive or industrial), and when does production start?",
    ],
    makers: ["wolfspeed", "onsemi", "microchip"],
    related: ["Lead time", "Book-to-bill"],
  },
  {
    slug: "mlccs",
    name: "MLCCs",
    summary: "Tiny ceramic capacitors, used by the hundreds on every board to smooth and filter power.",
    alt: "Line drawing of three chip capacitors, one cut open to show stacked layers",
    whatItIs:
      "A multilayer ceramic capacitor (MLCC) stacks hundreds of thin ceramic and metal layers in a chip a millimetre or two long. They store a small charge close to the chips they serve, steadying supply rails and filtering noise. They are chosen by capacitance, voltage, size (such as 0402 or 0603) and dielectric (such as C0G or X7R); a smartphone uses around a thousand, an electric vehicle many thousands.",
    uses: [
      { name: "Power rails", detail: "decoupling next to processors, memory and FPGAs" },
      { name: "Automotive", detail: "every control unit, with automotive-grade parts" },
      { name: "Communications", detail: "filtering in radios, base stations and network equipment" },
      { name: "Consumer", detail: "phones, laptops and wearables, where size matters most" },
    ],
    questions: [
      "Which sizes and dielectrics does the bill of materials use most, and are any on long lead times?",
      "Are any parts single-sourced, and can a second source be qualified?",
      "Does the design need automotive-grade (AEC-Q200) parts?",
      "Is the board moving to smaller case sizes to save space?",
      "How much buffer stock does the customer hold, and how does it plan for allocation?",
    ],
    makers: ["vishay"],
    related: ["IP&E", "Lead time"],
  },
  {
    slug: "connectors",
    name: "Connectors",
    summary: "The parts that join boards, cables and modules, chosen for current, speed and the environment.",
    alt: "Line drawing of a board-to-board connector plug and receptacle",
    whatItIs:
      "A connector joins two parts of a system so they can be assembled, serviced or replaced: board to board, wire to board, cable to cable or to the outside world. Each is chosen by pitch, current, signal speed, mating cycles and how it holds up to vibration, heat and moisture. Connectors are usually specified early and stay for the product's life, so they are a long-running line of business once won.",
    uses: [
      { name: "Automotive", detail: "wire harnesses, sensors and high-voltage battery connections" },
      { name: "Data centre", detail: "high-speed board-to-board, backplane and cable assemblies" },
      { name: "Industrial", detail: "circular and rugged connectors for machines and controls" },
      { name: "Consumer and computing", detail: "USB, card edge and flexible circuit connectors" },
    ],
    questions: [
      "What signals and currents pass through the connection, and at what speed?",
      "What does the environment demand: vibration, sealing, temperature?",
      "How many mating cycles does the product need over its life?",
      "Is the design locked to a part number, or can an equivalent be offered?",
      "Does the customer buy cable assemblies, or build them?",
    ],
    makers: ["amphenol", "te-connectivity", "bel-fuse"],
    related: ["IP&E", "Franchise agreement"],
  },
  {
    slug: "fpgas",
    name: "FPGAs",
    summary: "Chips whose logic is programmed after manufacture, for designs that need custom hardware without a custom chip.",
    alt: "Line drawing of a ball grid array chip with a grid of logic blocks",
    whatItIs:
      "A field-programmable gate array (FPGA) is a chip of configurable logic blocks and connections that engineers program after it is made, so one part can act as custom hardware. They suit designs that need fast parallel processing, unusual interfaces, or the ability to change after launch, in volumes too small for a custom chip. Families range from small, low-power devices to large ones with processors and high-speed transceivers built in.",
    uses: [
      { name: "Communications", detail: "wireless and wired network equipment" },
      { name: "Industrial and vision", detail: "machine vision, motor control and test equipment" },
      { name: "Aerospace and defence", detail: "radar, signal processing and radiation-tolerant designs" },
      { name: "Data centre", detail: "network acceleration and interface bridging" },
    ],
    questions: [
      "What does the FPGA do in the design: interfaces, processing, or both?",
      "How much logic, memory and transceiver speed does it need?",
      "Which design tools does the team use, and how locked in are they?",
      "Is power or cost pushing toward a smaller device, or a different architecture?",
      "What production lifetime and supply guarantees does the programme need?",
    ],
    makers: ["lattice", "amd", "microchip"],
    related: ["Design registration (DRMS)", "WSTS categories"],
  },
  {
    slug: "power-management",
    name: "Power management ICs",
    summary: "The chips that turn one supply into the voltages every other part needs, and do it efficiently.",
    alt: "Line drawing of a power chip beside an inductor and capacitors joined by traces",
    whatItIs:
      "Power management ICs convert, regulate and monitor power on a board. Switching regulators (buck, boost) change voltages efficiently with an inductor; linear regulators are simpler and quieter; PMICs combine several rails with sequencing and monitoring. Nearly every design has several, chosen by input and output voltage, current, efficiency, noise and size, and they are often designed in alongside the processor they power.",
    uses: [
      { name: "Processors and FPGAs", detail: "the core, memory and input-output rails they need, in order" },
      { name: "Automotive", detail: "converting the 12 V or 48 V battery for control units" },
      { name: "Industrial", detail: "24 V factory supplies down to logic levels" },
      { name: "Battery products", detail: "charging, fuel gauging and long standby life" },
    ],
    questions: [
      "What input voltage does the board start from, and which rails does it need?",
      "Which processor or FPGA is being powered, and does its maker recommend a PMIC?",
      "What matters most: efficiency, noise, size or cost?",
      "Does the design need automotive or functional safety qualification?",
      "Would a module save the team design time compared with discrete parts?",
    ],
    makers: ["texas-instruments", "analog-devices", "monolithic-power", "power-integrations", "onsemi"],
    related: ["WSTS categories", "Design registration (DRMS)"],
  },
];

export const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: "TAM (total addressable market)",
    definition: "All revenue in a market segment worldwide, whoever sells it. From WSTS, Gartner or the IP&E forecast.",
  },
  {
    term: "SAM (serviceable available market)",
    definition:
      "The part of TAM Avnet could serve: the regions it operates in, the product lines it carries, and the share sold through distribution.",
  },
  { term: "SOM (serviceable obtainable market)", definition: "What Avnet actually wins: its billings in the segment." },
  { term: "Market share", definition: "SOM divided by TAM for the same segment and period, joined through the code map." },
  {
    term: "Book-to-bill",
    definition: "Orders booked divided by sales billed in the same period. Above 1 means orders are arriving faster than they ship.",
  },
  { term: "Backlog", definition: "Orders taken but not yet shipped." },
  { term: "Lead time", definition: "Weeks from order to delivery for a part. Rising lead times usually mean supply is tightening." },
  {
    term: "Design registration (DRMS)",
    definition: "A record that Avnet helped a customer design a supplier's part into a product. Approved registrations protect future sales.",
  },
  { term: "DRMS status 04", definition: "Design-approved. Billings carrying this status count as design-approved revenue." },
  { term: "Line card", definition: "The list of suppliers a distributor is authorised to sell." },
  {
    term: "Franchise agreement",
    definition: "A supplier's authorisation for a distributor to sell its parts, usually with support and pricing terms.",
  },
  { term: "IP&E", definition: "Interconnect, passive and electromechanical components: connectors, capacitors, resistors, relays, switches." },
  {
    term: "WSTS categories",
    definition:
      "World Semiconductor Trade Statistics product groups: discretes, optoelectronics, sensors, and integrated circuits (analog, micro, logic, memory).",
  },
  {
    term: "PCC codes",
    definition: "Avnet's three-level product classification used in APAC and Farnell, mapped to external categories in the code map.",
  },
  {
    term: "Code map",
    definition: "The table that joins Avnet's product codes to external market categories. Every market share figure goes through it.",
  },
  { term: "Inventory days", definition: "Inventory at quarter end against one quarter of cost of sales, expressed in days." },
  { term: "Cash conversion cycle", definition: "Inventory days plus receivable days minus payable days." },
  {
    term: "Fiscal and calendar quarter",
    definition: "Companies report on their own fiscal calendars. The app lines them up on calendar quarters for comparison.",
  },
  {
    term: "Results 8-K (Item 2.02)",
    definition: "The SEC filing a company makes when it reports results; the press release is attached as Exhibit 99.1.",
  },
  {
    term: "Capacity utilization",
    definition: "Output as a share of what factories could produce. High utilization usually comes before longer lead times.",
  },
  { term: "Producer price index", definition: "The change in prices manufacturers receive for their products, from the Bureau of Labor Statistics." },
];

export const METHODS: { title: string; body: string; href?: string }[] = [
  {
    title: "Market share",
    body: "Avnet billings in a segment divided by the segment's market size for the same period. Segments are joined through the code map, so each figure carries the confidence of its mapping.",
    href: "/market-share",
  },
  {
    title: "TAM, SAM and SOM",
    body: "SAM is TAM times geographic coverage, product line coverage and channel share. SOM is Avnet billings where the technology maps to the segment. From PRD section 7.",
    href: "/tam",
  },
  {
    title: "The code map",
    body: "Avnet's technology and PCC codes are matched to WSTS, Gartner and IP&E categories, suggested from the material master and validated by product managers.",
    href: "/tools/mapping",
  },
  {
    title: "Fourth quarters from annual reports",
    body: "Companies report the fourth quarter only inside the full year, so it is the annual figure minus the first nine months. EPS derived this way is approximate.",
  },
  {
    title: "Cycle label",
    body: "Expansion or contraction is the sign of combined supply-chain revenue growth; accelerating or slowing is whether it rose from the quarter before.",
    href: "/cycle",
  },
  {
    title: "Earnings dates",
    body: "Estimated from when each company filed its results for the same quarter a year earlier, moved forward 364 days.",
  },
  {
    title: "AI summaries",
    body: "News angles and management commentary are written by Claude from the source text only. They can be wrong; each links to its source.",
  },
];
