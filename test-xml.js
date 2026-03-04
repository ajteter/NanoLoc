const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    trimValues: true,
    stopNodes: ["*.string"]
});

const xml = `
<resources>
    <string name="normal">Hello</string>
    <string name="html">Hello <b>World</b></string>
    <string name="cdata"><![CDATA[<html>test</html>]]></string>
    <string name="empty"></string>
</resources>
`;

const res = parser.parse(xml);
console.log(JSON.stringify(res, null, 2));

const strings = res.resources.string;
for (const s of strings) {
    const value = typeof s === 'string' ? s : (s["#text"] || "");
    console.log(`[${s["@_name"]}]: ${value}`);
}
