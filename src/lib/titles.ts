// Page titles shared by the pages (document.title) and the static HTML written at build time.
const BRAND = 'Power BI Exercises';
const TITLE_MAX = 60;

/** Adds " | Power BI Exercises" only when the title still fits in ~60 characters. */
export function withBrand(t: string): string {
  const full = `${t} | ${BRAND}`;
  return full.length <= TITLE_MAX ? full : t;
}

export const exerciseTitle = (title: string) => withBrand(`${title}: Power BI Exercise`);
export const daxTitle = (name: string) => withBrand(`DAX ${name} Function: Syntax and Example`);
export const projectTitle = (title: string) => withBrand(`${title}: Power BI Project`);
export const testTitle = (title: string) => withBrand(`${title}: PL-300 Practice Test`);
