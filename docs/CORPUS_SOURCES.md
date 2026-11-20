# TravelMind Tourism and Hospitality RAG Corpus

TravelMind indexes only the approved paths listed in `src/mastra/workspace.ts`, then applies a matching retrieval allowlist in `src/mastra/rag.ts`. The corpus is intentionally limited to tourism and hospitality evidence plus cross-cutting SDLC and security guidance. It does not include finance, banking, lending, investment, healthcare, aerospace, generic prompt libraries, or unrelated sector corpora.

## Tourism and hospitality evidence

- `docs/ingested/tourism/un-tourism-sustainable-development.txt` — Publisher: UN Tourism. Source: https://www.untourism.int/sustainable-development. Used for sustainable-tourism principles, stakeholder participation, visitor experience, impact monitoring, and environmental, economic, and socio-cultural considerations.
- `docs/ingested/tourism/wttc-hotel-sustainability-basics.txt` — Publisher: World Travel & Tourism Council. Source: https://wttc.org/initiatives/hotel-sustainability-basics. Used for hotel-focused sustainability indicators, resource efficiency, accessibility, staff training, community benefit, and local culture.
- `docs/ingested/tourism/gstc-hotel-standard.txt` — Publisher: Global Sustainable Tourism Council. Source: https://www.gstc.org/gstc-criteria/gstc-hotel-standard/. Used for accommodation sustainability themes and as a prompt for discovery. The standard describes criteria, not proof that a property complies or is certified; commercial use and current scope must be checked with GSTC.
- `docs/ingested/tourism/lodging-safety.txt` — Publisher: U.S. Department of State, Travel.State.gov. Source: https://travel.state.gov/en/international-travel/planning/guidance/lodging-safety.html. Used to surface lodging safety, emergency-exit, and accessibility questions for review. It is not treated as legal guidance for every country or property.

## SDLC selection evidence

- `docs/ingested/product/sdlc-selection-criteria.txt` — Publisher: TravelMind project synthesis. This internal rubric defines a consistent comparison of Waterfall, V-Model, Prototype, RAD, Spiral, and Agile; common decision factors; fit-score and override rules; controls; and the contents of a reviewable selection record. It is not presented as a standard issued by an external authority.
- `docs/ingested/product/tourism-sdlc-decision-guide.txt` — Publisher: TravelMind project synthesis. It translates the selection rubric to tourism contexts such as guest and staff workflows, hotel or partner integrations, seasonal launch constraints, stakeholder feedback, and service continuity. It also uses the NIST SSDF principle that security practices should be integrated into each SDLC implementation. Sources are named in the file itself.

## Cybersecurity and AI application security

- `docs/ingested/security/nist-csf-2.0.txt` — Publisher: National Institute of Standards and Technology. Source: https://doi.org/10.6028/NIST.CSWP.29. Used for cybersecurity risk-management outcomes and vocabulary. The CSF does not prescribe a single way to achieve outcomes and does not establish compliance on its own.
- `docs/ingested/security/nist-ssdf-sp800-218.txt` — Publisher: National Institute of Standards and Technology. Source: https://csrc.nist.gov/pubs/sp/800/218/final. Summarizes final SP 800-218 SSDF version 1.1 (2022), especially the guidance to integrate secure software development practices into each SDLC implementation. The local file notes that later revisions or drafts should be checked at the NIST source page.
- `docs/ingested/security/owasp-llm-top-10-2025.txt` — Publisher: OWASP GenAI Security Project. Source: https://genai.owasp.org/llm-top-10/. Used to identify security risks specific to LLM applications and retrieval-augmented generation. The local snapshot is the OWASP Top 10 for LLM Applications 2025; check the project source for newer versions.

## Domain boundary and interpretation

The assistant analyzes software for hotels, resorts, accommodation, guest services, tours, activities, restaurants, events, destination services, tourism partners, safety, accessibility, privacy, and sustainability. Requests outside this configured domain should be identified as out of scope rather than answered using another sector's corpus.

Publisher material is evidence for discovery, not automatic proof of legal applicability or certification. Jurisdiction, entity scope, current versions, licensing, amendments, and safety interpretation require authorized human review. Unsupported regulatory, safety, accessibility, certification, and numeric claims must be marked `NEEDS-VALIDATION`.
