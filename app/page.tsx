import { readFile } from 'node:fs/promises';
import path from 'node:path';

function extractTagContent(source: string, tagName: string): string {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = source.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function stripExternalScripts(source: string): string {
  return source.replace(/<script[\s\S]*?<\/script>/gi, '');
}

export default async function HomePage() {
  const htmlPath = path.join(process.cwd(), 'index.html');
  let rawHtml = '';
  try {
    rawHtml = await readFile(htmlPath, 'utf-8');
  } catch {
    return (
      <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A] mb-4">
            Lumni
          </p>
          <h1 className="font-serif text-4xl font-normal tracking-tight text-[#0F0E0C]">
            Landing page unavailable.
          </h1>
          <p className="mt-3 text-sm text-[#8C8880]">
            Please restore <code>index.html</code> at the project root.
          </p>
        </div>
      </main>
    );
  }

  const styleContent = extractTagContent(rawHtml, 'style');
  const bodyContent = stripExternalScripts(extractTagContent(rawHtml, 'body'));

  return (
    <>
      {styleContent ? <style dangerouslySetInnerHTML={{ __html: styleContent }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  );
}
