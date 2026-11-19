// Byline and article text from feeds, and the article route key. Run with: npx tsx src/lib/data/live/rss.test.ts
import assert from "node:assert/strict";
import { parseFeed } from "./rss";
import { articleSlug, forClient, type LiveArticle } from "./shared";

const long = "Chipmakers raised prices again this quarter. ".repeat(20);

const rss = `<rss><channel>
<item>
  <title>Foundry prices rise</title>
  <link>https://example.com/a</link>
  <pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate>
  <dc:creator><![CDATA[Jane Writer]]></dc:creator>
  <description>Short teaser.</description>
  <content:encoded><![CDATA[<p>${long}</p><p>The post Foundry prices rise appeared first on Example.</p>]]></content:encoded>
</item>
<item>
  <title>Teaser only</title>
  <link>https://example.com/b</link>
  <pubDate>Tue, 17 Nov 2026 11:00:00 GMT</pubDate>
  <author>editor@example.com</author>
  <description>Just a teaser.</description>
  <content:encoded><![CDATA[<p>Just a teaser.</p>]]></content:encoded>
</item>
</channel></rss>`;

const atom = `<feed><entry>
  <title>Atom story</title>
  <link rel="alternate" href="https://example.com/c"/>
  <updated>2026-11-17T12:00:00Z</updated>
  <author><name>Sam Reporter</name></author>
  <summary>Atom summary.</summary>
</entry></feed>`;

const [full, teaser] = parseFeed(rss);
assert.equal(full.author, "Jane Writer", "dc:creator is the byline");
assert.ok(full.body?.startsWith("Chipmakers raised prices"), "content:encoded becomes plain text");
assert.ok(!full.body?.includes("appeared first on"), "WordPress footer is dropped");
assert.ok(!full.body?.includes("<p>"), "markup is removed");
assert.equal(teaser.author, undefined, "an email address is not a byline");
assert.equal(teaser.body, undefined, "a teaser repeated as content is not article text");

const desk = parseFeed(rss.replace("Jane Writer", "News Desk"))[0];
assert.equal(desk.author, undefined, "a desk byline is not a person");

const [entry] = parseFeed(atom);
assert.equal(entry.author, "Sam Reporter", "Atom author name is the byline");
assert.equal(entry.body, undefined);

const slug = articleSlug({ url: "https://example.com/a" });
assert.match(slug, /^[0-9a-z]{14}$/, "slug is 14 base-36 characters");
assert.equal(slug, articleSlug({ url: "https://example.com/a" }), "slug is stable");
assert.notEqual(slug, articleSlug({ url: "https://example.com/b" }), "different URLs differ");

const article = { id: "x", kind: "news", title: "t", summary: "s", outlet: "o", url: "u", publishedAt: "", body: "secret" } as unknown as LiveArticle;
assert.equal("body" in forClient([article])[0], false, "feed text is removed for the browser");

console.log("rss: ok");
