import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data/runbooks');

export interface RunbookExcerpt {
  runbookId: string;
  sourcePath: string;
  sectionHeading: string;
  content: string;
  relevanceScore: number;
}

export class RunbookRetriever {
  private runbooksDir: string;

  constructor(customDir?: string) {
    this.runbooksDir = customDir || DATA_DIR;
  }

  public retrieve(query: string, serviceName = 'order-processing-service'): RunbookExcerpt[] {
    const results: RunbookExcerpt[] = [];
    if (!fs.existsSync(this.runbooksDir)) return results;

    const files = fs.readdirSync(this.runbooksDir).filter((f) => f.endsWith('.md'));
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    for (const file of files) {
      const fullPath = path.join(this.runbooksDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const runbookId = file.replace('.md', '');

      // Parse into markdown sections
      const sections = raw.split(/^##\s+/m);

      for (const section of sections) {
        if (!section.trim()) continue;
        const lines = section.split('\n');
        const heading = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();

        let score = 0;
        const lowerBody = body.toLowerCase();
        const lowerHeading = heading.toLowerCase();

        // Service relevance bonus
        if (file.includes('order') && serviceName.includes('order')) score += 5;
        if (file.includes('worker') && (serviceName.includes('worker') || query.includes('worker'))) score += 5;

        // Keyword matches
        for (const term of terms) {
          if (lowerHeading.includes(term)) score += 3;
          if (lowerBody.includes(term)) score += 1;
        }

        if (score > 0) {
          results.push({
            runbookId,
            sourcePath: fullPath,
            sectionHeading: `## ${heading}`,
            content: body,
            relevanceScore: score
          });
        }
      }
    }

    // Sort by highest relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, 3);
  }
}

export const runbookRetriever = new RunbookRetriever();
