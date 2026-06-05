# jzstafura.com

Personal site of Joseph Z. Stafura, PhD — cognitive psychologist and researcher based in Pittsburgh, PA. PhD from the University of Pittsburgh (Charles Perfetti's Language and Literacy lab), where the work was on how the brain builds meaning from text: EEG/ERP, reading comprehension, word-to-text integration. Co-founder of Affective Health, a digital assessment platform that grew to 16,000+ users. Currently Senior Grants Manager at the Learning Research and Development Center at Pitt, managing a $50M+ portfolio across NIH, NSF, IES, DOD, and private foundations.

**Live site:** [jzstafura.com](https://jzstafura.com)

## Tech Stack

- **Astro 6** — static site generator, file-based routing, zero JS by default
- **React 19** — used only for interactive island components (`client:load` / `client:visible`); all other pages are static HTML
- **TypeScript** — strict mode; React components use `.jsx` (not `.tsx`)
- No CSS framework — global variables in `src/styles/global.css`, scoped styles per page

## Site Sections

| Route | Content |
|---|---|
| `/writing/` | Essays on cognition, AI, organizations, and philosophy. Some full pages with interactive figures, some external links to Substack and LinkedIn. |
| `/lab/` | Independent research projects: Intellectual Network Map, AI Hallucination Detection, NOFO Processor, Violence Research Dashboard |
| `/educational/` | Interactive scientific visualizations: Bloch sphere, CRISPR-Cas9, EEG P300, ERP language, psychophysics, Schneider-Shiffrin, EEG forward problem |
| `/arrival/` | Full essay with interactive network diagrams — a proposed Latourian mode of existence for charity |
| `/consulting/` | Organizational diagnostics and applied measurement |
| `/fun/` | Side projects: Banana Santana name generator, SoulWrap™ wellness parody, Valinor Capital VC parody |
| `/about/` | Bio, education, and experience |
