// The customer facet in tagArticle. Run with: npx tsx src/lib/data/live/tagging.test.ts
import assert from "node:assert/strict";
import { CUSTOMERS, tagArticle } from "./tagging";

const customers = (text: string) => tagArticle(text).customers;

// Names the facet should find, in the forms news writes them.
assert.deepEqual(customers("Apple orders more modems from Qualcomm"), ["Apple"]);
assert.deepEqual(customers("Jabil and Flex Ltd. expand Mexico capacity"), ["Jabil", "Flex"]);
assert.deepEqual(customers("Hewlett Packard Enterprise beats on AI servers"), ["HPE"]);
assert.deepEqual(customers("HP Inc cuts PC forecast"), ["HP Inc"]);
assert.deepEqual(customers("GM and Ford delay EV programs"), ["General Motors", "Ford"]);
assert.deepEqual(customers("AWS designs its own Trainium chips"), ["Amazon"]);
assert.deepEqual(customers("Raytheon wins radar contract"), ["RTX"]);
assert.deepEqual(customers("Foxconn (Hon Hai) builds servers in Texas"), ["Foxconn"]);

// Common words and look-alikes that are not the customer.
assert.deepEqual(customers("Flex circuits and flexible PCBs gain share"), [], "flex as a word");
assert.deepEqual(customers("Nvidia RTX 5090 supply tightens"), [], "RTX GPUs are not RTX the company");
assert.deepEqual(customers("Meta materials for 6G antennas"), [], "metamaterials");
assert.deepEqual(customers("Chiplets: Meta-Scale chiplet velocity"), [], "Meta- as a prefix");
assert.deepEqual(customers("Meta signs a power deal for its data centers"), ["Meta"]);
assert.deepEqual(customers("apple-sized sensor modules"), [], "apple as a word");
assert.deepEqual(customers("Rockwell Collins avionics"), [], "Collins is part of RTX, not Rockwell Automation");
assert.deepEqual(customers("Rockwell Automation raises guidance"), ["Rockwell Automation"]);

// Suppliers stay suppliers; a customer tag doesn't take them over.
const both = tagArticle("Texas Instruments ships power ICs to Tesla");
assert.deepEqual(both.suppliers, ["Texas Instruments"]);
assert.deepEqual(both.customers, ["Tesla"]);

// Every customer has a unique name and both kinds are represented.
assert.equal(new Set(CUSTOMERS.map((c) => c.name)).size, CUSTOMERS.length, "customer names are unique");
assert.ok(CUSTOMERS.some((c) => c.kind === "ems") && CUSTOMERS.some((c) => c.kind === "oem"));

console.log("tagging: ok");
