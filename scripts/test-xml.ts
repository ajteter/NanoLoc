import { AndroidXmlParser } from "@/lib/parsers/android-xml";
import fs from "fs";
import path from "path";

const parser = new AndroidXmlParser();

const xmlPath = path.join(process.cwd(), "strings.xml");
if (fs.existsSync(xmlPath)) {
    console.log("Reading strings.xml...");
    const content = fs.readFileSync(xmlPath, "utf-8");
    const result = parser.parse(content);
    console.log("Parsed result:", result);
} else {
    console.error("strings.xml not found at", xmlPath);
}

// Test with complex content
const complexXml = `
<resources>
    <string name="simple">Hello</string>
    <string name="with_format">Hello %1$s</string>
    <string name="with_html"><b>Hello</b> World</string>
</resources>
`;
console.log("Testing complex XML...");
console.log(parser.parse(complexXml));
